import { type ModelPricing, getPricing } from "./pricing.js";

export interface UsageSnapshot {
  inputTokens: number;
  outputTokens: number;
  timestamp: string;
}

export interface CostResult {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  model: string;
  overBudget: boolean;
  maxCost: number;
}

/**
 * Calculate the token delta between two usage snapshots.
 * If current values are lower than baseline (e.g. API reset), treats delta as current values.
 */
export function calculateDelta(
  baseline: UsageSnapshot,
  current: UsageSnapshot,
): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: Math.max(0, current.inputTokens - baseline.inputTokens),
    outputTokens: Math.max(0, current.outputTokens - baseline.outputTokens),
  };
}

/** Estimate USD cost from token counts and model pricing. */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/** Full cost evaluation: delta, estimate, budget check. */
export function evaluateCost(
  baseline: UsageSnapshot,
  current: UsageSnapshot,
  model: string,
  maxCost: number,
): CostResult {
  const delta = calculateDelta(baseline, current);
  const pricing = getPricing(model);
  const cost = estimateCost(delta.inputTokens, delta.outputTokens, pricing);

  return {
    inputTokens: delta.inputTokens,
    outputTokens: delta.outputTokens,
    estimatedCost: cost,
    model,
    overBudget: cost > maxCost,
    maxCost,
  };
}

/** Evaluate cost from raw token counts (fallback/manual mode). */
export function evaluateCostFromTokens(
  inputTokens: number,
  outputTokens: number,
  model: string,
  maxCost: number,
): CostResult {
  const pricing = getPricing(model);
  const cost = estimateCost(inputTokens, outputTokens, pricing);

  return {
    inputTokens,
    outputTokens,
    estimatedCost: cost,
    model,
    overBudget: cost > maxCost,
    maxCost,
  };
}

/** Format a CostResult into a human-readable annotation string. */
export function formatCostSummary(result: CostResult): string {
  const lines = [
    `Model: ${result.model}`,
    `Input tokens: ${result.inputTokens.toLocaleString()}`,
    `Output tokens: ${result.outputTokens.toLocaleString()}`,
    `Estimated cost: $${result.estimatedCost.toFixed(4)}`,
    `Budget: $${result.maxCost.toFixed(2)}`,
  ];

  if (result.overBudget) {
    lines.push(
      `STATUS: OVER BUDGET by $${(result.estimatedCost - result.maxCost).toFixed(4)}`,
    );
  } else {
    const remaining = result.maxCost - result.estimatedCost;
    lines.push(`Remaining: $${remaining.toFixed(4)}`);
  }

  return lines.join("\n");
}
