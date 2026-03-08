#!/usr/bin/env python3
"""
Perturbation biology dataset preprocessing pipeline.

Usage:
    python preprocess.py --input raw.h5ad --output processed.h5ad [options]

Pipeline steps:
    1. Load raw AnnData
    2. QC filtering (genes, cells, mitochondrial %)
    3. Normalization (total count + log1p)
    4. Highly variable gene selection
    5. PCA
    6. Neighbor graph + UMAP
    7. Leiden clustering
    8. Differential expression (perturbation vs control)
"""

import argparse
import sys
import warnings

warnings.filterwarnings("ignore")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Preprocess perturbation biology scRNA-seq data"
    )
    parser.add_argument("--input", required=True, help="Path to raw h5ad file")
    parser.add_argument("--output", required=True, help="Path for processed h5ad output")
    parser.add_argument("--min-genes", type=int, default=200, help="Min genes per cell")
    parser.add_argument("--min-cells", type=int, default=50, help="Min cells per gene")
    parser.add_argument("--max-pct-mito", type=float, default=20.0, help="Max %% mitochondrial")
    parser.add_argument("--n-top-genes", type=int, default=3000, help="Number of HVGs")
    parser.add_argument("--perturbation-key", default="perturbation", help="obs column for perturbation labels")
    parser.add_argument("--control-key", default="control", help="Control condition label value")
    parser.add_argument("--batch-key", default=None, help="obs column for batch correction")
    parser.add_argument("--de-method", default="wilcoxon", choices=["wilcoxon", "t-test"], help="DE test method")
    parser.add_argument("--de-groupby", default=None, help="obs column for DE grouping (defaults to perturbation-key)")
    parser.add_argument("--n-pcs", type=int, default=50, help="Number of PCs")
    parser.add_argument("--resolution", type=float, default=1.0, help="Leiden clustering resolution")
    return parser.parse_args()


