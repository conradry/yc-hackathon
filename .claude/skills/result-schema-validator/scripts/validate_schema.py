#!/usr/bin/env python3
"""
Validate processed AnnData schema for the perturbation biology pipeline.

Usage:
    python validate_schema.py --input processed.h5ad

Checks required obs/var columns, layers, embeddings, and metadata.
Returns structured JSON validation report.
"""

import argparse
import json
import sys


def parse_args():
    parser = argparse.ArgumentParser(
        description="Validate processed AnnData schema"
    )
    parser.add_argument("--input", required=True, help="Path to processed h5ad file")
    parser.add_argument("--json", action="store_true", help="Output as JSON only")
    return parser.parse_args()


def check_columns(adata_cols, required, name):
    """Check if required columns exist."""
    found = [c for c in required if c in adata_cols]
    missing = [c for c in required if c not in adata_cols]
    return {
        "status": "pass" if not missing else "fail",
        "found": found,
        "missing": missing,
    }


def validate(input_path):
    """Run all validation checks on a processed h5ad file."""
    try:
        import anndata as ad
    except ImportError:
        return {
            "status": "fail",
            "error": "anndata not installed. Run: pip install anndata",
        }

    # Load file
    try:
        adata = ad.read_h5ad(input_path)
    except Exception as e:
        return {"status": "fail", "error": f"Failed to load {input_path}: {e}"}

    report = {
        "status": "pass",
        "file": input_path,
        "checks": {},
        "summary": {
            "total_checks": 0,
            "passed": 0,
            "failed": 0,
            "cells": adata.n_obs,
            "genes": adata.n_vars,
        },
    }

    # --- Check obs columns ---
    # Accept either n_genes or n_genes_by_counts
    obs_required = ["total_counts", "pct_counts_mt", "leiden"]
    obs_check = check_columns(adata.obs.columns, obs_required, "obs")
    # Special check: n_genes or n_genes_by_counts
    has_n_genes = "n_genes" in adata.obs.columns or "n_genes_by_counts" in adata.obs.columns
    if has_n_genes:
        gene_col = "n_genes" if "n_genes" in adata.obs.columns else "n_genes_by_counts"
        obs_check["found"].append(gene_col)
    else:
        obs_check["missing"].append("n_genes/n_genes_by_counts")
        obs_check["status"] = "fail"
    report["checks"]["obs_columns"] = obs_check

    # --- Check var columns ---
    # highly_variable may be in raw.var if data was subset
    var_required_core = ["mt"]
    var_check = check_columns(adata.var.columns, var_required_core, "var")
    has_hvg = "highly_variable" in adata.var.columns
    if not has_hvg and adata.raw is not None:
        has_hvg = "highly_variable" in adata.raw.var.columns
    if has_hvg:
        var_check["found"].append("highly_variable")
    else:
        var_check["missing"].append("highly_variable")
        var_check["status"] = "fail"
    report["checks"]["var_columns"] = var_check

    # --- Check layers ---
    layers_required = ["counts"]
    layers_found = [l for l in layers_required if l in adata.layers]
    layers_missing = [l for l in layers_required if l not in adata.layers]
    report["checks"]["layers"] = {
        "status": "pass" if not layers_missing else "fail",
        "found": layers_found,
        "missing": layers_missing,
    }

    # --- Check embeddings ---
    embeddings_required = ["X_pca", "X_umap"]
    emb_found = [e for e in embeddings_required if e in adata.obsm]
    emb_missing = [e for e in embeddings_required if e not in adata.obsm]
    report["checks"]["embeddings"] = {
        "status": "pass" if not emb_missing else "fail",
        "found": emb_found,
        "missing": emb_missing,
    }

    # --- Check metadata ---
    meta_required = ["preprocessing", "de_performed"]
    meta_found = [m for m in meta_required if m in adata.uns]
    meta_missing = [m for m in meta_required if m not in adata.uns]
    report["checks"]["metadata"] = {
        "status": "pass" if not meta_missing else "fail",
        "found": meta_found,
        "missing": meta_missing,
    }

    # --- Check DE results (conditional) ---
    de_performed = adata.uns.get("de_performed", False)
    if de_performed:
        de_check = {"status": "pass", "details": ""}
        if "rank_genes_groups" not in adata.uns:
            de_check["status"] = "fail"
            de_check["details"] = "de_performed=True but rank_genes_groups missing from uns"
        else:
            rgg = adata.uns["rank_genes_groups"]
            de_fields = ["names", "pvals_adj", "logfoldchanges"]
            de_missing = [f for f in de_fields if f not in rgg]
            if de_missing:
                de_check["status"] = "fail"
                de_check["details"] = f"Missing DE fields: {de_missing}"
            else:
                de_check["details"] = "All DE result fields present"

        # Check for DE metadata
        for key in ["de_method", "de_groupby", "de_reference"]:
            if key not in adata.uns:
                de_check["status"] = "fail"
                de_check["details"] += f"; Missing uns key: {key}"

        report["checks"]["de_results"] = de_check
    else:
        report["checks"]["de_results"] = {
            "status": "skipped",
            "details": "DE not performed (de_performed=False or missing)",
        }

    # --- Compute summary ---
    for check_name, check_result in report["checks"].items():
        report["summary"]["total_checks"] += 1
        if check_result["status"] == "pass" or check_result["status"] == "skipped":
            report["summary"]["passed"] += 1
        else:
            report["summary"]["failed"] += 1
            report["status"] = "fail"

    return report


def main():
    args = parse_args()
    report = validate(args.input)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        # Human-readable output
        status_symbol = "PASS" if report["status"] == "pass" else "FAIL"
        print(f"\n=== Schema Validation: {status_symbol} ===")
        print(f"File: {report.get('file', 'N/A')}")

        if "error" in report:
            print(f"Error: {report['error']}")
            sys.exit(1)

        print(f"Cells: {report['summary']['cells']} | Genes: {report['summary']['genes']}")
        print()

        for check_name, check_result in report["checks"].items():
            status = check_result["status"].upper()
            icon = "+" if status in ("PASS", "SKIPPED") else "-"
            print(f"  [{icon}] {check_name}: {status}")
            if check_result.get("missing"):
                print(f"      Missing: {check_result['missing']}")
            if check_result.get("details"):
                print(f"      {check_result['details']}")

        print(f"\n  Total: {report['summary']['passed']}/{report['summary']['total_checks']} passed")
        print("=" * 40)

    sys.exit(0 if report["status"] == "pass" else 1)


if __name__ == "__main__":
    main()
