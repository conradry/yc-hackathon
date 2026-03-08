"use client";

import type { WorkflowPhaseGroup } from "@/types/workflow";
import { WorkflowStepLine, WorkflowStepGroup } from "./WorkflowStepLine";

interface WorkflowPhaseSectionProps {
  group: WorkflowPhaseGroup;
  expanded: boolean;
  onToggle: () => void;
  durations: Map<string, number>;
  expandedSteps: Set<string>;
  onStepToggle: (id: string) => void;
}

function PhaseStatusIcon({ status }: { status: WorkflowPhaseGroup["status"] }) {
  switch (status) {
    case "complete":
      return <span className="text-[var(--color-success)] font-bold">✓</span>;
    case "running":
      return <span className="terminal-spinner">⠋</span>;
    case "error":
      return <span className="text-[var(--color-destructive)] font-bold">✗</span>;
  }
}

function formatPhaseDuration(durations: Map<string, number>, group: WorkflowPhaseGroup): string | null {
  // Sum all step durations in this phase
  let total = 0;
  let hasAny = false;
  for (const step of group.steps) {
    const d = durations.get(step.id);
    if (d != null) {
      total += d;
      hasAny = true;
    }
    if (step.children) {
      for (const child of step.children) {
        const cd = durations.get(child.id);
        if (cd != null) {
          total += cd;
          hasAny = true;
        }
      }
    }
  }
  if (!hasAny) return null;
  if (total < 1000) return `${total}ms`;
  return `${(total / 1000).toFixed(1)}s`;
}

export function WorkflowPhaseSection({
  group,
  expanded,
  onToggle,
  durations,
  expandedSteps,
  onStepToggle,
}: WorkflowPhaseSectionProps) {
  const phaseDuration = formatPhaseDuration(durations, group);
  const stepCount = group.steps.reduce(
    (n, s) => n + (s.children ? s.children.length : 1),
    0
  );

  return (
    <div className="border-l-2 border-black/10 ml-1">
      {/* Phase header */}
      <div
        className="terminal-line flex items-center gap-2 py-1 cursor-pointer hover:bg-black/[0.03] font-semibold -ml-[2px] pl-[2px] border-l-2 border-transparent hover:border-black/20"
        onClick={onToggle}
      >
        <PhaseStatusIcon status={group.status} />
        <span className="flex-1">
          <span className="text-[var(--color-muted)] mr-1 text-xs">
            {expanded ? "▾" : "▸"}
          </span>
          {group.label}
          {stepCount > 1 && (
            <span className="text-[var(--color-muted)] font-normal text-xs ml-1.5">
              ({stepCount} steps)
            </span>
          )}
        </span>
        {phaseDuration && (
          <span className="flex-none text-[var(--color-muted)] font-normal text-xs tabular-nums">
            {phaseDuration}
          </span>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="ml-3 pb-1">
          {group.steps.map((step) =>
            step.children ? (
              <WorkflowStepGroup
                key={step.id}
                step={step}
                durations={durations}
                expanded={expandedSteps.has(step.id)}
                onToggle={() => onStepToggle(step.id)}
                childExpanded={expandedSteps}
                onChildToggle={onStepToggle}
              />
            ) : (
              <WorkflowStepLine
                key={step.id}
                step={step}
                duration={durations.get(step.id)}
                expandable={
                  step.toolName !== "discoverSkills" &&
                  step.toolName !== "loadSkill" &&
                  step.toolName !== "preprocessDataset"
                }
                expanded={expandedSteps.has(step.id)}
                onToggle={() => onStepToggle(step.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
