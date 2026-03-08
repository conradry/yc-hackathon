"use client";

interface PaperCardProps {
  paper: Record<string, string>;
}

export function PaperCard({ paper }: PaperCardProps) {
  return (
    <div className="neo-border neo-shadow-sm bg-white p-3 rounded-sm">
      <h4 className="text-sm font-semibold leading-tight mb-1">
        {paper.title}
      </h4>
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <span className="font-medium text-[var(--color-primary)]">
          {paper.journal}
        </span>
        <span>-</span>
        <span>{paper.publication_date}</span>
        {paper.pmid && <span className="font-mono">{paper.pmid}</span>}
      </div>
      {paper.section_title && (
        <div className="mt-2 text-xs">
          <span className="font-semibold">{paper.section_title}: </span>
          <span className="text-[var(--color-muted)]">
            {paper.section_text?.slice(0, 200)}
            {(paper.section_text?.length || 0) > 200 ? "..." : ""}
          </span>
        </div>
      )}
    </div>
  );
}
