import { tool } from "ai";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

export interface SkillEntry {
  name: string;
  description: string;
  tags: string[];
  path: string;
}

// Walk up from cwd to find the repo root (directory containing .claude/skills/)
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, ".claude", "skills");
    try {
      // Synchronous check not available, but we set this once at module load
      // Use a heuristic: check common locations
      return dir;
    } catch {
      // continue
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// Resolve repo root by walking up until .claude/skills/ exists
let _repoRoot: string | null = null;
async function getRepoRoot(): Promise<string> {
  if (_repoRoot) return _repoRoot;
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    try {
      await fs.access(path.join(dir, ".claude", "skills"));
      _repoRoot = dir;
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  // Fallback: try the known absolute path
  _repoRoot = "/Users/kamilseghrouchni/Desktop/side-projects/yc-hackathon";
  return _repoRoot;
}

const SKILL_REGISTRY: SkillEntry[] = [
  // Pipeline workflows
  {
    name: "query-understanding-workflow",
    description: "Parses natural language perturbation biology questions into structured query objects. Use when a user asks about gene knockouts, drug effects, CRISPR screens, perturbation experiments, or says 'analyze this perturbation question' or 'search for perturb-seq data'. This is the pipeline entry point.",
    tags: ["entry-point", "parsing", "query"],
    path: ".claude/skills/query-understanding-workflow/SKILL.md",
  },
  {
    name: "paper-search-workflow",
    description: "Searches for perturbation biology papers and datasets across Semantic Scholar, EuropePMC, and LanceDB. Use when a user asks to 'find papers', 'search for datasets', 'look up perturb-seq studies', or needs to retrieve publications about CRISPR screens, drug perturbations, or single-cell perturbation experiments.",
    tags: ["search", "papers", "literature"],
    path: ".claude/skills/paper-search-workflow/SKILL.md",
  },
  {
    name: "concurrent-assessment-workflow",
    description: "Spawns parallel assessment agents to independently evaluate perturbation biology papers using the quality rubric, then computes consensus rankings with divergence analysis. Use when a user says 'assess these papers', 'rank these candidates', 'evaluate paper quality', or after paper-search-workflow returns candidates.",
    tags: ["assessment", "multi-agent", "quality"],
    path: ".claude/skills/concurrent-assessment-workflow/SKILL.md",
  },
  {
    name: "quality-rubric",
    description: "Standardized 6-dimension scoring rubric (experimental design, data quality, perturbation characterization, reproducibility, biological relevance, analytical methods) for evaluating perturbation biology papers. Use when assessing paper quality, scoring datasets, or when an assessment agent needs evaluation criteria.",
    tags: ["scoring", "quality", "rubric"],
    path: ".claude/skills/quality-rubric/SKILL.md",
  },
  {
    name: "output-routing-workflow",
    description: "Routes pipeline output to the appropriate destination — save processed dataset with auto-generated skill, export as API JSON, or continue with follow-up analysis. Use as the final pipeline step after preprocessing and validation, or when a user says 'save results', 'export dataset', or 'what should I do next with this data'.",
    tags: ["output", "routing", "results"],
    path: ".claude/skills/output-routing-workflow/SKILL.md",
  },
  {
    name: "perturbation-type-router",
    description: "Routes perturbation datasets to the correct analysis branch (chemical, CRISPR, RNAi, or combinatorial) with route-specific preprocessing parameters. Use after paper assessment to determine analysis pathway, or when a user asks 'how should I analyze this perturbation data' or 'what preprocessing parameters for a CRISPR/drug screen'.",
    tags: ["perturbation", "routing", "analysis"],
    path: ".claude/skills/perturbation-type-router/SKILL.md",
  },
  {
    name: "dataset-preprocessing-workflow",
    description: "End-to-end preprocessing pipeline for perturbation biology single-cell datasets (QC, normalize, HVG, PCA, UMAP, cluster, DE). Use when a user says 'preprocess this dataset', 'run the analysis pipeline', 'process this h5ad file', or after perturbation-type-router provides preprocessing parameters.",
    tags: ["preprocessing", "dataset", "pipeline"],
    path: ".claude/skills/dataset-preprocessing-workflow/SKILL.md",
  },
  {
    name: "demo-pipeline-runner",
    description: "End-to-end smoke test of the perturbation biology pipeline using real LanceDB data. Use when a user says 'run the demo', 'test the pipeline', 'smoke test', or wants to verify the full workflow (query → search → assess → results) works correctly.",
    tags: ["demo", "pipeline", "runner"],
    path: ".claude/skills/demo-pipeline-runner/SKILL.md",
  },
  // Orchestration
  {
    name: "agent-spawning-protocol",
    description: "Defines how to spawn, manage, and collect results from subagents in the perturbation biology pipeline. Use when orchestrating parallel agent execution, spawning assessment agents, or when a workflow requires multi-agent coordination with structured context envelopes and result collection.",
    tags: ["orchestration", "agent", "spawning"],
    path: ".claude/skills/agent-spawning-protocol/SKILL.md",
  },
  {
    name: "result-schema-validator",
    description: "Validates processed AnnData objects have all required fields, layers, embeddings, and DE results for downstream analysis. Use when a user says 'validate this h5ad', 'check if preprocessing is complete', or automatically after dataset-preprocessing-workflow finishes.",
    tags: ["validation", "schema", "results"],
    path: ".claude/skills/result-schema-validator/SKILL.md",
  },
  {
    name: "downstream-agent-skills-generator",
    description: "Auto-generates a SKILL.md file for a processed dataset so future Claude Code sessions can discover and analyze it. Use after preprocessing succeeds and validation passes, or when a user says 'create a skill for this dataset', 'make this dataset available in future sessions', or 'register this processed data'.",
    tags: ["orchestration", "skills", "generator"],
    path: ".claude/skills/downstream-agent-skills-generator/SKILL.md",
  },
  // Analysis
  {
    name: "scanpy",
    description: "Standard single-cell RNA-seq analysis pipeline. Use for QC, normalization, dimensionality reduction (PCA/UMAP/t-SNE), clustering, differential expression, and visualization. Best for exploratory scRNA-seq analysis with established workflows. For deep learning models use scvi-tools; for data format questions use anndata.",
    tags: ["analysis", "scanpy", "single-cell"],
    path: ".claude/skills/scanpy/SKILL.md",
  },
  {
    name: "pydeseq2",
    description: "Differential gene expression analysis (Python DESeq2). Identify DE genes from bulk RNA-seq counts, Wald tests, FDR correction, volcano/MA plots, for RNA-seq analysis.",
    tags: ["analysis", "deseq2", "differential-expression", "bulk"],
    path: ".claude/skills/pydeseq2/SKILL.md",
  },
  {
    name: "single-cell-rna-qc",
    description: "Performs quality control on single-cell RNA-seq data (.h5ad or .h5 files) using scverse best practices with MAD-based filtering and comprehensive visualizations. Use when users request QC analysis, filtering low-quality cells, assessing data quality, or following scverse/scanpy best practices for single-cell analysis.",
    tags: ["analysis", "qc", "single-cell", "scverse"],
    path: ".claude/skills/single-cell-rna-qc/SKILL.md",
  },
  {
    name: "scvi-tools",
    description: "Deep generative models for single-cell omics. Use when you need probabilistic batch correction (scVI), transfer learning, differential expression with uncertainty, or multi-modal integration (TOTALVI, MultiVI). Best for advanced modeling, batch effects, multimodal data. For standard analysis pipelines use scanpy.",
    tags: ["analysis", "scvi", "deep-learning", "single-cell"],
    path: ".claude/skills/scvi-tools/SKILL.md",
  },
  {
    name: "scvelo",
    description: "RNA velocity analysis with scVelo. Estimate cell state transitions from unspliced/spliced mRNA dynamics, infer trajectory directions, compute latent time, and identify driver genes in single-cell RNA-seq data. Complements Scanpy/scVI-tools for trajectory inference.",
    tags: ["analysis", "velocity", "trajectory", "single-cell"],
    path: ".claude/skills/scvelo/SKILL.md",
  },
  {
    name: "umap-learn",
    description: "UMAP dimensionality reduction. Fast nonlinear manifold learning for 2D/3D visualization, clustering preprocessing (HDBSCAN), supervised/parametric UMAP, for high-dimensional data.",
    tags: ["analysis", "umap", "dimensionality-reduction", "visualization"],
    path: ".claude/skills/umap-learn/SKILL.md",
  },
  {
    name: "cellxgene-census",
    description: "Query the CELLxGENE Census (61M+ cells) programmatically. Use when you need expression data across tissues, diseases, or cell types from the largest curated single-cell atlas. Best for population-scale queries, reference atlas comparisons. For analyzing your own data use scanpy or scvi-tools.",
    tags: ["analysis", "cellxgene", "census", "atlas"],
    path: ".claude/skills/cellxgene-census/SKILL.md",
  },
  // Data
  {
    name: "anndata",
    description: "Data structure for annotated matrices in single-cell analysis. Use when working with .h5ad files or integrating with the scverse ecosystem. This is the data format skill—for analysis workflows use scanpy; for probabilistic models use scvi-tools; for population-scale queries use cellxgene-census.",
    tags: ["data", "anndata", "format", "h5ad"],
    path: ".claude/skills/anndata/SKILL.md",
  },
  {
    name: "lancedb-query",
    description: "Query the LanceDB vector database containing curated perturbation biology publications, datasets, gene expression records, and molecule/gene registries. Use when looking up genes, molecules, datasets, publications, or cell-level perturbation data, or when a user says 'search the database', 'query LanceDB', or 'find data for gene X'.",
    tags: ["database", "query", "lancedb", "search"],
    path: ".claude/skills/lancedb-query/SKILL.md",
  },
  // Resolvers (in src/ych/skills/)
  {
    name: "gene-resolver",
    description: "Gene name resolution: HGNC symbols, Ensembl IDs, aliases, orthologs",
    tags: ["data", "gene", "resolution", "hgnc"],
    path: "src/ych/skills/gene-resolver/SKILL.md",
  },
  {
    name: "molecule-resolver",
    description: "Molecule resolution: PubChem CID, SMILES, IUPAC names, InChI",
    tags: ["data", "molecule", "resolution", "pubchem"],
    path: "src/ych/skills/molecule-resolver/SKILL.md",
  },
];

function matchSkills(query: string): SkillEntry[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/);

  const scored = SKILL_REGISTRY.map((skill) => {
    let score = 0;
    const searchText =
      `${skill.name} ${skill.description} ${skill.tags.join(" ")}`.toLowerCase();

    for (const word of words) {
      if (word.length < 3) continue;
      if (searchText.includes(word)) score += 1;
      if (skill.tags.some((t) => t.includes(word))) score += 2;
      if (skill.name.includes(word)) score += 3;
    }
    return { skill, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.skill);
}

export const discoverSkillsTool = tool({
  description:
    "Discover relevant skills for the current task. Returns matching skill names and descriptions based on query context.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Description of what you need to do, e.g. 'search for vorinostat papers and assess quality'"
      ),
  }),
  execute: async ({ query }) => {
    const matches = matchSkills(query);
    if (matches.length === 0) {
      return {
        skills: SKILL_REGISTRY.slice(0, 5).map((s) => ({
          name: s.name,
          description: s.description,
          tags: s.tags,
        })),
        note: "No specific matches found. Showing top skills.",
      };
    }
    return {
      skills: matches.map((s) => ({
        name: s.name,
        description: s.description,
        tags: s.tags,
      })),
    };
  },
});

