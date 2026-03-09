import { tool } from "ai";
import { z } from "zod";
import { queryLanceDB } from "@/lib/lancedb/client";
import { computeWeightedScore } from "@/lib/scoring/metrics";
import { computeConvergence } from "@/lib/scoring/convergence";
import { discoverSkillsTool, loadSkillTool } from "./skills";

// Re-export skill tools
export { discoverSkillsTool, loadSkillTool };

export const planAnalysisTool = tool({
  description:
    "Create and display an analysis plan for the user. Show what steps will be taken to answer their query.",
  inputSchema: z.object({
    query: z.string().describe("The user's original query"),
    perturbation_type: z
      .enum(["chemical", "genetic_crispr", "genetic_rnai", "combinatorial", "unknown"])
      .describe("Detected perturbation type"),
    steps: z
      .array(
        z.object({
          id: z.number(),
          description: z.string(),
          details: z.string().optional(),
        })
      )
      .describe("Planned analysis steps"),
  }),
  execute: async ({ query, perturbation_type, steps }) => {
    try {
      return {
        query,
        perturbation_type,
        steps: steps.map((s) => ({ ...s, status: "pending" as const })),
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      return { error: "Failed to create analysis plan", details: String(err) };
    }
  },
});

export const queryDatabaseTool = tool({
  description:
    "Search the curated LanceDB database backed by real S3 data. Supports full-text search on publications and filtered queries on datasets, genes, gene_expression, and image_features tables.",
  inputSchema: z.object({
    table: z
      .enum(["publications", "datasets", "genes", "gene_expression", "image_features"])
      .describe("Which table to query"),
    operation: z
      .enum(["fts", "filter"])
      .describe("fts = full-text search, filter = metadata filtering"),
    query: z.string().optional().describe("Search query text (for FTS)"),
    filters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Key-value filters for the query"),
    limit: z.number().optional().default(10).describe("Max results to return"),
  }),
  execute: async ({ table, operation, query, filters, limit }) => {
    const startTime = Date.now();
    console.log(`[Tool:queryDatabase] table="${table}" op=${operation} started`);

    try {
      const result = await queryLanceDB({
        table,
        operation,
        query,
        filters: filters as Record<string, unknown> | undefined,
        limit,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.error) {
        console.error(`[Tool:queryDatabase] table="${table}" → error in ${elapsed}s: ${result.error}`);
        return { success: false, ...result };
      }

      console.log(`[Tool:queryDatabase] table="${table}" → ${result.total} rows in ${elapsed}s`);
      return { success: true, ...result };
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[Tool:queryDatabase] table="${table}" → exception in ${elapsed}s: ${err}`);
      return { success: false, error: `Database query failed on table "${table}"`, details: String(err), results: [], total: 0 };
    }
  },
});

const qualityScoreSchema = z.object({
  experimental_design: z.number().min(1).max(5),
  data_quality: z.number().min(1).max(5),
  perturbation_characterization: z.number().min(1).max(5),
  reproducibility: z.number().min(1).max(5),
  biological_relevance: z.number().min(1).max(5),
  analytical_methods: z.number().min(1).max(5),
});

export const assessPaperTool = tool({
  description:
    "Assess a paper's quality as a specific assessor persona. Each assessor focuses on different aspects. Call this 3 times per paper with different assessors for multi-agent assessment.",
  inputSchema: z.object({
    assessor: z
      .enum(["alpha", "beta", "gamma"])
      .describe(
        "alpha=statistical rigor, beta=biological relevance, gamma=data quality"
      ),
    paper_id: z.string().describe("Paper PMID or DOI"),
    paper_title: z.string().describe("Paper title"),
    scores: qualityScoreSchema.describe("Quality scores (1-5) for each dimension"),
    red_flags: z
      .array(z.string())
      .describe("List of identified red flags"),
    confounders: z
      .array(z.string())
      .describe("List of potential confounders"),
    recommendation: z
      .enum(["include", "caution", "exclude"])
      .describe("Overall recommendation"),
    justification: z
      .string()
      .describe("2-3 sentence justification for the assessment"),
  }),
  execute: async ({
    assessor,
    paper_id,
    paper_title,
    scores,
    red_flags,
    confounders,
    recommendation,
    justification,
  }) => {
    try {
      const overall = computeWeightedScore(scores);
      return {
        paper_id,
        paper_title,
        assessor,
        scores: { ...scores, overall },
        red_flags,
        confounders,
        recommendation,
        justification,
        assessed_at: new Date().toISOString(),
      };
    } catch (err) {
      return { error: `Assessment failed for paper "${paper_id}"`, details: String(err) };
    }
  },
});

export const convergenceCheckTool = tool({
  description:
    "Compare assessments from multiple assessors for a paper. Computes inter-assessor agreement and consensus level.",
  inputSchema: z.object({
    paper_id: z.string(),
    paper_title: z.string(),
    assessments: z.array(
      z.object({
        assessor: z.enum(["alpha", "beta", "gamma"]),
        scores: qualityScoreSchema.extend({
          overall: z.number(),
        }),
        red_flags: z.array(z.string()),
        recommendation: z.enum(["include", "caution", "exclude"]),
        justification: z.string(),
      })
    ),
  }),
  execute: async ({ paper_id, paper_title, assessments }) => {
    try {
      const convergence = computeConvergence(assessments);

      // Aggregate red flags
      const allRedFlags = [
        ...new Set(assessments.flatMap((a) => a.red_flags)),
      ];

      // Consensus recommendation
      const recs = assessments.map((a) => a.recommendation);
      const recCounts = { include: 0, caution: 0, exclude: 0 };
      recs.forEach((r) => recCounts[r]++);
      const consensusRec = (
        Object.entries(recCounts) as [string, number][]
      ).sort((a, b) => b[1] - a[1])[0][0];

      return {
        paper_id,
        paper_title,
        assessments,
        consensus: {
          ...convergence,
          red_flags: allRedFlags,
          recommendation: consensusRec,
        },
      };
    } catch (err) {
      return { error: `Convergence check failed for paper "${paper_id}"`, details: String(err) };
    }
  },
});

export const preprocessDatasetTool = tool({
  description:
    "Preprocess a dataset for analysis. Loads data, performs QC, normalization, and prepares for downstream analysis.",
  inputSchema: z.object({
    dataset_uid: z.string().describe("Dataset unique identifier"),
    dataset_description: z.string().describe("Dataset description"),
    steps: z
      .array(z.string())
      .optional()
      .describe("Preprocessing steps to apply"),
  }),
  execute: async ({ dataset_uid, dataset_description, steps }) => {
    try {
      const defaultSteps = [
        "Quality control (filter cells/genes)",
        "Normalization (scran/SCTransform)",
        "Log transformation",
        "Highly variable gene selection",
        "PCA dimensionality reduction",
      ];
      return {
        dataset_uid,
        description: dataset_description,
        steps_applied: steps || defaultSteps,
        status: "complete",
        note: "Preprocessing metadata — real pipeline would use scanpy/scvi-tools",
      };
    } catch (err) {
      return { error: `Preprocessing failed for dataset "${dataset_uid}"`, details: String(err) };
    }
  },
});

export const analyzeGeneExpressionTool = tool({
  description:
    "Query the gene_expression table for cells matching a perturbation. Returns real cell-level data from the S3-backed LanceDB. Requires at least one filter. Results capped at 100 rows. IMPORTANT: Search for ONE gene at a time (e.g. 'KLF1', not 'KLF1+MAP2K6'). For combinatorial perturbations, call this tool once per gene and cross-reference by dataset_uid. Always include dataset_uid when known.",
  inputSchema: z.object({
    perturbation: z.string().describe("Single perturbation to search for (e.g. 'vorinostat', 'TP53'). Do NOT combine multiple genes — search one at a time."),
    filters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional filters: dataset_uid, assay, is_control, genetic_perturbation_method, etc. Always include dataset_uid when known."),
    limit: z.number().optional().default(50).describe("Max cells to return (capped at 100)"),
  }),
  execute: async ({ perturbation, filters, limit }) => {
    const startTime = Date.now();
    console.log(`[Tool:analyzeGeneExpression] perturbation="${perturbation}" started`);

    try {
      // Split combined perturbations (KLF1+MAP2K6, TP53_BRCA1) into first gene only
      const singlePerturbation = perturbation.split(/[+|_,;]/).map(s => s.trim()).filter(Boolean)[0] || perturbation;
      if (singlePerturbation !== perturbation) {
        console.log(`[Tool:analyzeGeneExpression] Split "${perturbation}" → using "${singlePerturbation}"`);
      }

      const queryFilters: Record<string, unknown> = {
        ...filters,
        perturbation_search_string: singlePerturbation,
      };

      const result = await queryLanceDB({
        table: "gene_expression",
        operation: "filter",
        filters: queryFilters,
        limit: Math.min(limit, 100),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.error) {
        console.error(`[Tool:analyzeGeneExpression] perturbation="${singlePerturbation}" → error in ${elapsed}s: ${result.error}`);
        return {
          success: false,
          perturbation: singlePerturbation,
          original_query: perturbation !== singlePerturbation ? perturbation : undefined,
          filters: queryFilters,
          error: result.error,
          results: [],
          total: 0,
        };
      }

      console.log(`[Tool:analyzeGeneExpression] perturbation="${singlePerturbation}" → ${result.total} rows in ${elapsed}s`);
      return {
        success: true,
        perturbation: singlePerturbation,
        original_query: perturbation !== singlePerturbation ? perturbation : undefined,
        filters: queryFilters,
        ...result,
      };
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[Tool:analyzeGeneExpression] perturbation="${perturbation}" → exception in ${elapsed}s: ${err}`);
      return { success: false, error: `Gene expression query failed for "${perturbation}"`, details: String(err), results: [], total: 0 };
    }
  },
});

export const routeOutputTool = tool({
  description:
    "Present output options to the user after preprocessing completes. Shows download, API endpoint, and continue-analysis modes in a single interactive UI.",
  inputSchema: z.object({
    dataset_name: z.string().describe("Human-readable dataset name"),
    dataset_uid: z.string().describe("Dataset unique identifier"),
    summary: z.object({
      cells: z.number().describe("Number of cells"),
      genes: z.number().describe("Number of genes"),
      perturbations: z.array(z.string()).describe("List of perturbation names"),
      steps: z.array(z.string()).describe("Preprocessing steps applied"),
    }),
    download: z.object({
      data_path: z.string().describe("Path to processed data file"),
      data_format: z.string().describe("File format (e.g. h5ad, csv)"),
      data_size_mb: z.number().describe("File size in MB"),
      skill_path: z.string().describe("Path to generated SKILL.md file"),
    }),
    api_endpoint: z.object({
      function_name: z.string().describe("API function name"),
      description: z.string().describe("What the endpoint does"),
      arguments: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          default: z.string().optional(),
          description: z.string(),
        })
      ),
      example_response: z.string().describe("Example JSON response"),
    }),
    analyses: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        requirements_met: z.boolean(),
        requirements_note: z.string().optional(),
        prompt: z.string().describe("Chat prompt to trigger this analysis"),
      })
    ),
  }),
  execute: async (input) => {
    return {
      ...input,
      status: "ready" as const,
      presented_at: new Date().toISOString(),
    };
  },
});

// All tools combined
export const allTools = {
  discoverSkills: discoverSkillsTool,
  loadSkill: loadSkillTool,
  planAnalysis: planAnalysisTool,
  queryDatabase: queryDatabaseTool,
  assessPaper: assessPaperTool,
  convergenceCheck: convergenceCheckTool,
  preprocessDataset: preprocessDatasetTool,
  analyzeGeneExpression: analyzeGeneExpressionTool,
  routeOutput: routeOutputTool,
};
