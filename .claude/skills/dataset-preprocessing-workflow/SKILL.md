# Dataset Preprocessing Workflow

## Purpose
End-to-end preprocessing pipeline for perturbation biology single-cell datasets. Loads raw data, runs QC, normalizes, selects features, reduces dimensions, clusters, and performs differential expression. Outputs a fully processed AnnData object ready for downstream analysis.

## When to Use
Invoke after `perturbation-type-router` determines the analysis route and provides preprocessing parameters. This workflow executes the actual data processing.

## Prerequisites
- Python 3.9+ with: `scanpy`, `anndata`, `numpy`, `pandas`, `scipy`
- Install if needed: `pip install scanpy anndata`
- Input: path to raw h5ad file (or GEO accession to download)

## Workflow Steps

### Step 1: Determine Input Source
- If user provides a local `.h5ad` file path → use directly
- If user provides a GEO accession (GSE*) → download using the script
- If dataset comes from paper-search results → check for data accession

### Step 2: Get Preprocessing Parameters
Retrieve route-specific parameters from `perturbation-type-router` output:
- QC thresholds (`min_genes`, `min_cells`, `max_pct_mito`)
- Normalization method
- HVG count (`n_top_genes`)
- Batch key, perturbation key, control key
- DE method and groupby

### Step 3: Execute Preprocessing Script
Run the preprocessing pipeline script:

```bash
python .claude/skills/dataset-preprocessing-workflow/scripts/preprocess.py \
  --input <path_to_raw.h5ad> \
  --output <path_to_processed.h5ad> \
  --min-genes 200 \
  --min-cells 50 \
  --max-pct-mito 20 \
  --n-top-genes 3000 \
  --perturbation-key compound \
  --control-key DMSO \
  --batch-key plate \
  --de-method wilcoxon \
  --de-groupby compound
```

The script handles: load → QC → normalize → HVG → PCA → neighbors → UMAP → cluster → DE.

### Step 4: Validate Output
After preprocessing completes, run the `result-schema-validator`:
- Checks that required obs/var columns exist
- Verifies layers are properly structured
- Confirms DE results are present
- Returns pass/fail with details

### Step 5: Report Results
Present a summary to the user:
- Cells before/after QC filtering
- Number of HVGs selected
- Number of clusters found
- Top DE genes per perturbation vs control
- Path to processed h5ad file

## Error Handling
- If input file doesn't exist or is corrupt → clear error message
- If too many cells filtered by QC → warn and suggest relaxing thresholds
- If DE fails (too few cells per group) → skip DE for that group, note in output
- If script crashes → capture stderr, present to user with fix suggestions

## Output
- Processed `.h5ad` file at specified output path
- Console summary of preprocessing steps and results
- Validation report from `result-schema-validator`

## Dependencies
- Uses: `perturbation-type-router` (preprocessing parameters), `result-schema-validator` (output validation)
- Used by: `downstream-agent-skills-generator` (reads processed data metadata), `output-routing-workflow` (routes final output)
- Scripts: `scripts/preprocess.py`
