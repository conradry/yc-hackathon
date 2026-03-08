# Multi-Agent Perturbation Biology Pipeline — Master Plan

## Project Vision

A webapp where users type scientific queries (e.g., "What genes are upregulated in cells treated with vorinostat?") and a multi-agent system searches a curated paper+dataset database (LanceDB, built by colleague), independently assesses quality via multiple assessors, and returns processed results with transparent telemetry.

**Three value props:**
1. **Correct sources** — curated LanceDB as single entry point
2. **Reproducibility** — multiple agents independently assess same papers; convergence = confidence
3. **Trust de-risking** — transparent telemetry showing per-agent scores, agreements, disagreements

---

## Skills Inventory (19 total)

### Custom Pipeline Skills (11) — Built In-House

| # | Skill | Type | Status |
|---|-------|------|--------|
| 1 | `agent-spawning-protocol` | Orchestration | Done |
| 2 | `query-understanding-workflow` | Orchestration | Done |
| 3 | `quality-rubric` | Assessment (6 dimensions) | Done |
| 4 | `paper-search-workflow` | Search | Done |
| 5 | `concurrent-assessment-workflow` | Assessment | Done |
| 6 | `perturbation-type-router` | Routing | Done |
| 7 | `dataset-preprocessing-workflow` | Processing (+ scripts/preprocess.py) | Done |
| 8 | `result-schema-validator` | Validation (+ scripts/validate_schema.py) | Done |
| 9 | `downstream-agent-skills-generator` | Output | Done |
| 10 | `output-routing-workflow` | Output | Done |
| 11 | `lancedb-query` | Data source | Placeholder (colleague owns) |

### K-Dense Scientific Skills (7) — From claude-scientific-skills

| # | Skill | Purpose |
|---|-------|---------|
| 12 | `scanpy` | Core scRNA-seq preprocessing (QC, norm, HVG, PCA, clustering) |
| 13 | `anndata` | AnnData structure (.h5ad I/O, obs/var/layers management) |
| 14 | `scvi-tools` | Deep learning models (scVI batch correction, CPA perturbation modeling) |
| 15 | `scvelo` | RNA velocity, transcriptional dynamics post-perturbation |
| 16 | `cellxgene-census` | Reference atlas access (61M+ cells) |
| 17 | `umap-learn` | UMAP dimensionality reduction |
| 18 | `pydeseq2` | Differential expression (pseudobulk DESeq2) |

### Standalone Skill (1) — From K-Dense Marketplace

| # | Skill | Purpose |
|---|-------|---------|
| 19 | `single-cell-rna-qc` | MAD-based QC with scverse best practices (3 scripts) |

---

## Pipeline Architecture

```
User Question
    ↓
query-understanding-workflow → Structured Query
    ↓
paper-search-workflow → Candidate Papers
  ├─ Semantic Scholar API (primary)
  ├─ EuropePMC API (secondary)
  └─ LanceDB (when ready)
    ↓
concurrent-assessment-workflow → Consensus Ranking
  ├─ N=3 independent assessor agents
  ├─ 6-dimension quality rubric (incl. analytical methods)
  ├─ Active methods research via WebSearch
  └─ Divergence analysis + confounder surfacing
    ↓
perturbation-type-router → Route Decision
  ├─ chemical → dose-response params
  ├─ genetic_crispr → knockout params
  ├─ genetic_rnai → knockdown params
  └─ combinatorial → synergy params
    ↓
dataset-preprocessing-workflow → Processed AnnData (.h5ad)
  Uses: scanpy, anndata, single-cell-rna-qc, pydeseq2
    ↓
result-schema-validator → Validation Report
    ↓
output-routing-workflow → Final Output
  ├─ Route 1: Save + generate dataset skill
  ├─ Route 2: API JSON format
  └─ Route 3: Continue analysis
    ↓
downstream-agent-skills-generator → Dataset Skill for future sessions
```

---

