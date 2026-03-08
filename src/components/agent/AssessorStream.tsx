"use client";

import { ASSESSOR_PERSONAS, type AssessorId } from "@/types/agent";
import { formatDimensionName } from "@/lib/scoring/metrics";

interface AssessorStreamProps {
  assessor?: AssessorId;
  paperTitle?: string;
  result?: {
    assessor: string;
    paper_title: string;
    scores: Record<string, number>;
    red_flags: string[];
    confounders?: string[];
    recommendation: string;
    justification: string;
  };
  isLoading: boolean;
}

export function AssessorStream({
  assessor,
  paperTitle,
  result,
  isLoading,
}: AssessorStreamProps) {
  const persona = ASSESSOR_PERSONAS.find((p) => p.id === assessor);
  const color = persona?.color || "#0d6efd";

  return (
    <div
      className="neo-border rounded-sm overflow-hidden"
      style={{ borderLeftWidth: "5px", borderLeftColor: color }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: color }}
          >
            {assessor?.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-sm">
            {persona?.name || `Assessor ${assessor}`}
          </span>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <div
              className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: color, borderTopColor: "transparent" }}
            />
            Assessing...
          </div>
        ) : result?.recommendation ? (
          <RecommendationBadge rec={result.recommendation} />
        ) : null}
      </div>

      {/* Focus area */}
      <div className="px-4 py-1 text-xs text-[var(--color-muted)] bg-[var(--color-secondary)]">
        Focus: {persona?.focus || "General assessment"}
      </div>

      {/* Content */}
      <div className="p-4">
        {paperTitle && (
          <p className="text-xs text-[var(--color-muted)] mb-2 truncate">
            Paper: {paperTitle}
          </p>
        )}

        {isLoading && !result ? (
          <div className="space-y-2">
            <div className="h-3 bg-[var(--color-secondary)] rounded-sm animate-pulse w-full" />
            <div className="h-3 bg-[var(--color-secondary)] rounded-sm animate-pulse w-3/4" />
            <div className="h-3 bg-[var(--color-secondary)] rounded-sm animate-pulse w-1/2" />
          </div>
        ) : result ? (
          <div className="space-y-3">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.scores)
                .filter(([k]) => k !== "overall")
                .map(([dim, score]) => (
                  <ScoreBar
                    key={dim}
                    dimension={formatDimensionName(dim)}
                    score={score as number}
                    color={color}
                  />
                ))}
            </div>

            {/* Overall */}
            <div className="flex items-center justify-between neo-border bg-[var(--color-secondary)] px-3 py-2 rounded-sm">
              <span className="text-xs font-semibold">Overall Score</span>
              <span className="font-bold text-lg" style={{ color }}>
                {typeof result.scores.overall === "number"
                  ? result.scores.overall.toFixed(2)
                  : "N/A"}
              </span>
            </div>

            {/* Red flags */}
            {result.red_flags.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-destructive)]">
                  Red Flags:
                </span>
                {result.red_flags.map((flag, i) => (
                  <div
                    key={i}
                    className="text-xs text-[var(--color-destructive)] bg-red-50 px-2 py-1 rounded-sm"
                  >
                    {flag}
                  </div>
                ))}
              </div>
            )}

            {/* Justification */}
            {result.justification && (
              <p className="text-xs text-[var(--color-muted)] italic">
                {result.justification}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ScoreBar({
  dimension,
  score,
  color,
}: {
  dimension: string;
  score: number;
  color: string;
}) {
  const pct = (score / 5) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-[var(--color-muted)] truncate">
          {dimension}
        </span>
        <span className="text-[10px] font-bold ml-1">{score}/5</span>
      </div>
      <div className="h-1.5 bg-[var(--color-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function RecommendationBadge({ rec }: { rec: string }) {
  const config = {
    include: {
      bg: "bg-green-100",
      text: "text-green-800",
      label: "Include",
    },
    caution: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      label: "Caution",
    },
    exclude: { bg: "bg-red-100", text: "text-red-800", label: "Exclude" },
  }[rec] || { bg: "bg-gray-100", text: "text-gray-800", label: rec };

  return (
    <span
      className={`${config.bg} ${config.text} text-xs font-semibold px-2 py-0.5 rounded-sm`}
    >
      {config.label}
    </span>
  );
}
