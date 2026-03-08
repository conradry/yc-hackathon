---
name: lancedb-query
description: Query the LanceDB vector database containing curated perturbation biology publications, datasets, gene expression records, and molecule/gene registries. Use when looking up genes, molecules, datasets, publications, or cell-level perturbation data, or when a user says "search the database", "query LanceDB", or "find data for gene X".
metadata:
    skill-author: K-Dense Inc.
---

# LanceDB Query

## Purpose
Query the project's LanceDB vector database containing curated perturbation biology publications, datasets, gene expression records, and molecule/gene registries. This is the primary structured data source for the pipeline — complementing Semantic Scholar and EuropePMC API searches.

## When to Use
- `paper-search-workflow` calls this skill as **Source C** to search publications and datasets by text, metadata, or perturbation type
- Any workflow needing to look up gene indices, molecule UIDs, or dataset metadata
- Retrieving sparse gene expression data for a specific dataset or perturbation condition

## Database Schema

### Core Tables

#### `publications` — Paper sections (denormalized)
```python
PublicationSchema:
    pmid: str                    # PubMed ID
    doi: str                     # DOI
    title: str                   # Paper title
    journal: str                 # Journal name
    publication_date: datetime   # Publication date
    section_title: str           # e.g., "Abstract", "Methods", "Results"
    section_text: str            # Full text of section
```
**Note**: One row per section. Metadata is repeated per row (denormalized) to enable direct filtering without joins.

**Indexes**: Scalar on `pmid`, `doi`, `journal`, `section_title`.

#### `datasets` — Dataset metadata
```python
DatasetSchema:
    pmid: str | None             # Link to publication
    doi: str | None
    cell_count: int              # Total cells
    feature_space: str           # "gene_expression" or "image_features"
    measured_feature_indices: bytes | None  # Sparse indices into feature tables
    accession_database: str | None   # "GEO", "ArrayExpress", etc.
    accession_id: str | None         # "GSE12345"
    dataset_description: str | None  # Protocol/experimental description
    dataset_uid: str             # Unique ID (auto-generated UUID)
```
**Indexes**: Scalar on `pmid`, `doi`, `feature_space`, `accession_database`, `accession_id`, `dataset_uid`.

#### `gene_expression` — Per-cell sparse counts
```python
GeneExpressionRecord:
    cell_uid: str                # Unique cell ID
    dataset_uid: str             # Links to DatasetSchema
    assay: str                   # e.g., "10x Chromium v3"
    gene_indices: bytes          # Sparse column indices (int32)
    counts: bytes                # Sparse counts (float32)
    # Perturbation metadata:
    is_control: bool | None
    chemical_perturbation_uid: list[str] | None     # Links to MoleculeSchema.sample_uid
    chemical_perturbation_concentration: list[float] | None
    genetic_perturbation_gene_index: list[int] | None  # Links to GeneSchema.gene_index
    genetic_perturbation_method: list[str] | None      # CRISPR-cas9, CRISPRi, siRNA, etc.
    perturbation_search_string: str   # Auto-generated: "SM:<uid> GENE_ID:<idx> METHOD:<m>"
```

### Reference Tables

#### `genes` — Global gene registry
```python
GeneSchema:
    gene_index: int              # Unique sequential ID (positional)
    gene_name: str               # e.g., "TP53"
    ensembl_id: str | None       # e.g., "ENSG00000141510"
    ensembl_version: str | None
    organism: str                # "human", "mouse", etc.
```

#### `molecules` — Chemical compound registry
```python
MoleculeSchema:
    smiles: str | None           # SMILES string
    pubchem_cid: int | None      # PubChem Compound ID
    iupac_name: str | None       # Standardized name
    sample_uid: str              # Auto-generated UUID
```

#### `image_feature_vectors` — Per-cell image features
```python
ImageFeatureVectorRecord:
    cell_uid: str
    dataset_uid: str
    feature_values: bytes        # Dense feature vector
    # Same perturbation fields as GeneExpressionRecord
```

#### `image_features` — Feature name registry
```python
ImageFeatureSchema:
    feature_index: int
    feature_name: str
    description: str | None
```

## Connection

The database is hosted on S3. Use the shared helper:

```python
import sys; sys.path.insert(0, "scripts")
from db_connect import get_db, search_text

db = get_db()   # connects to s3://ychackathon-cell-data/yclance
```

> **No FTS on S3** — LanceDB full-text search indexes do not work on S3-backed
> tables. Never use `query_type="fts"`. Use pandas `str.contains()` on small
> tables or LanceDB scalar `.where()` filters instead.

## Large Table Warning

| Table | Rows | Safe to `.to_pandas()`? |
|-------|------|------------------------|
| publications | ~1K | Yes |
| datasets | ~100 | Yes |
| genes | ~60K | Yes |
| molecules | ~1K | Yes |
| image_features | ~1K | Yes |
| **gene_expression** | **~5.3M** | **NO — use `.where()` first** |
| **image_feature_vectors** | **~20M** | **NO — use `.where()` first** |

