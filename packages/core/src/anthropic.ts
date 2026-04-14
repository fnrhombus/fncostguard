import type { UsageSnapshot } from "./cost.js";

/**
 * Anthropic usage API client.
 *
 * The exact usage/billing endpoint is not publicly documented at this time.
 * This module provides a clear interface so the real API can be swapped in
 * once available. Currently it returns zeroed snapshots and logs a warning.
 *
 * When the API becomes available, update `fetchUsageSnapshot` to call the
 * real endpoint and parse the response into a `UsageSnapshot`.
 */

const USAGE_API_BASE = "https://api.anthropic.com/v1/usage";

export interface AnthropicUsageResponse {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Attempt to fetch usage data from the Anthropic API.
 * Returns a UsageSnapshot on success, or null if the endpoint is unavailable.
 */
async function tryFetchUsage(
  apiKey: string,
): Promise<UsageSnapshot | null> {
  try {
    const response = await fetch(USAGE_API_BASE, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as AnthropicUsageResponse;
    return {
      inputTokens: data.input_tokens ?? 0,
      outputTokens: data.output_tokens ?? 0,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the current usage snapshot from the Anthropic API.
 * Falls back to a zeroed snapshot if the API is unavailable,
 * logging a warning so users know to provide manual token counts.
 */
export async function fetchUsageSnapshot(
  apiKey: string,
  warn: (msg: string) => void = console.warn,
): Promise<UsageSnapshot> {
  const result = await tryFetchUsage(apiKey);

  if (result) {
    return result;
  }

  warn(
    "Anthropic usage API is not available. Token tracking will rely on " +
      "manual input_tokens/output_tokens inputs. See the action README for " +
      "fallback usage.",
  );

  return {
    inputTokens: 0,
    outputTokens: 0,
    timestamp: new Date().toISOString(),
  };
}
