"use client";

import type { Dataset } from "@/types/paper";

interface DatasetTableProps {
  datasets: Dataset[];
}

export function DatasetTable({ datasets }: DatasetTableProps) {
  if (!datasets || datasets.length === 0) return null;

  return (
    <div className="neo-border neo-shadow rounded-sm overflow-hidden">
      <div className="px-4 py-2 bg-[var(--color-accent)] text-white">
        <span className="font-semibold text-sm">
          Datasets ({datasets.length})
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--color-secondary)] border-b-3 border-black">
              <th className="text-left px-3 py-2 font-semibold">Dataset</th>
              <th className="text-left px-3 py-2 font-semibold">Cells</th>
              <th className="text-left px-3 py-2 font-semibold">Technology</th>
              <th className="text-left px-3 py-2 font-semibold">Accession</th>
              <th className="text-left px-3 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((ds, i) => (
              <tr
                key={ds.dataset_uid || i}
                className="border-b border-black/10 hover:bg-[var(--color-secondary)] transition-colors"
              >
                <td className="px-3 py-2 font-mono font-bold">
                  {ds.dataset_uid}
                </td>
                <td className="px-3 py-2">
                  {ds.cell_count.toLocaleString()}
                </td>
                <td className="px-3 py-2">{ds.feature_space}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[var(--color-primary)]">
                    {ds.accession_id}
                  </span>
                  <span className="text-[var(--color-muted)] ml-1">
                    ({ds.accession_database})
                  </span>
                </td>
                <td className="px-3 py-2 max-w-[250px] truncate">
                  {ds.dataset_description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