## Query Patterns

### 1. Search Publications by Text (Pandas)
```python
import sys; sys.path.insert(0, "scripts")
from db_connect import get_db, search_text

db = get_db()

# Substring search on section_text (downloads full table, ~1K rows — OK)
hits = search_text(db, "publications", "section_text", "CRISPR screen K562")

# Filter by section type using pandas
pubs_df = db.open_table("publications").to_pandas()
methods = pubs_df[
    pubs_df["section_text"].str.contains("10x Chromium", case=False, na=False)
    & (pubs_df["section_title"] == "Methods")
]
```

### 2. Find Datasets by Accession or Publication
```python
datasets = db.open_table("datasets")

# By GEO accession (scalar .where() — works on S3)
ds = datasets.search().where("accession_id = 'GSE12345'").to_pandas()

# By publication (pmid)
ds = datasets.search().where("pmid = '12345678'").to_pandas()

# By feature space
gene_datasets = datasets.search().where("feature_space = 'gene_expression'").to_pandas()

# Text search on dataset_description (small table — pandas OK)
ds_df = datasets.to_pandas()
hits = ds_df[ds_df["dataset_description"].str.contains("CRISPR", case=False, na=False)]
```

### 3. Look Up Genes
```python
genes = db.open_table("genes")

# By gene name (scalar .where() — works on S3)
tp53 = genes.search().where("gene_name = 'TP53'").to_pandas()

# By ensembl ID
gene = genes.search().where("ensembl_id = 'ENSG00000141510'").to_pandas()

# All genes for an organism
human_genes = genes.search().where("organism = 'human'").to_pandas()
```

### 4. Look Up Molecules
```python
molecules = db.open_table("molecules")

# By PubChem CID
mol = molecules.search().where("pubchem_cid = 5311").to_pandas()

# By name (iupac_name)
mol = molecules.search().where("iupac_name = 'vorinostat'").to_pandas()
```

### 5. Query Cells by Perturbation (LARGE TABLE)
```python
gene_expr = db.open_table("gene_expression")

# ALWAYS filter with .where() BEFORE .to_pandas() — 5.3M rows!

# All cells from a dataset
cells = gene_expr.search().where(f"dataset_uid = '{uid}'").to_pandas()

# Filter by perturbation using scalar .where() on perturbation_search_string
crispr_cells = gene_expr.search().where(
    f"dataset_uid = '{uid}' AND perturbation_search_string LIKE '%GENE_ID:42%'"
).to_pandas()

# Control cells only
controls = gene_expr.search().where(
    f"dataset_uid = '{uid}' AND is_control = true"
).to_pandas()
```

### 6. Cross-Reference Publications → Datasets
```python
# Join on pmid to find datasets for a paper
pubs_df = db.open_table("publications").to_pandas()
ds_df   = db.open_table("datasets").to_pandas()

paper_pmids = pubs_df[
    pubs_df["title"].str.contains("Perturb-seq", case=False, na=False)
]["pmid"].unique()

related_datasets = ds_df[ds_df["pmid"].isin(paper_pmids)]
```

### 7. Reconstruct Sparse Expression Matrix
```python
import numpy as np

def decode_sparse_row(gene_indices_bytes, counts_bytes, n_genes):
    """Decode a single cell's sparse expression into a dense vector."""
    indices = np.frombuffer(gene_indices_bytes, dtype=np.int32)
    values = np.frombuffer(counts_bytes, dtype=np.float32)
    dense = np.zeros(n_genes, dtype=np.float32)
    dense[indices] = values
    return dense
```

## Resolver Skills

Two companion skills handle identifier standardization before data is ingested:

- **`gene-resolver`** (`src/ych/skills/gene-resolver/`): Validates gene symbols and Ensembl IDs via Bionty ontologies. Detects organisms from Ensembl prefixes, handles combinatorial perturbation targets, identifies control labels.
- **`molecule-resolver`** (`src/ych/skills/molecule-resolver/`): Resolves compound names/SMILES to PubChem CIDs via API. Handles control labels (DMSO, vehicle, etc.), cleans compound name formatting.

## Ingestion Utilities

Located at `src/ych/ingestion_utils.py`:
- `register_genes_two_stage()` — Register measured genes + perturbation targets
- `resolve_molecule_uids_by_pubchem_cid()` — Create/lookup molecule records
- `write_cell_batch()` — Bulk write cell records
- `upsert_table()` — Create or append to tables
- `standardize_metadata_to_ontology()` — Map values to canonical ontology terms

## Dependencies
- Uses: `src/ych/schema.py` (table schemas), `src/ych/ingestion_utils.py` (helpers), `gene-resolver`, `molecule-resolver`
- Used by: `paper-search-workflow` (Source C), `dataset-preprocessing-workflow` (data retrieval), `perturbation-type-router` (perturbation field mapping)
