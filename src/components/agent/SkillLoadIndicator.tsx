"use client";

interface DiscoverProps {
  type: "discover";
  query?: string;
  skills?: { name: string; description: string; tags: string[] }[];
  isLoading: boolean;
  skillName?: never;
  loaded?: never;
}

interface LoadProps {
  type: "load";
  skillName?: string;
  isLoading: boolean;
  loaded?: boolean;
  query?: never;
  skills?: never;
}

type SkillLoadIndicatorProps = DiscoverProps | LoadProps;

export function SkillLoadIndicator(props: SkillLoadIndicatorProps) {
  if (props.type === "discover") {
    return (
      <div className="neo-border bg-[var(--color-secondary)] px-4 py-3 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          {props.isLoading ? (
            <div className="w-3 h-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="var(--color-primary)" strokeWidth="1.5" />
              <path d="M7 4v3l2 1" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Discovering Skills
          </span>
        </div>
        {props.skills && (
          <div className="flex flex-wrap gap-1.5">
            {props.skills.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white neo-border text-xs rounded-sm"
                title={skill.description}
              >
                <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full" />
                {skill.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Load type
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 neo-border bg-white rounded-sm text-xs">
      {props.isLoading ? (
        <div className="w-2.5 h-2.5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      ) : props.loaded ? (
        <span className="w-2.5 h-2.5 bg-[var(--color-success)] rounded-full" />
      ) : (
        <span className="w-2.5 h-2.5 bg-[var(--color-destructive)] rounded-full" />
      )}
      <span className="font-medium">
        {props.isLoading ? "Loading" : "Loaded"}{" "}
        <span className="font-mono text-[var(--color-primary)]">
          {props.skillName}
        </span>
      </span>
    </div>
  );
}
