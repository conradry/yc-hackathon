"use client";

interface ChatSidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function ChatSidebar({ open, onToggle }: ChatSidebarProps) {
  return (
    <>
      {/* Toggle button when closed */}
      {!open && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 neo-btn bg-white p-2 rounded-sm"
          aria-label="Open sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`${
          open ? "w-[280px]" : "w-0"
        } flex-none h-full border-r-3 border-black bg-white transition-all duration-200 overflow-hidden`}
      >
        <div className="w-[280px] h-full flex flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-4 border-b-3 border-black">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--color-primary)] neo-border rounded-sm flex items-center justify-center">
                <span className="text-white font-bold text-xs">PB</span>
              </div>
              <span className="font-[var(--font-heading)] text-sm font-black">
                PerturbDB
              </span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-[var(--color-secondary)] rounded-sm transition-colors"
              aria-label="Close sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* New chat button */}
          <div className="px-4 py-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full neo-btn bg-[var(--color-primary)] text-white px-4 py-2 rounded-sm text-sm font-semibold"
            >
              + New Analysis
            </button>
          </div>

          {/* Info section */}
          <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              <InfoCard
                title="Skill-Based AI"
                description="Agent dynamically loads specialized skills for each query"
              />
              <InfoCard
                title="3 Assessors"
                description="Alpha (stats), Beta (biology), Gamma (data quality)"
              />
              <InfoCard
                title="Convergence"
                description="Multi-agent consensus with transparent disagreement"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t-3 border-black text-xs text-[var(--color-muted)]">
            YC Hackathon 2026 — Perturbation Biology
          </div>
        </div>
      </aside>
    </>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="neo-border neo-shadow-sm bg-[var(--color-secondary)] p-3 rounded-sm">
      <h3 className="font-semibold text-xs mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-muted)]">{description}</p>
    </div>
  );
}
