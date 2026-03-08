import type { UIMessage } from "ai";
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
};

function deriveStatus(state: string): StepStatus {
  if (state === "result") return "complete";
  if (state === "error") return "error";
  return "running";
}

function stepLabel(toolName: string, args?: Record<string, unknown>): string {
  switch (toolName) {
    case "discoverSkills":
      return `Discovering skills${args?.query ? `: "${args.query}"` : ""}`;
    case "loadSkill":
      return `Loading skill: ${args?.name ?? "unknown"}`;
    case "planAnalysis":
      return "Building analysis plan";
    case "queryDatabase":
      return `Searching ${args?.table ?? "database"}${args?.query ? `: "${args.query}"` : ""}`;
    case "assessPaper":
      return `Assessor ${(args?.assessor as string)?.toUpperCase() ?? "?"} → ${args?.paper_title ?? "paper"}`;
    case "convergenceCheck":
      return `Convergence: ${args?.paper_title ?? args?.paper_id ?? "paper"}`;
    case "preprocessDataset":
      return `Preprocessing ${args?.dataset_uid ?? "dataset"}`;
    case "analyzeGeneExpression":
      return `Analyzing expression: ${args?.perturbation ?? args?.dataset_uid ?? "data"}`;
    default:
      return toolName;
  }
}

export interface BuildResult {
  phases: WorkflowPhaseGroup[];
  textEntries: TextLogEntry[];
}

export function buildWorkflowPhases(parts: UIMessage["parts"]): BuildResult {
  const textEntries: TextLogEntry[] = [];
  // Ordered list of phase groups, preserving first-seen order
  const phaseOrder: WorkflowPhase[] = [];
  const phaseMap = new Map<WorkflowPhase, WorkflowPhaseGroup>();

  // For assessment grouping by paper_id
  const assessmentGroups = new Map<string, WorkflowStep>();

  parts.forEach((part, index) => {
    if (part.type === "text") {
      if (part.text.trim()) {
        textEntries.push({ text: part.text, partIndex: index });
      }
      return;
    }

    if (part.type === "tool-invocation") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolInvocation = (part as any).toolInvocation as { toolCallId: string; toolName: string; args: Record<string, unknown>; state: string; result?: unknown };
      const { toolName, args, state, toolCallId } = toolInvocation;
      const mapping = TOOL_PHASE_MAP[toolName];
      if (!mapping) return;

      const status = deriveStatus(state);
      const step: WorkflowStep = {
        id: toolCallId,
        phase: mapping.phase,
        label: stepLabel(toolName, args),
        status,
        toolName,
        args,
        result: state === "result" ? toolInvocation.result : undefined,
      };

      // Group assessPaper calls by paper_id
      if (toolName === "assessPaper" && args?.paper_id) {
        const paperId = args.paper_id as string;
        const groupKey = paperId;
        const existing = assessmentGroups.get(groupKey);
        if (existing) {
          if (!existing.children) existing.children = [];
          existing.children.push(step);
          // Update parent status: running if any child running, else complete if all complete
          if (status === "running") existing.status = "running";
          else if (existing.children.every((c) => c.status === "complete") && existing.status !== "running") {
            existing.status = "complete";
          }
          return; // Don't add as separate step
        } else {
          // First assessor for this paper — create parent step
          const parentStep: WorkflowStep = {
            id: `assess-${paperId}`,
            phase: "assessment",
            label: `Assessing: ${args.paper_title ?? paperId}`,
            status,
            toolName: "assessPaper",
            args: { paper_id: paperId, paper_title: args.paper_title },
            children: [step],
          };
          assessmentGroups.set(groupKey, parentStep);
          // Add parent to phase group
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
    // Update phase status
    if (step.status === "running") group.status = "running";
    else if (step.status === "error") group.status = "error";
    else if (group.steps.every((s) => s.status === "complete")) group.status = "complete";
  }

  // Set defaultExpanded for running phases and last phase
  const phases = phaseOrder.map((p) => phaseMap.get(p)!);
  phases.forEach((group, i) => {
    group.defaultExpanded = group.status === "running" || i === phases.length - 1;
  });

  return { phases, textEntries };
}
