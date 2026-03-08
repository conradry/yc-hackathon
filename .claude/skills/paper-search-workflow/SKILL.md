---
name: paper-search-workflow
description: Searches for perturbation biology papers and datasets across Semantic Scholar, EuropePMC, and LanceDB. Use when a user asks to "find papers", "search for datasets", "look up perturb-seq studies", or needs to retrieve publications about CRISPR screens, drug perturbations, or single-cell perturbation experiments.
metadata:
    skill-author: K-Dense Inc.
---

# Paper Search Workflow

## Purpose
Searches for perturbation biology papers and datasets across available data sources. Takes a structured query (from `query-understanding-workflow`) and returns a ranked candidate list with metadata.

## When to Use
Invoke after `query-understanding-workflow` produces a structured query. This is the primary data retrieval step before assessment.

## Workflow Steps

### Step 1: Prepare Search Queries
From the structured query object, build API-ready search queries:

- **Primary terms**: Combine entities (genes, drugs, cell types) with perturbation type keywords
- **Boolean logic**: Use AND between entity categories, OR within categories
- **Filters**: Apply organism, year range, and data availability filters

Example for query `{genes: ["KRAS"], cell_types: ["A549"], perturbation_type: "genetic_crispr"}`:
```
("KRAS" AND "A549") AND ("CRISPR" OR "knockout" OR "Cas9")
```

### Step 2: Query Data Sources

#### Source A: Semantic Scholar API (Primary)
```bash
# Use Bash tool to query Semantic Scholar
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=<encoded_query>&limit=20&fields=title,abstract,year,authors,externalIds,citationCount,publicationTypes,openAccessPdf" \
  -H "Accept: application/json"
```

Key fields to extract:
- `title`, `abstract`, `year`
- `externalIds.DOI` — for cross-referencing
- `citationCount` — as a relevance proxy
- `openAccessPdf` — data accessibility indicator

#### Source B: PubMed / EuropePMC API (Secondary)
```bash
# Use EuropePMC for broader coverage
curl -s "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=<encoded_query>&format=json&pageSize=20"
```

#### Source C: LanceDB (via `lancedb-query` skill)
Query the curated LanceDB database for publications and datasets. This is the highest-signal source — data has been ingested, genes resolved via `gene-resolver`, and molecules standardized via `molecule-resolver`.

> **No FTS on S3** — Never use `query_type="fts"`. Use pandas `str.contains()` or scalar `.where()` filters.

**Connection:**
```python
import sys; sys.path.insert(0, "scripts")
from db_connect import get_db, search_text

db = get_db()
```

**Publication search** (pandas text filter on `section_text`):
```python
# search_text() calls .to_pandas() then str.contains() — safe for small tables
hits = search_text(db, "publications", "section_text", "<query_terms>")

# Or manual pandas for more complex filters:
pubs_df = db.open_table("publications").to_pandas()
results = pubs_df[
    pubs_df["section_text"].str.contains("<query_terms>", case=False, na=False)
]
```

**Dataset search** (scalar `.where()` + pandas text filter):
```python
datasets = db.open_table("datasets")
# By accession (scalar filter — works on S3)
ds = datasets.search().where("accession_id = 'GSE12345'").to_pandas()

# By text on dataset_description (small table — pandas OK)
ds_df = datasets.to_pandas()
hits = ds_df[ds_df["dataset_description"].str.contains("<query_terms>", case=False, na=False)]
```

**Perturbation-aware search** (gene expression — LARGE table, always filter first):
```python
gene_expr = db.open_table("gene_expression")
# Use scalar .where() with LIKE — never call .to_pandas() without filter
cells = gene_expr.search().where(
    "perturbation_search_string LIKE '%GENE_ID:<gene_index>%'"
).limit(100).to_pandas()
```

**Cross-reference publications → datasets** (join on `pmid`):
```python
pubs_df = db.open_table("publications").to_pandas()
ds_df   = db.open_table("datasets").to_pandas()

# Find papers matching query, then get their datasets
paper_pmids = pubs_df[
    pubs_df["title"].str.contains("<query>", case=False, na=False)
]["pmid"].unique()

related_datasets = ds_df[ds_df["pmid"].isin(paper_pmids)]
```

Prioritize LanceDB results over API results when available (curated > crawled).

See `lancedb-query` SKILL.md for full schema and query patterns.

### Step 3: Deduplicate and Merge
- Match papers across sources by DOI
- Merge metadata from all sources (keep richest record)
- Remove exact duplicates

### Step 4: Enrich with Data Availability
For each candidate paper, check if associated datasets exist:
- Look for GEO accession numbers (GSE*) in abstract/text
- Check for links to data repositories
- Flag papers with downloadable scRNA-seq or bulk RNA-seq data

### Step 5: Rank Candidates
Initial ranking (before quality assessment):
1. **Data availability** — papers with deposited data rank higher
2. **Citation count** — normalized by year (citations per year)
3. **Recency** — recent papers weighted slightly higher
4. **Query match** — how many query entities appear in title/abstract

### Step 6: Return Candidate List

```json
{
  "query_used": "<structured query object>",
  "sources_searched": ["semantic_scholar", "europepmc", "lancedb"],
  "sources_unavailable": [],
  "total_results": "<number>",
  "candidates": [
    {
      "rank": 1,
      "paper_id": "<DOI>",
      "title": "<paper title>",
      "authors": ["<first author et al.>"],
      "year": 2024,
      "abstract": "<abstract text>",
      "perturbation_type": "<chemical|genetic_crispr|genetic_rnai|combinatorial>",
      "organism": "<species>",
      "cell_types": ["<cell types mentioned>"],
      "data_accessions": ["GSE12345"],
      "data_available": true,
      "citation_count": 45,
      "source": "<semantic_scholar|europepmc|lancedb|multiple>",
      "open_access": true
    }
  ],
  "search_metadata": {
    "timestamp": "<ISO 8601>",
    "query_terms": ["<search terms used>"],
    "filters_applied": {}
  }
}
```

## Rate Limiting
- Semantic Scholar: max 100 requests per 5 minutes (unauthenticated)
- EuropePMC: generous limits, but add 1s delay between requests
- If rate limited, return partial results and note in metadata

## Error Handling
- If a source is unavailable, proceed with remaining sources
- If no results found, broaden search by dropping least specific terms
- Return empty candidate list with explanation if all sources fail

## Dependencies
- Uses: `query-understanding-workflow` (for structured query input)
- Used by: `concurrent-assessment-workflow` (passes candidates for assessment)
- Uses: `lancedb-query` (Source C — curated DB with gene/molecule resolution)