## Webapp Plan

### Tech Stack
- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`) — `streamText` backend + `useChat` frontend
- **Vercel AI Gateway** — routes via Max subscription (no API costs)
- **RetroUI** — NeoBrutalism component library
- **Zenodo-inspired** scientific blue palette
- **LanceDB** — mock initially, colleague plugs in real implementation

### Key Components
- `ChatContainer` / `ChatInput` / `ChatSidebar` — chat interface
- `AgentPlan` / `AgentExecution` — step-by-step agent visualization
- `ConvergencePanel` — multi-assessor agreement/divergence (centerpiece)
- `PaperCard` / `TelemetryView` — paper results + per-agent transparency
- `ResultsPanel` / `GeneList` / `DatasetTable` — final output

### 6 AI Tools
1. `planAnalysis` — show numbered steps
2. `searchLanceDB` — search with multiple strategies
3. `assessPaper` — score on 6 criteria as specific assessor persona
4. `convergenceCheck` — compare assessments, calculate confidence
5. `preprocessDataset` — unify selected datasets
6. `analyzeGeneExpression` — differential expression

### Mock LanceDB Data
~15 entries: vorinostat studies (K562, HeLa, MCF7), TP53/PIK3CA perturbations, noise papers. Interface: `searchSemantic()`, `searchByMetadata()`, `searchByPerturbation()`, `getEntry()`.

---

## Implementation Roadmap

### Phase 1: Skills Infrastructure (DONE)
- [x] 10 custom pipeline skills
- [x] Quality rubric with 6 dimensions + analytical methods
- [x] Active methods research in assessment workflow
- [x] 8 K-Dense/standalone scientific skills imported
- [ ] Test skills load in fresh Claude Code session

### Phase 2: End-to-End Pipeline Testing (NEXT)
- [ ] Abstract data source so pipeline works without LanceDB
- [ ] Run full pipeline on a known paper (e.g., Replogle 2022 Perturb-seq)
- [ ] Validate query-understanding → paper-search → assessment chain
- [ ] Validate preprocessing → validation chain with real .h5ad
- [ ] Test analytical methods dimension + confounder surfacing

### Phase 3: Webapp Build
- [ ] Scaffold Next.js + Vercel AI SDK + RetroUI
- [ ] Build chat UI shell (ChatContainer, Input, Sidebar)
- [ ] Define types + LanceDB mock (15 entries)
- [ ] Build 6 tools + orchestrator route
- [ ] Build agent visualization (AgentPlan, AgentExecution)
- [ ] Build ConvergencePanel + TelemetryView
- [ ] Build results components (GeneList, DatasetTable)
- [ ] End-to-end testing + prompt tuning

### Phase 4: Integration
- [ ] Colleague plugs in real LanceDB
- [ ] Replace mock data with real vector search
- [ ] Deploy to Vercel
- [ ] Demo prep

---

## Key Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Assessment dimensions | 6 (added Analytical Methods) | Surface hidden confounders from platforms/instruments |
| Assessment weights | ED:0.20 DQ:0.20 PC:0.20 R:0.15 BR:0.15 AM:0.10 | Analytical methods is supplementary, not primary |
| Active research | WebSearch per agent per paper | Papers don't always disclose platform limitations |
| Scientific skills | K-Dense (scanpy, anndata, etc.) | Industry standard, maintained, well-documented |
| QC approach | MAD-based (single-cell-rna-qc) | scverse best practices, automated thresholds |
| DE method | pydeseq2 (pseudobulk) | Gold standard for perturbation comparisons |
| Webapp framework | Next.js + Vercel AI SDK | Streaming, tool use, Max subscription via Gateway |
| UI style | RetroUI NeoBrutalism | Distinctive, scientific feel |
| Multi-agent simulation | Tool calls with assessor personas | Simpler than actual multi-agent, same visual effect |

---

## Lessons Learned
See `tasks/lessons.md` for corrections and patterns.
