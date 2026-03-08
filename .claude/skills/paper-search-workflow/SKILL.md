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

#### Source C: LanceDB (Deferred)
When the `lancedb-query` skill is ready, add it here as a vector similarity search source. For now, skip this source and note its absence in results metadata.

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
  "sources_searched": ["semantic_scholar", "europepmc"],
  "sources_unavailable": ["lancedb"],
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
      "source": "<semantic_scholar|europepmc|both>",
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
- Future: Will integrate `lancedb-query` when ready
