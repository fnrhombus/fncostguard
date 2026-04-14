/** Cost per 1M tokens in USD */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

/**
 * Pricing table for Anthropic models.
 * Source: https://www.anthropic.com/pricing
 * Last updated: 2026-04-14
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 4.6
  "claude-opus-4-6": { inputPerMillion: 15, outputPerMillion: 75 },
  "claude-sonnet-4-6": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-haiku-4-6": { inputPerMillion: 0.80, outputPerMillion: 4 },

  // Claude 4.5
  "claude-opus-4-5": { inputPerMillion: 15, outputPerMillion: 75 },
  "claude-sonnet-4-5": { inputPerMillion: 3, outputPerMillion: 15 },
};

/** Canonical alias mapping for common model ID variations */
const MODEL_ALIASES: Record<string, string> = {
  "claude-4-6-opus": "claude-opus-4-6",
  "claude-4-6-sonnet": "claude-sonnet-4-6",
  "claude-4-6-haiku": "claude-haiku-4-6",
  "claude-4-5-opus": "claude-opus-4-5",
  "claude-4-5-sonnet": "claude-sonnet-4-5",
};

/**
 * Resolve a model ID to its pricing. Falls back to the most expensive
 * model (Opus) if the model is unknown, to avoid undercharging.
 */
export function getPricing(modelId: string): ModelPricing {
  const normalized = modelId.toLowerCase().trim();
  const canonical = MODEL_ALIASES[normalized] ?? normalized;
  return MODEL_PRICING[canonical] ?? MODEL_PRICING["claude-opus-4-6"];
}

/** Returns all known model IDs (not aliases). */
export function supportedModels(): string[] {
  return Object.keys(MODEL_PRICING);
}
