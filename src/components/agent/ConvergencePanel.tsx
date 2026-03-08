"use client";

import { ASSESSOR_PERSONAS } from "@/types/agent";
import { formatDimensionName, QUALITY_DIMENSIONS } from "@/lib/scoring/metrics";
import {
  getConvergenceColor,
  getConvergenceLabel,
} from "@/lib/scoring/convergence";

interface ConvergencePanelProps {
  data: {
    paper_id: string;
    paper_title: string;
    assessments: {
      assessor: string;
      scores: Record<string, number>;
      red_flags: string[];
      recommendation: string;
      justification: string;
    }[];
    consensus: {
      level: "strong" | "moderate" | "divergent";
      overall_score: number;
      dimension_std: Record<string, number>;
      recommendation: string;
      red_flags: string[];
    };
  };
}

export function ConvergencePanel({ data }: ConvergencePanelProps) {
  const { consensus, assessments, paper_title, paper_id } = data;
  const color = getConvergenceColor(consensus.level);
  const label = getConvergenceLabel(consensus.level);

  return (
    <div className="neo-border neo-shadow rounded-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: color, color: "white" }}
      >
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs opacity-80 truncate max-w-[300px]">
            {paper_title}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black">
            {consensus.overall_score.toFixed(2)}
          </div>
          <div className="text-xs opacity-80">consensus score</div>
        </div>
      </div>

      {/* Dimension comparison grid */}
      <div className="p-4 space-y-3">
        {QUALITY_DIMENSIONS.map((dim) => (
          <DimensionRow
            key={dim}
            dimension={dim}
            assessments={assessments}
            std={consensus.dimension_std[dim]}
          />
        ))}
      </div>

      {/* Red flags */}
      {consensus.red_flags.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs font-semibold text-[var(--color-destructive)] mb-1">
            Aggregated Red Flags:
          </div>
          <div className="flex flex-wrap gap-1">
            {consensus.red_flags.map((flag, i) => (
              <span
                key={i}
                className="text-[10px] bg-red-50 text-[var(--color-destructive)] px-2 py-0.5 rounded-sm neo-border"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Consensus recommendation */}
      <div className="px-4 py-2 border-t-3 border-black bg-[var(--color-secondary)] flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)]">
          Paper: {paper_id}
        </span>
        <span className="text-xs font-semibold">
          Recommendation:{" "}
          <span
            className={
              consensus.recommendation === "include"
                ? "text-green-600"
                : consensus.recommendation === "exclude"
                  ? "text-red-600"
                  : "text-yellow-600"
            }
          >
            {consensus.recommendation.toUpperCase()}
          </span>
        </span>
      </div>
    </div>
  );
}

function DimensionRow({
  dimension,
  assessments,
  std,
}: {
  dimension: string;
  assessments: {
    assessor: string;
    scores: Record<string, number>;
  }[];
  std: number;
}) {
  const isHigh = std >= 1.0;
  const isMod = std >= 0.5;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">
          {formatDimensionName(dimension)}
        </span>
        <span
          className={`text-[10px] font-mono ${
            isHigh
              ? "text-[var(--color-destructive)]"
              : isMod
                ? "text-[var(--color-warning)]"
                : "text-[var(--color-success)]"
          }`}
        >
          std: {std.toFixed(2)}
        </span>
      </div>
      {/* Score track with assessor dots */}
      <div className="relative h-4 bg-[var(--color-secondary)] rounded-full neo-border overflow-visible">
        {/* Grid lines at 1-5 */}
        {[1, 2, 3, 4, 5].map((v) => (
          <div
            key={v}
            className="absolute top-0 bottom-0 w-px bg-black/10"
            style={{ left: `${((v - 1) / 4) * 100}%` }}
          />
        ))}
        {/* Assessor dots */}
        {assessments.map((a) => {
          const score = a.scores[dimension] || 0;
          const persona = ASSESSOR_PERSONAS.find((p) => p.id === a.assessor);
          const pct = ((score - 1) / 4) * 100;
          return (
            <div
              key={a.assessor}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full neo-border"
              style={{
                left: `calc(${pct}% - 6px)`,
                backgroundColor: persona?.color || "#666",
              }}
              title={`${persona?.name || a.assessor}: ${score}/5`}
            />
          );
        })}
      </div>
      {/* Scale labels */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-[var(--color-muted)]">1</span>
        <span className="text-[8px] text-[var(--color-muted)]">5</span>
      </div>
    </div>
  );
}
