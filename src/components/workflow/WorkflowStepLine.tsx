"use client";

import type { WorkflowStep } from "@/types/workflow";
import { AgentPlan } from "@/components/agent/AgentPlan";
import { AssessorStream } from "@/components/agent/AssessorStream";
import { ConvergencePanel } from "@/components/agent/ConvergencePanel";
import { PaperCard } from "@/components/agent/PaperCard";
import { GeneList } from "@/components/results/GeneList";
import { DatasetTable } from "@/components/results/DatasetTable";

interface WorkflowStepLineProps {
  step: WorkflowStep;
  duration?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  indent?: number;
}

function StatusIcon({ status }: { status: WorkflowStep["status"] }) {
  switch (status) {
    case "complete":
      return <span className="text-[var(--color-success)]">✓</span>;
    case "running":
      return <span className="terminal-spinner">⠋</span>;
    case "error":
      return <span className="text-[var(--color-destructive)]">✗</span>;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function RichDetail({ step }: { step: WorkflowStep }) {
  const { toolName, args, result } = step;

  if (step.status !== "complete" || !result) return null;

  switch (toolName) {
    case "planAnalysis":
      return <AgentPlan plan={result} isLoading={false} />;

    case "assessPaper":
      return (
        <AssessorStream
          assessor={args?.assessor}
          paperTitle={args?.paper_title}
          result={result}
          isLoading={false}
        />
      );

    case "convergenceCheck":
      return <ConvergencePanel data={result} />;

    case "queryDatabase":
      if (args?.table === "publications" && result?.results) {
        return (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Found {result.total} publications
            </div>
            {result.results.slice(0, 5).map((pub: Record<string, string>, i: number) => (
              <PaperCard key={i} paper={pub} />
            ))}
          </div>
        );
      }
      if (args?.table === "datasets" && result?.results) {
        return <DatasetTable datasets={result.results} />;
      }
      return (
        <div className="text-xs text-[var(--color-muted)] px-2 py-1">
          {result?.total ?? 0} results from {args?.table}
        </div>
      );

    case "analyzeGeneExpression":
      return <GeneList data={result} />;

    default:
      return null;
  }
}

export function WorkflowStepLine({
  step,
  duration,
  expandable = false,
  expanded = false,
  onToggle,
  indent = 0,
}: WorkflowStepLineProps) {
  const hasDetail = expandable && step.status === "complete" && step.result;
  const paddingLeft = indent * 16;

  return (
    <div>
      <div
        className={`terminal-line flex items-center gap-2 py-0.5 ${hasDetail ? "cursor-pointer hover:bg-black/[0.02]" : ""}`}
        style={{ paddingLeft }}
        onClick={hasDetail ? onToggle : undefined}
      >
        <StatusIcon status={step.status} />
        <span className="flex-1 truncate text-[var(--foreground)]/70">
          {hasDetail && (
            <span className="text-[var(--color-muted)] mr-1">
              {expanded ? "▾" : "▸"}
            </span>
          )}
          {step.label}
        </span>
        {duration != null && (
          <span className="flex-none text-[var(--color-muted)] text-xs tabular-nums">
            {formatDuration(duration)}
          </span>
        )}
      </div>
      {expanded && hasDetail && (
        <div className="mt-2 mb-3 ml-6 bg-white rounded-sm">
          <RichDetail step={step} />
        </div>
      )}
    </div>
  );
}

/** Render children (assessor sub-steps) for a grouped assessment step */
export function WorkflowStepGroup({
  step,
  durations,
  expanded,
  onToggle,
  childExpanded,
  onChildToggle,
}: {
  step: WorkflowStep;
  durations: Map<string, number>;
  expanded: boolean;
  onToggle: () => void;
  childExpanded: Set<string>;
  onChildToggle: (id: string) => void;
}) {
  const dur = durations.get(step.id);

  return (
    <div>
      <div
        className="terminal-line flex items-center gap-2 py-0.5 cursor-pointer hover:bg-black/[0.02]"
        onClick={onToggle}
      >
        <StatusIcon status={step.status} />
        <span className="flex-1 truncate text-[var(--foreground)]/70">
          <span className="text-[var(--color-muted)] mr-1">
            {expanded ? "▾" : "▸"}
          </span>
          {step.label}
          {step.children && (
            <span className="text-[var(--color-muted)] ml-1 text-xs">
              ({step.children.length} assessors)
            </span>
          )}
        </span>
        {dur != null && (
          <span className="flex-none text-[var(--color-muted)] text-xs tabular-nums">
            {formatDuration(dur)}
          </span>
        )}
      </div>
      {expanded && step.children && (
        <div className="ml-2">
          {step.children.map((child) => (
            <WorkflowStepLine
              key={child.id}
              step={child}
              duration={durations.get(child.id)}
              expandable
              expanded={childExpanded.has(child.id)}
              onToggle={() => onChildToggle(child.id)}
              indent={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
