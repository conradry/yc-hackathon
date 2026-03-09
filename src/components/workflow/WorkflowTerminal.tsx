"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { buildWorkflowPhases } from "@/lib/workflow/phases";
import { WorkflowPhaseSection } from "./WorkflowPhaseSection";

interface WorkflowTerminalProps {
  parts: UIMessage["parts"];
  isStreaming: boolean;
}

function FormattedLogLine({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return null;
  return (
    <div className="terminal-line text-[var(--color-muted)] py-0.5 italic">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

export function WorkflowTerminal({ parts, isStreaming }: WorkflowTerminalProps) {
  const { phases, textEntries } = buildWorkflowPhases(parts);

  // Timing tracking
  const timingStart = useRef(new Map<string, number>());
  const [durations, setDurations] = useState(new Map<string, number>());
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  // Expand/collapse state
  const [expandedPhases, setExpandedPhases] = useState(new Set<string>());
  const [expandedSteps, setExpandedSteps] = useState(new Set<string>());

  // Stable key for phase identity: "phase1:status1,phase2:status2,..."
  const phaseKey = phases.map((g) => `${g.phase}:${g.status}`).join(",");

  // Auto-expand running/last phases + routeOutput steps
  useEffect(() => {
    setExpandedPhases((prev) => {
      const merged = new Set(prev);
      phases.forEach((g, i) => {
        if (g.status === "running" || i === phases.length - 1) {
          merged.add(g.phase);
        }
      });
      return merged;
    });
    setExpandedSteps((prev) => {
      const merged = new Set(prev);
      phases.forEach((g) => {
        g.steps.forEach((s) => {
          if (s.toolName === "routeOutput" && s.status === "complete") {
            merged.add(s.id);
          }
        });
      });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);

  // Track step durations
  useEffect(() => {
    const starts = timingStart.current;
    let changed = false;
    const newDurations = new Map(durations);

    for (const group of phases) {
      const allSteps = group.steps.flatMap((s) =>
        s.children ? [s, ...s.children] : [s]
      );
      for (const step of allSteps) {
        if (step.status === "running" && !starts.has(step.id)) {
          starts.set(step.id, Date.now());
        }
        if (step.status === "complete" && starts.has(step.id) && !newDurations.has(step.id)) {
          newDurations.set(step.id, Date.now() - starts.get(step.id)!);
          changed = true;
        }
      }
    }
    if (changed) setDurations(newDurations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);

  // Elapsed timer while streaming
  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime.current), 100);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Reset start time when we begin streaming
  useEffect(() => {
    if (isStreaming) startTime.current = Date.now();
  }, [isStreaming]);

  const togglePhase = useCallback((phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }, []);

  const toggleStep = useCallback((id: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Compute totals
  const totalSteps = phases.reduce(
    (n, g) => n + g.steps.reduce((m, s) => m + (s.children ? s.children.length : 1), 0),
    0
  );
  const completedSteps = phases.reduce(
    (n, g) =>
      n +
      g.steps.reduce((m, s) => {
        if (s.children) return m + s.children.filter((c) => c.status === "complete").length;
        return m + (s.status === "complete" ? 1 : 0);
      }, 0),
    0
  );

  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Interleave text entries before the first phase
  // For simplicity, show text entries at the top (before phases) and at the bottom (after phases)
  const firstToolIndex = parts.findIndex((p) => isToolUIPart(p));
  const lastToolIndex = (() => {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (isToolUIPart(parts[i])) return i;
    }
    return -1;
  })();
  const prefixTexts = textEntries.filter((t) => firstToolIndex === -1 || t.partIndex < firstToolIndex);
  const suffixTexts = textEntries.filter((t) => t.partIndex > lastToolIndex && lastToolIndex !== -1);

  return (
    <div className="neo-border neo-shadow rounded-sm overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] text-white">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex-1 text-xs font-mono opacity-60 text-center">
          analysis workflow
        </span>
        <span className="text-xs font-mono tabular-nums opacity-60">
          {formatElapsed(isStreaming ? elapsed : (durations.size > 0 ? Array.from(durations.values()).reduce((a, b) => a + b, 0) : elapsed))}
        </span>
      </div>

      {/* Terminal body */}
      <div className="bg-white px-4 py-3 space-y-1 text-[13px] font-mono">
        {/* Prefix text */}
        {prefixTexts.map((t, i) => (
          <FormattedLogLine key={`pre-${i}`} text={t.text} />
        ))}

        {/* Phase sections */}
        {phases.map((group) => (
          <WorkflowPhaseSection
            key={group.phase}
            group={group}
            expanded={expandedPhases.has(group.phase)}
            onToggle={() => togglePhase(group.phase)}
            durations={durations}
            expandedSteps={expandedSteps}
            onStepToggle={toggleStep}
          />
        ))}

        {/* Suffix text */}
        {suffixTexts.map((t, i) => (
          <FormattedLogLine key={`suf-${i}`} text={t.text} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="terminal-line text-[var(--color-primary)] py-0.5">
            <span className="terminal-spinner">⠋</span>
            <span className="ml-2 opacity-70">Processing...</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-secondary)] border-t-2 border-black/10 text-xs text-[var(--color-muted)] font-mono">
        <span>
          {completedSteps}/{totalSteps} steps completed
        </span>
        <span className="tabular-nums">
          {formatElapsed(isStreaming ? elapsed : (durations.size > 0 ? Array.from(durations.values()).reduce((a, b) => a + b, 0) : 0))}
        </span>
      </div>
    </div>
  );
}
