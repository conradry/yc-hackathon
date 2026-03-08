---
name: demo-pipeline-runner
description: End-to-end smoke test of the perturbation biology pipeline using real LanceDB data. Use when a user says "run the demo", "test the pipeline", "smoke test", or wants to verify the full workflow (query → search → assess → results) works correctly.
metadata:
    skill-author: K-Dense Inc.
---

# Demo Pipeline Runner

## Purpose
End-to-end smoke test of the perturbation biology pipeline using Claude Code subagents and real LanceDB data.

## When to Use
Invoke to test whether the pipeline works. This runs a minimal version:
1 question → LanceDB search → 1 assessor → results.

## Prerequisites
- LanceDB accessible at /Users/kamilseghrouchni/Downloads/ylance (or $LANCEDB_PATH)
- Python 3.13+ with lancedb, pandas installed
- Autonomous permissions configured in .claude/settings.local.json

## Workflow

### Step 1: Verify DB Connectivity
Run the smoke test script using the project venv:
```bash
.venv/bin/python3 scripts/test_db_connection.py
```
If this fails, stop and report the error. Do not proceed.

**Note**: Always use `.venv/bin/python3` (not bare `python3`) — lancedb and pandas are installed in the project venv, not system Python.

### Step 2: Discover Available Data
Query the publications table to find what papers are available:
```bash
.venv/bin/python3 -c "
import lancedb, os
db = lancedb.connect(os.getenv('LANCEDB_PATH', '/Users/kamilseghrouchni/Downloads/ylance'))
pubs = db.open_table('publications')
df = pubs.to_pandas()
papers = df.groupby('title').agg({'pmid': 'first', 'doi': 'first'}).reset_index()
print(f'Available papers: {len(papers)}')
for _, row in papers.head(5).iterrows():
    print(f'  - {row[\"title\"][:100]}')
"
```

Pick the most perturbation-relevant paper and formulate a question about it.

### Step 3: Parse Query (query-understanding-workflow)
Apply the query-understanding-workflow skill to parse the question into a structured query object. Extract entities (genes, drugs, cell types), classify question type, detect perturbation type.

### Step 4: Search LanceDB (paper-search-workflow, Source C only)
Search the publications table. Since FTS indexes may not exist, use pandas filtering as primary approach:
```bash
.venv/bin/python3 -c "
import lancedb, os
db = lancedb.connect(os.getenv('LANCEDB_PATH', '/Users/kamilseghrouchni/Downloads/ylance'))
pubs = db.open_table('publications')
df = pubs.to_pandas()
# Filter by search terms in title/abstract
mask = df['title'].str.contains('<search_terms>', case=False, na=False)
if 'abstract' in df.columns:
    mask = mask | df['abstract'].str.contains('<search_terms>', case=False, na=False)
results = df[mask].head(10)
print(f'Found {len(results)} papers matching search terms')
for _, row in results.iterrows():
    print(f'  - {row[\"title\"][:100]}')
"
```
Also check the datasets table if it exists and cross-reference by pmid/doi.

Build the candidate list JSON per paper-search-workflow output schema.

### Step 5: Assess Top Paper (single assessor)
Spawn ONE assessment agent (not 3 — keep it simple for the demo):
- Apply quality-rubric (6 dimensions)
- Use WebSearch to research the analytical methods mentioned
- Produce the full assessment JSON including confounders_identified

### Step 6: Report Results
Output:
- The structured query from Step 3
- The candidate list from Step 4
- The assessment JSON from Step 5
- Any errors or issues encountered
- Timing for each step

## Success Criteria
- DB connection works
- At least 1 paper found via FTS
- Assessment JSON is valid (all 6 dimensions scored 1-5, composite score computed)
- No permission-denied errors from subagents

## Failure Modes to Watch For
- LanceDB not installed → install via pip
- FTS index not built → fall back to scalar scan
- No papers match query → broaden search or use different question
- Subagent permission denied → check settings.local.json
- Python version mismatch → need 3.13+
