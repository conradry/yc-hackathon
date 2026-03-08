---
name: quality-rubric
description: Standardized 6-dimension scoring rubric (experimental design, data quality, perturbation characterization, reproducibility, biological relevance, analytical methods) for evaluating perturbation biology papers. Use when assessing paper quality, scoring datasets, or when an assessment agent needs evaluation criteria.
metadata:
    skill-author: K-Dense Inc.
---

# Quality Rubric

## Purpose
Standardized assessment criteria for evaluating perturbation biology papers and datasets. Every assessment agent applies this rubric independently to produce comparable, structured scores.

## When to Use
Reference this rubric whenever assessing a paper or dataset's quality. The `concurrent-assessment-workflow` ensures each spawned agent applies this rubric.

## Scoring Dimensions (6 Dimensions, 1-5 Scale)

### 1. Experimental Design (Weight: 0.20)

| Score | Criteria |
|-------|----------|
| **5** | Proper controls (vehicle, non-targeting guide, positive control), biological replicates (n≥3), dose-response or time-course, pre-registered or hypothesis-driven |
| **4** | Good controls, biological replicates (n≥3), clear hypothesis |
| **3** | Basic controls present, biological replicates (n≥2), reasonable design |
| **2** | Minimal controls, technical replicates only, weak design |
| **1** | No controls, no replicates, unclear experimental design |

### 2. Data Quality (Weight: 0.20)

| Score | Criteria |
|-------|----------|
| **5** | Raw data deposited (GEO/ArrayExpress), QC metrics reported, >5000 genes detected per cell (scRNA-seq) or robust signal (bulk), low batch effects |
| **4** | Data deposited, QC performed, good gene detection, manageable batch effects |
| **3** | Data available on request, basic QC, acceptable quality metrics |
| **2** | Limited data availability, minimal QC reporting, questionable quality |
| **1** | No data available, no QC reported, poor quality indicators |

### 3. Perturbation Characterization (Weight: 0.20)

| Score | Criteria |
|-------|----------|
| **5** | Perturbation validated (Western blot/qPCR for genetic, dose-response for chemical), on-target confirmed, off-target assessed |
| **4** | Perturbation validated, on-target confirmed |
| **3** | Perturbation validation mentioned but limited evidence |
| **2** | No validation of perturbation efficiency |
| **1** | Perturbation poorly defined or ambiguous |

### 4. Reproducibility (Weight: 0.15)

| Score | Criteria |
|-------|----------|
| **5** | Methods fully reproducible, code available, analysis pipeline documented, key results validated in independent dataset |
| **4** | Methods detailed, code or pipeline available |
| **3** | Methods described adequately, some tools/parameters listed |
| **2** | Methods vague, key parameters missing |
| **1** | Methods insufficient for reproduction |

### 5. Biological Relevance (Weight: 0.15)

| Score | Criteria |
|-------|----------|
| **5** | Disease-relevant model, clinically meaningful perturbation, validated in patient samples or in vivo |
| **4** | Relevant cell model, biologically meaningful perturbation, some validation |
| **3** | Standard cell line, perturbation has known biology |
| **2** | Model system of limited relevance |
| **1** | Model system inappropriate or irrelevant to stated question |

### 6. Analytical Methods & Instrumentation (Weight: 0.10)

Evaluates whether the sequencing platform, library preparation, computational pipeline, and statistical methods are appropriate for the biological question — and whether known caveats are acknowledged and mitigated.

**Scope:**
- **Sequencing platform**: 10x Chromium (v2/v3/v4), Smart-seq2, Drop-seq, inDrop, Slide-seq, MERFISH, Visium — each has known biases (3' bias, gene-length bias, dropout rates, spatial resolution limits)
- **Library prep & chemistry**: UMI vs read-count, poly-dT vs random priming, full-length vs tag-based
- **Computational pipeline**: Cell Ranger, STARsolo, Salmon/alevin, kallisto|bustools — alignment/quantification choices affect results
- **Normalization & batch correction**: scran, sctransform, Harmony, scVI, ComBat — method appropriateness for the data type
- **Statistical methods**: DE method (Wilcoxon, MAST, DESeq2 on pseudobulk), multiple testing correction, sample size adequacy for chosen test
- **Known platform artifacts**: Ambient RNA contamination (10x), doublet rates by loading density, index hopping (NovaSeq), cell-free RNA in droplet-based methods

| Score | Criteria |
|-------|----------|
| **5** | Platform well-suited for the question, methods appropriate and justified, known caveats explicitly acknowledged and mitigated (e.g., ambient RNA removal with SoupX/CellBender, doublet detection with scrublet) |
| **4** | Appropriate platform and methods, minor caveats present but unlikely to affect core conclusions |
| **3** | Standard methods used without justification, some known caveats unaddressed but not fatal |
| **2** | Questionable method choices for the data type, known biases unmitigated and likely affecting results |
| **1** | Inappropriate methods for the data type, critical pipeline steps missing, or methods not described |

**Assessment agents must actively research** the specific platforms and methods mentioned in each paper (using WebSearch) to surface caveats the paper itself may not disclose.

## Composite Score Calculation

```
composite_score = (
    experimental_design * 0.20 +
    data_quality * 0.20 +
    perturbation_characterization * 0.20 +
    reproducibility * 0.15 +
    biological_relevance * 0.15 +
    analytical_methods * 0.10
)
```

**Score interpretation:**
- **4.0-5.0**: High quality — prioritize for analysis
- **3.0-3.9**: Acceptable — include with caveats noted
- **2.0-2.9**: Low quality — include only if no better alternatives
- **1.0-1.9**: Reject — do not use for downstream analysis

## Red Flags (Instant Disqualifiers)

Any of these drop the composite score to 1.0 regardless of other dimensions:

1. **Data fabrication indicators**: Statistically impossible results, duplicated figures, impossible p-value distributions
2. **Retracted paper**: Paper has been retracted or has an expression of concern
3. **No perturbation control**: Complete absence of any control condition
4. **Species mismatch**: Data from wrong organism for the question asked (unless explicitly relevant)
5. **Predatory journal**: Published in a known predatory journal with no peer review

## Assessment Output Format

Each assessor agent produces this JSON:

```json
{
  "paper_id": "<DOI or identifier>",
  "title": "<paper title>",
  "scores": {
    "experimental_design": "<1-5>",
    "data_quality": "<1-5>",
    "perturbation_characterization": "<1-5>",
    "reproducibility": "<1-5>",
    "biological_relevance": "<1-5>",
    "analytical_methods": "<1-5>"
  },
  "composite_score": "<weighted average>",
  "confounders_identified": [
    {
      "source": "<platform|library_prep|pipeline|normalization|statistical_method>",
      "method": "<specific method/tool name>",
      "caveat": "<known bias or limitation>",
      "acknowledged_in_paper": "<yes|no>",
      "mitigated": "<yes|partially|no>",
      "impact_on_conclusions": "<none|minor|moderate|major>"
    }
  ],
  "red_flags": ["<any triggered red flags>"],
  "strengths": ["<key strengths, max 3>"],
  "weaknesses": ["<key weaknesses, max 3>"],
  "caveats": ["<important caveats for interpretation>"],
  "recommendation": "<prioritize|include_with_caveats|deprioritize|reject>",
  "reasoning": "<2-3 sentence justification>"
}
```

## Dependencies
- Used by: `concurrent-assessment-workflow` (each spawned agent uses this)
- Uses: WebSearch, WebFetch (for active methods research in dimension 6)