export const loadSkillTool = tool({
  description:
    "Load a skill by name. Returns the full SKILL.md content with specialized knowledge.",
  inputSchema: z.object({
    name: z.string().describe("The skill name from discoverSkills results"),
  }),
  execute: async ({ name }) => {
    const entry = SKILL_REGISTRY.find((s) => s.name === name);
    if (!entry) {
      return {
        error: `Skill "${name}" not found. Available: ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`,
      };
    }

    const repoRoot = await getRepoRoot();

    // Try multiple paths to find the SKILL.md file
    const paths = [
      path.join(repoRoot, entry.path),
      path.join(process.cwd(), entry.path),
      path.join(repoRoot, ".claude", "skills", name, "SKILL.md"),
      path.join(repoRoot, "src", "ych", "skills", name, "SKILL.md"),
    ];

    for (const p of paths) {
      try {
        const content = await fs.readFile(p, "utf-8");
        return { name, content, loaded: true, source: p };
      } catch {
        // Try next path
      }
    }

    // No file found — return error with attempted paths for debugging
    console.error(`[loadSkill] Failed to load "${name}". Tried paths:`, paths);
    return {
      error: `Could not find SKILL.md for "${name}" on disk.`,
      attempted_paths: paths,
      hint: "Check that the skill file exists at one of the attempted paths.",
    };
  },
});
