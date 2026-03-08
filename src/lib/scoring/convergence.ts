import { QUALITY_DIMENSIONS } from "./metrics";

interface Assessment {
  scores: Record<string, number>;
}

export function computeConvergence(assessments: Assessment[]) {
  const dimensionStd: Record<string, number> = {};

  for (const dim of QUALITY_DIMENSIONS) {
    const values = assessments.map((a) => a.scores[dim] || 0);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    dimensionStd[dim] = Math.sqrt(variance);
  }

  const maxStd = Math.max(...Object.values(dimensionStd));
  const avgStd =
    Object.values(dimensionStd).reduce((s, v) => s + v, 0) /
    Object.values(dimensionStd).length;

  let level: "strong" | "moderate" | "divergent";
  if (maxStd < 0.5) {
    level = "strong";
  } else if (maxStd < 1.0) {
    level = "moderate";
  } else {
    level = "divergent";
  }

  // Overall score = mean of all assessor overall scores
  const overallScores = assessments.map((a) => a.scores.overall || 0);
  const overallScore =
    Math.round(
      (overallScores.reduce((s, v) => s + v, 0) / overallScores.length) * 100
    ) / 100;

  return {
    level,
    overall_score: overallScore,
    dimension_std: dimensionStd,
    avg_std: Math.round(avgStd * 100) / 100,
    max_std: Math.round(maxStd * 100) / 100,
  };
}

export function getConvergenceColor(level: "strong" | "moderate" | "divergent"): string {
  switch (level) {
    case "strong":
      return "var(--color-success)";
    case "moderate":
      return "var(--color-warning)";
    case "divergent":
      return "var(--color-destructive)";
  }
}

export function getConvergenceLabel(level: "strong" | "moderate" | "divergent"): string {
  switch (level) {
    case "strong":
      return "Strong Agreement";
    case "moderate":
      return "Moderate Agreement";
    case "divergent":
      return "Divergent — Review Needed";
  }
}
