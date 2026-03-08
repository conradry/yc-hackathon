#!/usr/bin/env python3
"""Inspect a LanceDB database."""

import sys

try:
    import lancedb
    print(f"lancedb version: {lancedb.__version__}")
except ImportError:
    print("ERROR: lancedb is not installed. Install with: pip install lancedb")
    sys.exit(1)

db_path = "/Users/kamilseghrouchni/Downloads/ylance"
db = lancedb.connect(db_path)

print(f"\nDatabase path: {db_path}")
print(f"Table names: {db.table_names()}")

for name in db.table_names():
    print(f"\n{'='*60}")
    print(f"Table: {name}")
    print(f"{'='*60}")

    table = db.open_table(name)

    # Schema
    schema = table.schema
    print(f"\nSchema ({len(schema)} columns):")
    for field in schema:
        print(f"  - {field.name}: {field.type}")

    # Row count
    row_count = table.count_rows()
    print(f"\nTotal rows: {row_count}")

    # Sample data
    print(f"\nSample data (first 3 rows):")
    df = table.to_pandas()
    print(df.head(3).to_string())

    print(f"\n\nAll column value examples:")
    for col in df.columns:
        val = df[col].iloc[0] if len(df) > 0 else "N/A"
        if isinstance(val, str) and len(val) > 200:
            val = val[:200] + "..."
        print(f"  {col}: {val}")
