import { describe, it, expect } from "vitest";
import {
  calculateDelta,
  estimateCost,
  evaluateCost,
  evaluateCostFromTokens,
  formatCostSummary,
  type UsageSnapshot,
} from "../../core/src/cost.js";
import { getPricing } from "../../core/src/pricing.js";

describe("calculateDelta", () => {
  it("calculates token delta between two snapshots", () => {
    const baseline: UsageSnapshot = {
      inputTokens: 1000,
      outputTokens: 500,
      timestamp: "2026-01-01T00:00:00Z",
    };
    const current: UsageSnapshot = {
      inputTokens: 5000,
      outputTokens: 2000,
      timestamp: "2026-01-01T00:05:00Z",
    };

    const delta = calculateDelta(baseline, current);
    expect(delta.inputTokens).toBe(4000);
    expect(delta.outputTokens).toBe(1500);
  });

  it("clamps negative deltas to zero", () => {
    const baseline: UsageSnapshot = {
      inputTokens: 5000,
      outputTokens: 2000,
      timestamp: "2026-01-01T00:00:00Z",
    };
    const current: UsageSnapshot = {
      inputTokens: 1000,
      outputTokens: 500,
      timestamp: "2026-01-01T00:05:00Z",
    };

    const delta = calculateDelta(baseline, current);
    expect(delta.inputTokens).toBe(0);
    expect(delta.outputTokens).toBe(0);
  });

  it("handles zero token snapshots", () => {
    const zero: UsageSnapshot = {
      inputTokens: 0,
      outputTokens: 0,
      timestamp: "2026-01-01T00:00:00Z",
    };

    const delta = calculateDelta(zero, zero);
    expect(delta.inputTokens).toBe(0);
    expect(delta.outputTokens).toBe(0);
  });
});

describe("estimateCost", () => {
  it("calculates cost correctly for sonnet", () => {
    const pricing = getPricing("claude-sonnet-4-6");
    // 1M input tokens at $3/M + 500K output tokens at $15/M = $3 + $7.50 = $10.50
    const cost = estimateCost(1_000_000, 500_000, pricing);
    expect(cost).toBeCloseTo(10.5, 4);
  });

  it("returns zero for zero tokens", () => {
    const pricing = getPricing("claude-sonnet-4-6");
    expect(estimateCost(0, 0, pricing)).toBe(0);
  });

  it("calculates cost for small token counts", () => {
    const pricing = getPricing("claude-sonnet-4-6");
    // 50K input at $3/M = $0.15, 10K output at $15/M = $0.15 => $0.30
    const cost = estimateCost(50_000, 10_000, pricing);
    expect(cost).toBeCloseTo(0.3, 4);
  });
});

describe("evaluateCost", () => {
  const baseline: UsageSnapshot = {
    inputTokens: 10_000,
    outputTokens: 5_000,
    timestamp: "2026-01-01T00:00:00Z",
  };

  it("passes budget check when under limit", () => {
    const current: UsageSnapshot = {
      inputTokens: 60_000,
      outputTokens: 15_000,
      timestamp: "2026-01-01T00:05:00Z",
    };

    // delta: 50K input, 10K output
    // sonnet: $3/M input, $15/M output
    // cost: 0.15 + 0.15 = 0.30
    const result = evaluateCost(baseline, current, "claude-sonnet-4-6", 5.0);
    expect(result.estimatedCost).toBeCloseTo(0.3, 4);
    expect(result.overBudget).toBe(false);
    expect(result.inputTokens).toBe(50_000);
    expect(result.outputTokens).toBe(10_000);
  });

  it("fails budget check when over limit", () => {
    const current: UsageSnapshot = {
      inputTokens: 1_010_000,
      outputTokens: 505_000,
      timestamp: "2026-01-01T00:05:00Z",
    };

    // delta: 1M input, 500K output
    // sonnet: cost = $3 + $7.50 = $10.50
    const result = evaluateCost(baseline, current, "claude-sonnet-4-6", 5.0);
    expect(result.estimatedCost).toBeCloseTo(10.5, 4);
    expect(result.overBudget).toBe(true);
  });
});

describe("evaluateCostFromTokens", () => {
  it("evaluates cost from raw token counts", () => {
    const result = evaluateCostFromTokens(
      50_000,
      10_000,
      "claude-sonnet-4-6",
      5.0,
    );
    expect(result.estimatedCost).toBeCloseTo(0.3, 4);
    expect(result.overBudget).toBe(false);
    expect(result.inputTokens).toBe(50_000);
    expect(result.outputTokens).toBe(10_000);
    expect(result.model).toBe("claude-sonnet-4-6");
  });

  it("detects over-budget from raw tokens", () => {
    const result = evaluateCostFromTokens(
      1_000_000,
      500_000,
      "claude-opus-4-6",
      5.0,
    );
    // opus: $15/M input + $75/M output => $15 + $37.50 = $52.50
    expect(result.estimatedCost).toBeCloseTo(52.5, 4);
    expect(result.overBudget).toBe(true);
  });

  it("uses fallback pricing for unknown model", () => {
    const result = evaluateCostFromTokens(
      1_000_000,
      1_000_000,
      "unknown-model",
      1000.0,
    );
    // falls back to opus: $15 + $75 = $90
    expect(result.estimatedCost).toBeCloseTo(90, 4);
  });
});

describe("formatCostSummary", () => {
  it("formats under-budget summary", () => {
    const summary = formatCostSummary({
      inputTokens: 50_000,
      outputTokens: 10_000,
      estimatedCost: 0.3,
      model: "claude-sonnet-4-6",
      overBudget: false,
      maxCost: 5.0,
    });

    expect(summary).toContain("Model: claude-sonnet-4-6");
    expect(summary).toContain("50,000");
    expect(summary).toContain("10,000");
    expect(summary).toContain("$0.3000");
    expect(summary).toContain("$5.00");
    expect(summary).toContain("Remaining");
  });

  it("formats over-budget summary", () => {
    const summary = formatCostSummary({
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      estimatedCost: 10.5,
      model: "claude-sonnet-4-6",
      overBudget: true,
      maxCost: 5.0,
    });

    expect(summary).toContain("OVER BUDGET");
    expect(summary).toContain("$5.5000");
  });
});
