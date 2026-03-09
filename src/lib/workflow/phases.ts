import type { UIMessage } from "ai";
import { isToolUIPart, getToolName } from "ai";
import type {
  WorkflowPhase,
  WorkflowPhaseGroup,
  WorkflowStep,
  StepStatus,
  TextLogEntry,
} from "@/types/workflow";

const TOOL_PHASE_MAP: Record<string, { phase: WorkflowPhase; label: string }> = {
  discoverSkills: { phase: "skills", label: "Loading Skills" },
  loadSkill: { phase: "skills", label: "Loading Skills" },
  planAnalysis: { phase: "planning", label: "Analysis Plan" },
  queryDatabase: { phase: "search", label: "Database Search" },
  assessPaper: { phase: "assessment", label: "Paper Assessment" },
  convergenceCheck: { phase: "convergence", label: "Convergence Check" },
  preprocessDataset: { phase: "preprocessing", label: "Preprocessing" },
  analyzeGeneExpression: { phase: "analysis", label: "Gene Expression Analysis" },
  routeOutput: { phase: "output", label: "Output Options" },
};

function deriveStatus(state: string, output?: unknown): StepStatus {
  if (state === "output-available") {
    // Detect error-in-success: tool returned 200-like but with an error field
    if (output && typeof output === "object" && "error" in output && (output as Record<string, unknown>).error) {
      return "error";
    }
    return "complete";
  }
  if (state === "output-error") return "error";
  return "running";
}

function stepLabel(toolName: string, input?: Record<string, unknown>): string {
  switch (toolName) {
    case "discoverSkills":
      return `Discovering skills${input?.query ? `: "${input.query}"` : ""}`;
    case "loadSkill":
      return `Loading skill: ${input?.name ?? "unknown"}`;
    case "planAnalysis":
      return "Building analysis plan";
    case "queryDatabase":
      return `Searching ${input?.table ?? "database"}${input?.query ? `: "${input.query}"` : ""}`;
    case "assessPaper":
      return `Assessor ${(input?.assessor as string)?.toUpperCase() ?? "?"} → ${input?.paper_title ?? "paper"}`;
    case "convergenceCheck":
      return `Convergence: ${input?.paper_title ?? input?.paper_id ?? "paper"}`;
    case "preprocessDataset":
      return `Preprocessing ${input?.dataset_uid ?? "dataset"}`;
    case "analyzeGeneExpression":
      return `Analyzing expression: ${input?.perturbation ?? input?.dataset_uid ?? "data"}`;
    case "routeOutput":
      return `Output options for ${input?.dataset_name ?? "dataset"}`;
    default:
      return toolName;
  }
}

export interface BuildResult {
  phases: WorkflowPhaseGroup[];
  textEntries: TextLogEntry[];
}

/** Check if a part is a tool part (type starts with "tool-" or is "dynamic-tool") */
function isToolPart(part: UIMessage["parts"][number]): boolean {
  return isToolUIPart(part);
}

export function buildWorkflowPhases(parts: UIMessage["parts"]): BuildResult {
  const textEntries: TextLogEntry[] = [];
  const phaseOrder: WorkflowPhase[] = [];
  const phaseMap = new Map<WorkflowPhase, WorkflowPhaseGroup>();
  const assessmentGroups = new Map<string, WorkflowStep>();

  parts.forEach((part, index) => {
    if (part.type === "text") {
      if (part.text.trim()) {
        textEntries.push({ text: part.text, partIndex: index });
      }
      return;
    }

    if (isToolPart(part)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = part as any;
      const toolName = getToolName(p);
      const state: string = p.state;
      const input = p.input as Record<string, unknown> | undefined;
      const output = p.output;
      const toolCallId: string = p.toolCallId;

      const mapping = TOOL_PHASE_MAP[toolName];
      if (!mapping) return;

      const status = deriveStatus(state, output);
      const step: WorkflowStep = {
        id: toolCallId,
        phase: mapping.phase,
        label: stepLabel(toolName, input),
        status,
        toolName,
        args: input,
        result: state === "output-available" ? output : undefined,
      };

      // Group assessPaper calls by paper_id
      if (toolName === "assessPaper" && input?.paper_id) {
        const paperId = input.paper_id as string;
        const existing = assessmentGroups.get(paperId);
        if (existing) {
          if (!existing.children) existing.children = [];
          existing.children.push(step);
          if (status === "running") existing.status = "running";
          else if (existing.children.every((c) => c.status === "complete") && existing.status !== "running") {
            existing.status = "complete";
          }
          return;
        } else {
          const parentStep: WorkflowStep = {
            id: `assess-${paperId}`,
            phase: "assessment",
            label: `Assessing: ${input.paper_title ?? paperId}`,
            status,
            toolName: "assessPaper",
            args: { paper_id: paperId, paper_title: input.paper_title },
            children: [step],
          };
          assessmentGroups.set(paperId, parentStep);
          addStepToPhase(parentStep, mapping);
          return;
        }
      }

      addStepToPhase(step, mapping);
    }
  });

  function addStepToPhase(step: WorkflowStep, mapping: { phase: WorkflowPhase; label: string }) {
    let group = phaseMap.get(mapping.phase);
    if (!group) {
      group = {
        phase: mapping.phase,
        label: mapping.label,
        status: step.status,
        steps: [],
        defaultExpanded: false,
      };
      phaseMap.set(mapping.phase, group);
      phaseOrder.push(mapping.phase);
    }
    group.steps.push(step);
    if (step.status === "running") group.status = "running";
    else if (step.status === "error") group.status = "error";
    else if (group.steps.every((s) => s.status === "complete")) group.status = "complete";
  }

  const phases = phaseOrder.map((p) => phaseMap.get(p)!);
  phases.forEach((group, i) => {
    group.defaultExpanded = group.status === "running" || i === phases.length - 1;
  });

  return { phases, textEntries };
}