def main():
    args = parse_args()

    # Import here so --help works without dependencies
    try:
        import scanpy as sc
        import anndata as ad
        import numpy as np
    except ImportError as e:
        print(f"ERROR: Missing dependency: {e}")
        print("Install with: pip install scanpy anndata numpy")
        sys.exit(1)

    de_groupby = args.de_groupby or args.perturbation_key

    # --- Step 1: Load ---
    print(f"[1/8] Loading {args.input}...")
    try:
        adata = sc.read_h5ad(args.input)
    except Exception as e:
        print(f"ERROR: Failed to load {args.input}: {e}")
        sys.exit(1)

    print(f"  Loaded: {adata.n_obs} cells × {adata.n_vars} genes")

    # Store raw counts in a layer before any processing
    if "counts" not in adata.layers:
        adata.layers["counts"] = adata.X.copy()

    # --- Step 2: QC Filtering ---
    print("[2/8] QC filtering...")
    n_before = adata.n_obs

    # Calculate QC metrics
    adata.var["mt"] = adata.var_names.str.upper().str.startswith("MT-")
    sc.pp.calculate_qc_metrics(adata, qc_vars=["mt"], percent_top=None, log1p=False, inplace=True)

    # Filter cells
    sc.pp.filter_cells(adata, min_genes=args.min_genes)
    sc.pp.filter_genes(adata, min_cells=args.min_cells)

    # Filter by mitochondrial percentage
    if "pct_counts_mt" in adata.obs.columns:
        adata = adata[adata.obs["pct_counts_mt"] < args.max_pct_mito, :].copy()

    n_after = adata.n_obs
    pct_removed = (1 - n_after / n_before) * 100 if n_before > 0 else 0
    print(f"  Cells: {n_before} → {n_after} ({pct_removed:.1f}% removed)")

    if n_after < 100:
        print(f"WARNING: Only {n_after} cells remain after QC. Consider relaxing thresholds.")

    # --- Step 3: Normalization ---
    print("[3/8] Normalizing (total count 1e4 + log1p)...")
    sc.pp.normalize_total(adata, target_sum=1e4)
    sc.pp.log1p(adata)

    # Store normalized counts
    adata.layers["normalized"] = adata.X.copy()

    # --- Step 4: HVG Selection ---
    print(f"[4/8] Selecting top {args.n_top_genes} highly variable genes...")
    n_top = min(args.n_top_genes, adata.n_vars)
    sc.pp.highly_variable_genes(adata, n_top_genes=n_top, flavor="seurat_v3",
                                 layer="counts")
    n_hvg = adata.var["highly_variable"].sum()
    print(f"  Selected {n_hvg} HVGs")

    # Subset to HVGs for downstream but keep all genes in raw
    adata.raw = adata
    adata = adata[:, adata.var["highly_variable"]].copy()

    # --- Step 5: Scale + PCA ---
    print(f"[5/8] Scaling and running PCA ({args.n_pcs} components)...")
    sc.pp.scale(adata, max_value=10)
    n_pcs = min(args.n_pcs, adata.n_obs - 1, adata.n_vars - 1)
    sc.tl.pca(adata, n_comps=n_pcs)
    print(f"  PCA variance explained (first 5): {adata.uns['pca']['variance_ratio'][:5].round(3).tolist()}")

    # --- Step 6: Neighbors + UMAP ---
    print("[6/8] Computing neighbors and UMAP...")
    sc.pp.neighbors(adata, n_pcs=n_pcs)
    sc.tl.umap(adata)

    # --- Step 7: Clustering ---
    print(f"[7/8] Leiden clustering (resolution={args.resolution})...")
    sc.tl.leiden(adata, resolution=args.resolution)
    n_clusters = adata.obs["leiden"].nunique()
    print(f"  Found {n_clusters} clusters")

    # --- Step 8: Differential Expression ---
    print(f"[8/8] Differential expression ({args.de_method}, groupby={de_groupby})...")

    if de_groupby in adata.obs.columns:
        groups = adata.obs[de_groupby].unique().tolist()
        # Remove control from groups for DE
        de_groups = [g for g in groups if g != args.control_key]

        if len(de_groups) > 0 and args.control_key in groups:
            try:
                sc.tl.rank_genes_groups(
                    adata,
                    groupby=de_groupby,
                    reference=args.control_key,
                    method=args.de_method,
                    use_raw=True
                )
                # Store DE results flag
                adata.uns["de_performed"] = True
                adata.uns["de_method"] = args.de_method
                adata.uns["de_groupby"] = de_groupby
                adata.uns["de_reference"] = args.control_key

                # Print top DE genes for first group
                if len(de_groups) > 0:
                    top_genes = adata.uns["rank_genes_groups"]["names"][de_groups[0]][:5]
                    print(f"  Top DE genes ({de_groups[0]} vs {args.control_key}): {list(top_genes)}")
            except Exception as e:
                print(f"  WARNING: DE failed: {e}")
                adata.uns["de_performed"] = False
                adata.uns["de_error"] = str(e)
        else:
            print(f"  WARNING: Control '{args.control_key}' not found in '{de_groupby}'. Skipping DE.")
            adata.uns["de_performed"] = False
    else:
        print(f"  WARNING: Column '{de_groupby}' not found in obs. Skipping DE.")
        adata.uns["de_performed"] = False

    # --- Store preprocessing metadata ---
    adata.uns["preprocessing"] = {
        "pipeline": "perturbation-preprocessing-v1",
        "min_genes": args.min_genes,
        "min_cells": args.min_cells,
        "max_pct_mito": args.max_pct_mito,
        "n_top_genes": args.n_top_genes,
        "n_pcs": n_pcs,
        "resolution": args.resolution,
        "perturbation_key": args.perturbation_key,
        "control_key": args.control_key,
        "batch_key": args.batch_key,
        "de_method": args.de_method,
        "de_groupby": de_groupby,
        "cells_before_qc": n_before,
        "cells_after_qc": n_after,
        "n_hvgs": int(n_hvg),
        "n_clusters": int(n_clusters),
    }

    # --- Save ---
    print(f"\nSaving processed data to {args.output}...")
    adata.write_h5ad(args.output)
    print(f"Done. {adata.n_obs} cells × {adata.n_vars} genes saved.")

    # --- Summary ---
    print("\n=== Preprocessing Summary ===")
    print(f"  Input:          {args.input}")
    print(f"  Output:         {args.output}")
    print(f"  Cells:          {n_before} → {n_after}")
    print(f"  HVGs:           {n_hvg}")
    print(f"  PCs:            {n_pcs}")
    print(f"  Clusters:       {n_clusters}")
    print(f"  DE performed:   {adata.uns.get('de_performed', False)}")
    print("=============================")


if __name__ == "__main__":
    main()
