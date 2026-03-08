export interface PlanStep {
  id: number;
  description: string;
  status: "pending" | "running" | "complete" | "error";
  details?: string;
}

export interface AnalysisPlan {
  query: string;
  perturbation_type: string;
  steps: PlanStep[];
}

export type AssessorId = "alpha" | "beta" | "gamma";

export interface AssessorPersona {
  id: AssessorId;
  name: string;
  focus: string;
  color: string;
}

export const ASSESSOR_PERSONAS: AssessorPersona[] = [
  {
    id: "alpha",
    name: "Assessor Alpha",
    focus: "Statistical rigor, sample size, experimental design",
    color: "#0d6efd",
  },
  {
    id: "beta",
    name: "Assessor Beta",
    focus: "Biological relevance, perturbation characterization",
    color: "#22c55e",
  },
  {
    id: "gamma",
    name: "Assessor Gamma",
    focus: "Data quality, reproducibility, analytical methods",
    color: "#ff6b35",
  },
];
