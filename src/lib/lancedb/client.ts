import * as lancedb from "@lancedb/lancedb";

type QueryParams = {
  table: string;
  operation: string;
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
};

// Binary/vector columns to strip from results
const BINARY_COLUMNS = new Set([
  "gene_indices",
  "counts",
  "measured_feature_indices",
  "feature_values",
  "vector",
]);

// Singleton connection + table cache
let dbConnection: lancedb.Connection | null = null;
const tableCache = new Map<string, lancedb.Table>();

async function getConnection(): Promise<lancedb.Connection> {
  if (dbConnection) return dbConnection;

  const uri = process.env.LANCEDB_URI;
  if (!uri) {
    throw new Error("LANCEDB_URI environment variable is not set");
  }

  const storageOptions: Record<string, string> = {};
  if (uri.startsWith("s3://")) {
    const region = process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || "us-east-2";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (accessKeyId) storageOptions.access_key_id = accessKeyId;
    if (secretAccessKey) storageOptions.secret_access_key = secretAccessKey;
    storageOptions.region = region;
  }

  dbConnection = await lancedb.connect(uri, { storageOptions });
  return dbConnection;
}

async function getTable(name: string): Promise<lancedb.Table> {
  const cached = tableCache.get(name);
  if (cached) return cached;

  const db = await getConnection();
  const table = await db.openTable(name);
  tableCache.set(name, table);
  return table;
}

function buildWhereClause(filters: Record<string, unknown>): string {
  const clauses: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      // Escape single quotes in string values
      const escaped = value.replace(/'/g, "''");
      clauses.push(`${key} = '${escaped}'`);
    } else if (typeof value === "number") {
      clauses.push(`${key} = ${value}`);
    } else if (typeof value === "boolean") {
      clauses.push(`${key} = ${value}`);
    }
  }
  return clauses.join(" AND ");
}

function cleanRow(row: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (BINARY_COLUMNS.has(key)) continue;
    // Convert Date objects and BigInts to strings
    if (value instanceof Date) {
      cleaned[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      cleaned[key] = Number(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function queryLanceDB(params: QueryParams) {
  const { table: tableName, operation, query, filters, limit = 10 } = params;

  // gene_expression: require at least one filter, cap at 100
  if (tableName === "gene_expression") {
    if (operation !== "filter" || !filters || Object.keys(filters).length === 0) {
      return {
        results: [],
        total: 0,
        error: "gene_expression table requires at least one filter (e.g. perturbation_search_string, dataset_uid, assay). Full table scans are not allowed on 5.3M rows.",
      };
    }
  }

  try {
    const table = await getTable(tableName);
    const effectiveLimit = tableName === "gene_expression" ? Math.min(limit, 100) : limit;

    let rows: Record<string, unknown>[];

    if (operation === "fts" && query) {
      try {
        // Try native FTS first
        rows = await table.search(query).limit(effectiveLimit).toArray();
      } catch {
        // Fall back to SQL LIKE
        const likeQuery = `%${query.replace(/'/g, "''")}%`;
        let q = table.query();

        // Determine which text columns to search based on table
        const textColumns: Record<string, string[]> = {
          publications: ["title", "section_text"],
          datasets: ["dataset_description"],
          genes: ["gene_name", "ensembl_id"],
          image_features: [],
        };

        const cols = textColumns[tableName] || [];
        if (cols.length > 0) {
          const likeClause = cols.map((c) => `${c} LIKE '${likeQuery}'`).join(" OR ");
          q = q.where(likeClause);
        }

        if (filters) {
          const whereClause = buildWhereClause(filters);
          if (whereClause) q = q.where(whereClause);
        }

        rows = await q.limit(effectiveLimit).toArray();
      }
    } else if (operation === "filter" && filters) {
      const whereClause = buildWhereClause(filters);
      if (!whereClause) {
        return { results: [], total: 0, error: "No valid filters provided" };
      }
      rows = await table.query().where(whereClause).limit(effectiveLimit).toArray();
    } else {
      // Simple scan (for small tables like genes)
      rows = await table.query().limit(effectiveLimit).toArray();
    }

    const results = rows.map(cleanRow);
    return { results, total: results.length };
  } catch (err) {
    return {
      results: [],
      total: 0,
      error: `LanceDB query failed on table "${tableName}": ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
