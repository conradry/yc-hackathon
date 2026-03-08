---
name: result-schema-validator
description: Validates that a processed AnnData object has all required fields, layers, and metadata for downstream analysis. Acts as a quality gate after the dataset-preprocessing-workflow.
---

# Result Schema Validator

## Purpose
Validates that a processed AnnData object has all required fields, layers, and metadata for downstream analysis. Acts as a quality gate after `dataset-preprocessing-workflow`.

## When to Use
- Call automatically at the end of `dataset-preprocessing-workflow`
- Call manually to validate any processed h5ad file before downstream use
- Use before `downstream-agent-skills-generator` to ensure data integrity

## Validation Script
Run the validation script:

```bash
python .claude/skills/result-schema-validator/scripts/validate_schema.py --input <processed.h5ad>
```

The script checks all required fields and returns a structured pass/fail report.

## What Gets Validated

### Required obs columns
- `n_genes` or `n_genes_by_counts` — genes detected per cell
- `total_counts` — total UMI counts per cell
- `pct_counts_mt` — mitochondrial percentage
- `leiden` — cluster assignments

### Required var columns
- `highly_variable` — HVG flag (in raw var if subset was applied)
- `mt` — mitochondrial gene flag

### Required layers
- `counts` — raw count matrix

### Required obsm (embeddings)
- `X_pca` — PCA embedding
- `X_umap` — UMAP embedding

### Required uns (metadata)
- `preprocessing` — dict with pipeline parameters
- `de_performed` — boolean flag

### Conditional checks
- If `de_performed` is True:
  - `rank_genes_groups` must exist in `uns`
  - DE results must have `names`, `pvals_adj`, `logfoldchanges` fields
  - `de_method`, `de_groupby`, `de_reference` must be recorded

## Output Format

```json
{
  "status": "pass | fail",
  "file": "<path to validated file>",
  "checks": {
    "obs_columns": {"status": "pass", "found": ["n_genes", "total_counts", "pct_counts_mt", "leiden"], "missing": []},
    "var_columns": {"status": "pass", "found": ["highly_variable", "mt"], "missing": []},
    "layers": {"status": "pass", "found": ["counts"], "missing": []},
    "embeddings": {"status": "pass", "found": ["X_pca", "X_umap"], "missing": []},
    "metadata": {"status": "pass", "found": ["preprocessing", "de_performed"], "missing": []},
    "de_results": {"status": "pass | skipped", "details": "<details>"}
  },
  "summary": {
    "total_checks": 6,
    "passed": 6,
    "failed": 0,
    "cells": 5000,
    "genes": 3000
  }
}
```

## Dependencies
- Uses: None (standalone validator)
- Used by: `dataset-preprocessing-workflow` (post-processing validation)
- Scripts: `scripts/validate_schema.py`
