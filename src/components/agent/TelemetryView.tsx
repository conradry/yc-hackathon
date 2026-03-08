"use client";

interface TelemetryViewProps {
  skillsLoaded: string[];
  toolsCalled: { name: string; duration?: number }[];
  assessorDetails?: {
    assessor: string;
    tokensUsed?: number;
    duration?: number;
  }[];
}

export function TelemetryView({
  skillsLoaded,
  toolsCalled,
  assessorDetails,
}: TelemetryViewProps) {
  return (
    <div className="neo-border bg-[var(--color-secondary)] rounded-sm overflow-hidden">
      <div className="px-4 py-2 bg-black text-white flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 11V5l3-4 3 4v6M7 11V3l4 3v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wider">
          Telemetry
        </span>
      </div>
      <div className="p-3 space-y-3 text-xs">
        {/* Skills */}
        <div>
          <div className="font-semibold text-[var(--color-muted)] mb-1">
            Skills Loaded ({skillsLoaded.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {skillsLoaded.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 bg-white neo-border rounded-sm font-mono"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div>
          <div className="font-semibold text-[var(--color-muted)] mb-1">
            Tool Calls ({toolsCalled.length})
          </div>
          <div className="space-y-0.5">
            {toolsCalled.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-mono">{t.name}</span>
                {t.duration && (
                  <span className="text-[var(--color-muted)]">
                    {t.duration}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assessors */}
        {assessorDetails && assessorDetails.length > 0 && (
          <div>
            <div className="font-semibold text-[var(--color-muted)] mb-1">
              Assessor Subagents
            </div>
            <div className="space-y-0.5">
              {assessorDetails.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-mono">{a.assessor}</span>
                  <span className="text-[var(--color-muted)]">
                    {a.tokensUsed ? `${a.tokensUsed} tokens` : ""}
                    {a.duration ? ` / ${a.duration}ms` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
