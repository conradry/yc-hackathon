// Quality rubric dimension weights
export const DIMENSION_WEIGHTS: Record<string, number> = {
  experimental_design: 0.20,
  data_quality: 0.20,
  perturbation_characterization: 0.20,
  reproducibility: 0.15,
  biological_relevance: 0.15,
  analytical_methods: 0.10,
};

export const QUALITY_DIMENSIONS = Object.keys(DIMENSION_WEIGHTS);

export function computeWeightedScore(scores: Record<string, number>): number {
  let total = 0;
  for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    total += (scores[dim] || 0) * weight;
  }
  return Math.round(total * 100) / 100;
}

export function formatDimensionName(dim: string): string {
  return dim
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
