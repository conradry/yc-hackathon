"use client";

import { useChatActions } from "@/lib/chat-context";

interface ContinueModeProps {
  analyses: {
    id: string;
    title: string;
    description: string;
    requirements_met: boolean;
    requirements_note?: string;
    prompt: string;
  }[];
}

export function ContinueMode({ analyses }: ContinueModeProps) {
  const { sendMessage } = useChatActions();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {analyses.map((analysis) => (
        <div
          key={analysis.id}
          className="neo-border neo-shadow-sm bg-white rounded-sm p-4 flex flex-col"
        >
          <p className="font-semibold text-sm">{analysis.title}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1 flex-1">
            {analysis.description}
          </p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/10">
            {/* Requirements badge */}
            {analysis.requirements_met ? (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)] font-semibold">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Ready
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-xs text-[var(--color-warning)] font-semibold"
                title={analysis.requirements_note}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 3v4M6 9h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {analysis.requirements_note || "Requirements not met"}
              </span>
            )}

            <button
              onClick={() => sendMessage(analysis.prompt)}
              disabled={!analysis.requirements_met}
              className={`neo-btn px-3 py-1.5 rounded-sm text-xs font-semibold ${
                analysis.requirements_met
                  ? "bg-[var(--color-success)] text-white hover:brightness-110"
                  : "bg-[var(--color-secondary)] text-[var(--color-muted)] cursor-not-allowed opacity-60"
              }`}
            >
              Run
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
