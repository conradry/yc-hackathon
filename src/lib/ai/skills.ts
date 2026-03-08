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
    description: "Parse natural language scientific queries into structured parameters: entities, perturbation types, question types",
    tags: ["entry-point", "parsing", "query"],
    path: ".claude/skills/query-understanding-workflow/SKILL.md",
  },
  {
    name: "paper-search-workflow",
    description: "Search Semantic Scholar + EuropePMC + LanceDB for perturbation biology papers",
    tags: ["search", "papers", "literature"],
    path: ".claude/skills/paper-search-workflow/SKILL.md",
  },
  {
    name: "concurrent-assessment-workflow",
    description: "Multi-agent paper assessment protocol with 3 independent assessor personas",
    tags: ["assessment", "multi-agent", "quality"],
    path: ".claude/skills/concurrent-assessment-workflow/SKILL.md",
  },
  {
    name: "quality-rubric",
    description: "6-dimension scoring rubric (1-5 scale) for perturbation biology papers",
    tags: ["scoring", "quality", "rubric"],
    path: ".claude/skills/quality-rubric/SKILL.md",
  },
  {
    name: "output-routing-workflow",
    description: "Route final results based on query type: gene lists, dataset tables, paper rankings",
    tags: ["output", "routing", "results"],
    path: ".claude/skills/output-routing-workflow/SKILL.md",
  },
  {
    name: "perturbation-type-router",
    description: "Route analysis based on perturbation type: chemical, CRISPR, RNAi, combinatorial",
    tags: ["perturbation", "routing", "analysis"],
    path: ".claude/skills/perturbation-type-router/SKILL.md",
  },
  {
    name: "dataset-preprocessing-workflow",
    description: "Preprocess datasets for analysis: QC, normalization, feature selection",
    tags: ["preprocessing", "dataset", "pipeline"],
    path: ".claude/skills/dataset-preprocessing-workflow/SKILL.md",
  },
  {
    name: "demo-pipeline-runner",
    description: "Run the full demo pipeline end-to-end for demonstration queries",
    tags: ["demo", "pipeline", "runner"],
    path: ".claude/skills/demo-pipeline-runner/SKILL.md",
  },
  // Orchestration
  {
    name: "agent-spawning-protocol",
    description: "Protocol for spawning and managing sub-agents in multi-agent workflows",
    tags: ["orchestration", "agent", "spawning"],
    path: ".claude/skills/agent-spawning-protocol/SKILL.md",
  },
  {
    name: "result-schema-validator",
    description: "Validate result schemas against expected output formats",
    tags: ["validation", "schema", "results"],
    path: ".claude/skills/result-schema-validator/SKILL.md",
  },
  {
    name: "downstream-agent-skills-generator",
    description: "Generate skill configurations for downstream analysis agents",
    tags: ["orchestration", "skills", "generator"],
    path: ".claude/skills/downstream-agent-skills-generator/SKILL.md",
  },
  // Analysis
  {
    name: "scanpy",
    description: "Single-cell analysis with scanpy: preprocessing, clustering, DE, visualization",
    tags: ["analysis", "scanpy", "single-cell"],
    path: ".claude/skills/scanpy/SKILL.md",
  },
  {
    name: "pydeseq2",
    description: "Bulk RNA-seq differential expression analysis with PyDESeq2",
    tags: ["analysis", "deseq2", "differential-expression", "bulk"],
    path: ".claude/skills/pydeseq2/SKILL.md",
  },
  {
    name: "single-cell-rna-qc",
    description: "Quality control for single-cell RNA-seq data using scverse best practices",
    tags: ["analysis", "qc", "single-cell", "scverse"],
    path: ".claude/skills/single-cell-rna-qc/SKILL.md",
  },
  {
    name: "scvi-tools",
    description: "Deep generative models for single-cell omics: scVI, TOTALVI, MultiVI",
    tags: ["analysis", "scvi", "deep-learning", "single-cell"],
    path: ".claude/skills/scvi-tools/SKILL.md",
  },
  {
    name: "scvelo",
    description: "RNA velocity analysis: cell state transitions, trajectory inference, latent time",
    tags: ["analysis", "velocity", "trajectory", "single-cell"],
    path: ".claude/skills/scvelo/SKILL.md",
  },
  {
    name: "umap-learn",
    description: "UMAP dimensionality reduction for visualization and clustering preprocessing",
    tags: ["analysis", "umap", "dimensionality-reduction", "visualization"],
    path: ".claude/skills/umap-learn/SKILL.md",
  },
  {
    name: "cellxgene-census",
    description: "Query CELLxGENE Census (61M+ cells) for expression data across tissues and diseases",
    tags: ["analysis", "cellxgene", "census", "atlas"],
    path: ".claude/skills/cellxgene-census/SKILL.md",
  },
  // Data
  {
    name: "anndata",
    description: "AnnData format handling: .h5ad files, obs/var metadata, layers, sparse matrices",
    tags: ["data", "anndata", "format", "h5ad"],
    path: ".claude/skills/anndata/SKILL.md",
  },
  {
    name: "lancedb-query",
    description: "LanceDB query patterns: FTS, filter, vector search, hybrid queries",
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
