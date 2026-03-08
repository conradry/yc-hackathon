export type WorkflowPhase =
  | "skills"
  | "planning"
  | "search"
  | "assessment"
  | "convergence"
  | "preprocessing"
  | "analysis";

export type StepStatus = "running" | "complete" | "error";

export interface WorkflowStep {
  id: string;
  phase: WorkflowPhase;
  label: string;
  status: StepStatus;
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  duration?: number;
  children?: WorkflowStep[];
}

export interface WorkflowPhaseGroup {
  phase: WorkflowPhase;
  label: string;
  status: StepStatus;
  steps: WorkflowStep[];
  defaultExpanded: boolean;
}

export interface TextLogEntry {
  text: string;
  /** Index in the original parts array, used for interleaving */
  partIndex: number;
}
