"use client";

import type { GeneExpressionResult } from "@/types/paper";

interface GeneListProps {
  data: {
    dataset_uid: string;
    perturbation: string;
    method: string;
    total_de_genes: number;
    upregulated: number;
    downregulated: number;
    top_genes: GeneExpressionResult[];
  };
}

export function GeneList({ data }: GeneListProps) {
  const upGenes = data.top_genes.filter((g) => g.direction === "up");
  const downGenes = data.top_genes.filter((g) => g.direction === "down");

  return (
    <div className="neo-border neo-shadow rounded-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--color-primary)] text-white">
        <div className="font-semibold text-sm">
          Differential Expression Results
        </div>
        <div className="text-xs opacity-80 mt-0.5">
          {data.perturbation} | {data.method} | {data.total_de_genes.toLocaleString()}{" "}
          DE genes ({data.upregulated} up, {data.downregulated} down)
        </div>
      </div>

      {/* Gene columns */}
      <div className="grid grid-cols-2 gap-0 divide-x-3 divide-black">
        {/* Upregulated */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 10V2M6 2l3 3M6 2L3 5" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-semibold text-[var(--color-success)]">
              Upregulated ({upGenes.length})
            </span>
          </div>
          <div className="space-y-1">
            {upGenes.map((gene) => (
              <GeneRow key={gene.gene_name} gene={gene} />
            ))}
          </div>
        </div>

        {/* Downregulated */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M6 10l3-3M6 10l-3-3" stroke="var(--color-destructive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-semibold text-[var(--color-destructive)]">
              Downregulated ({downGenes.length})
            </span>
          </div>
          <div className="space-y-1">
            {downGenes.map((gene) => (
              <GeneRow key={gene.gene_name} gene={gene} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 border-t-3 border-black bg-[var(--color-secondary)] text-[10px] text-[var(--color-muted)]">
        Dataset: {data.dataset_uid} | Method: {data.method} | Sorted by
        |log2FC|
      </div>
    </div>
  );
}

function GeneRow({ gene }: { gene: GeneExpressionResult }) {
  const isUp = gene.direction === "up";
  return (
    <div className="flex items-center justify-between neo-border bg-white px-2 py-1.5 rounded-sm">
      <div>
        <span className="font-mono text-xs font-bold">{gene.gene_name}</span>
        <span className="text-[10px] text-[var(--color-muted)] ml-1">
          {gene.ensembl_id}
        </span>
      </div>
      <div className="text-right">
        <span
          className={`text-xs font-bold ${
            isUp ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]"
          }`}
        >
          {isUp ? "+" : ""}
          {gene.log2_fold_change.toFixed(2)}
        </span>
        <span className="text-[10px] text-[var(--color-muted)] ml-1">
          p={gene.adjusted_p_value.toExponential(1)}
        </span>
      </div>
    </div>
  );
}
