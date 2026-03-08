---
name: downstream-agent-skills-generator
description: Auto-generates a SKILL.md file for a processed dataset so that future Claude Code sessions can discover the dataset and available analyses. Enables persistent dataset awareness across sessions.
---

# Downstream Agent Skills Generator

## Purpose
Auto-generates a SKILL.md file for a processed dataset so that future Claude Code sessions can "know" about the dataset and what analyses are available. This enables persistent dataset awareness across sessions.

## When to Use
Invoke after `dataset-preprocessing-workflow` completes successfully and `result-schema-validator` passes. Generates a skill file that describes the processed dataset.

## Workflow Steps

### Step 1: Read Processed Dataset Metadata
Load the processed h5ad file and extract metadata:

```python
import anndata as ad
adata = ad.read_h5ad("<processed.h5ad>")
metadata = adata.uns["preprocessing"]
```

Key metadata to extract:
- Cell count, gene count
- Perturbation key and available perturbations
- Control condition
- Number of clusters
- Whether DE was performed
- Perturbation type (from routing)
- Original data source (GEO accession, paper DOI)

### Step 2: Generate Skill Content
Build a SKILL.md with this template:

```markdown
# Dataset: <dataset_name>

## Source
- **Paper**: <title, DOI>
- **Data accession**: <GEO ID>
- **Perturbation type**: <chemical|genetic_crispr|genetic_rnai|combinatorial>

## Dataset Summary
- **Cells**: <N> (after QC)
- **Genes**: <N> (HVGs)
- **Perturbations**: <list of perturbation conditions>
- **Control**: <control label>
- **Clusters**: <N>
- **DE performed**: yes/no

## File Location
`<path/to/processed.h5ad>`

## Available Analyses
Based on preprocessing results, these analyses are available:

### Quick Queries
- "Show top DE genes for <perturbation> vs <control>"
- "Compare clusters between <perturbation_1> and <perturbation_2>"
- "Show UMAP colored by perturbation condition"

### Deeper Analysis
- Pathway enrichment on DE genes
- Perturbation similarity/clustering
- Cell type composition changes per perturbation
- <route-specific analyses from perturbation-type-router>

## How to Load
```python
import scanpy as sc
adata = sc.read_h5ad("<path>")
# Access DE results: adata.uns["rank_genes_groups"]
# Access embeddings: adata.obsm["X_umap"], adata.obsm["X_pca"]
# Access raw counts: adata.layers["counts"]
```

## Preprocessing Parameters
<dump of adata.uns["preprocessing"] as formatted key-value pairs>
```

### Step 3: Write Skill File
Save the generated SKILL.md to a dataset-specific skill directory:

```
.claude/skills/datasets/<dataset_name>/SKILL.md
```

Naming convention for `<dataset_name>`:
- Use GEO accession if available: `GSE12345`
- Otherwise: `<first_author>_<year>_<perturbation_type>`
- Lowercase, underscores, no spaces

### Step 4: Register in Index
Append the new dataset skill to a dataset index file:

```
.claude/skills/datasets/INDEX.md
```

Format:
```markdown
# Processed Dataset Index

| Dataset | Type | Cells | Perturbations | Path |
|---------|------|-------|---------------|------|
| GSE12345 | chemical | 5000 | 10 compounds | .claude/skills/datasets/GSE12345/SKILL.md |
```

## Output
- Generated SKILL.md at `.claude/skills/datasets/<name>/SKILL.md`
- Updated INDEX.md
- Confirmation message to user with path and summary

## Dependencies
- Uses: `dataset-preprocessing-workflow` (reads processed h5ad metadata)
- Used by: `output-routing-workflow` (one of the output destinations)
