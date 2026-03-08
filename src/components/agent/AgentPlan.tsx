"use client";

interface PlanStep {
  id: number;
  description: string;
  status?: string;
  details?: string;
}

interface AgentPlanProps {
  plan: {
    query?: string;
    perturbation_type?: string;
    steps?: PlanStep[];
  };
  isLoading: boolean;
}

export function AgentPlan({ plan, isLoading }: AgentPlanProps) {
  const steps = plan?.steps || [];

  return (
    <div className="neo-border neo-shadow bg-white rounded-sm overflow-hidden">
      <div className="px-4 py-2 bg-[var(--color-primary)] text-white flex items-center justify-between">
        <span className="font-semibold text-sm">Analysis Plan</span>
        {plan?.perturbation_type && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-sm">
            {plan.perturbation_type}
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        {steps.map((step, i) => (
          <div key={step.id || i} className="flex items-start gap-3">
            <div className="flex-none mt-0.5">
              <StepIcon status={step.status || "pending"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{step.description}</p>
              {step.details && (
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {step.details}
                </p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            Planning...
          </div>
        )}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <div className="w-5 h-5 bg-[var(--color-success)] rounded-full flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case "running":
      return (
        <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      );
    case "error":
      return (
        <div className="w-5 h-5 bg-[var(--color-destructive)] rounded-full flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 3l4 4M7 3l-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 border-2 border-[var(--color-muted)] rounded-full" />
      );
  }
}
