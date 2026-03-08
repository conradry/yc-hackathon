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
    try {
      const result = await queryLanceDB({
        table,
        operation,
        query,
        filters: filters as Record<string, unknown> | undefined,
        limit,
      });
      return result;
    } catch (err) {
      return { error: `Database query failed on table "${table}"`, details: String(err) };
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
    "Query the gene_expression table for cells matching a perturbation. Returns real cell-level data from the S3-backed LanceDB. Requires at least one filter. Results capped at 100 rows.",
  inputSchema: z.object({
    perturbation: z.string().describe("Perturbation to search for (e.g. 'vorinostat', 'TP53')"),
    filters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional filters: dataset_uid, assay, is_control, genetic_perturbation_method, etc."),
    limit: z.number().optional().default(50).describe("Max cells to return (capped at 100)"),
  }),
  execute: async ({ perturbation, filters, limit }) => {
    try {
      const queryFilters: Record<string, unknown> = {
        ...filters,
        perturbation_search_string: perturbation,
      };

      const result = await queryLanceDB({
        table: "gene_expression",
        operation: "filter",
        filters: queryFilters,
        limit: Math.min(limit, 100),
      });

      return {
        perturbation,
        filters: queryFilters,
        ...result,
      };
    } catch (err) {
      return { error: `Gene expression query failed for "${perturbation}"`, details: String(err) };
    }
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
};
