---
name: output-routing-workflow
description: Routes pipeline output to the appropriate destination — save processed dataset with auto-generated skill, export as API JSON, or continue with follow-up analysis. Use as the final pipeline step after preprocessing and validation, or when a user says "save results", "export dataset", or "what should I do next with this data".
metadata:
    skill-author: K-Dense Inc.
---

# Output Routing Workflow

## Purpose
Routes the final output of the pipeline to the appropriate destination. After preprocessing and validation, results can go to multiple endpoints depending on what the user needs.

## When to Use
Invoke as the final step of the pipeline, after `dataset-preprocessing-workflow` and `result-schema-validator` have completed successfully.

## Output Destinations

### Route 1: Dataset + Auto-Generated Skills (Default)
Save processed data and generate a dataset skill for future sessions.

**When**: User wants to keep processed data for future analysis.

**Actions**:
1. Save processed h5ad to a persistent location (e.g., `data/processed/<dataset_name>.h5ad`)
2. Invoke `downstream-agent-skills-generator` to create dataset SKILL.md
3. Report file paths and summary to user

**Output to user**:
```
Processed dataset saved:
  - Data: data/processed/<name>.h5ad (<N> cells × <M> genes)
  - Skill: .claude/skills/datasets/<name>/SKILL.md

This dataset is now available in future Claude Code sessions.
Next steps: Ask me to analyze specific perturbations, run pathway enrichment, or compare conditions.
```

### Route 2: API Endpoint Format
Format results for serving via an API.

**When**: User wants to make results available programmatically.

**Actions**:
1. Extract key results into a JSON-serializable format
2. Write to a JSON file suitable for API consumption
3. Include: DE results, cluster assignments, perturbation metadata, summary statistics

**Output format**:
```json
{
  "dataset": "<name>",
  "summary": {
    "cells": "<N>",
    "genes": "<M>",
    "clusters": "<K>",
    "perturbations": ["<list>"]
  },
  "de_results": {
    "<perturbation>": [
      {"gene": "<name>", "log2fc": 2.5, "pval_adj": 0.001},
      "..."
    ]
  },
  "cluster_composition": {
    "<cluster_id>": {
      "<perturbation>": "<cell_count>"
    }
  },
  "file_paths": {
    "h5ad": "<path>",
    "skill_md": "<path>"
  }
}
```

### Route 3: Continue with Agent
Pass results to the next analysis step without saving.

**When**: User wants immediate follow-up analysis (e.g., pathway enrichment, visualization).

**Actions**:
1. Keep processed AnnData in-memory (pass file path to next step)
2. Present summary and ask user what analysis to run next
3. Route to appropriate analysis based on user's response

**Suggested follow-ups**:
- "Run pathway enrichment on the top DE genes"
- "Show me the UMAP colored by perturbation"
- "Compare perturbation X vs Y in detail"
- "Export DE results as a CSV"

## Routing Decision Logic

```
IF user explicitly requested save/export:
    → Route 1 (Dataset + Skills)

IF user asked for API/programmatic access:
    → Route 2 (API Format)

IF user's original question implies follow-up analysis:
    → Route 3 (Continue)

IF ambiguous:
    → Ask user: "Would you like me to (1) save the processed dataset for future sessions,
       (2) export results as JSON, or (3) continue with analysis?"

DEFAULT (no user preference):
    → Route 1 + Route 3 (save AND offer follow-up)
```

## Error Handling
- If save fails (permissions, disk space) → report error, offer alternative path
- If skill generation fails → save data anyway, note skill generation can be retried
- If API format conversion fails → fall back to raw JSON dump

## Dependencies
- Uses: `dataset-preprocessing-workflow` (processed data), `downstream-agent-skills-generator` (Route 1), `result-schema-validator` (pre-check)
- Used by: None (terminal workflow)
