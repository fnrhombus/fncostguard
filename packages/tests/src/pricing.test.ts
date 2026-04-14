import { describe, it, expect } from "vitest";
import {
  getPricing,
  supportedModels,
  MODEL_PRICING,
} from "../../core/src/pricing.js";

describe("pricing", () => {
  it("returns pricing for all supported models", () => {
    for (const model of supportedModels()) {
      const pricing = getPricing(model);
      expect(pricing.inputPerMillion).toBeGreaterThan(0);
      expect(pricing.outputPerMillion).toBeGreaterThan(0);
    }
  });

  it("all supported models have valid entries", () => {
    const models = supportedModels();
    expect(models.length).toBeGreaterThanOrEqual(5);

    for (const model of models) {
      expect(MODEL_PRICING[model]).toBeDefined();
      expect(MODEL_PRICING[model].inputPerMillion).toBeTypeOf("number");
      expect(MODEL_PRICING[model].outputPerMillion).toBeTypeOf("number");
    }
  });

  it("resolves model aliases", () => {
    expect(getPricing("claude-4-6-opus")).toEqual(
      getPricing("claude-opus-4-6"),
    );
    expect(getPricing("claude-4-5-sonnet")).toEqual(
      getPricing("claude-sonnet-4-5"),
    );
  });

  it("falls back to most expensive model for unknown IDs", () => {
    const unknown = getPricing("claude-unknown-99");
    const opus = getPricing("claude-opus-4-6");
    expect(unknown).toEqual(opus);
  });

  it("handles case insensitivity and whitespace", () => {
    expect(getPricing("  Claude-Sonnet-4-6  ")).toEqual(
      getPricing("claude-sonnet-4-6"),
    );
  });

  it("calculates correct cost for claude-sonnet-4-6", () => {
    const pricing = getPricing("claude-sonnet-4-6");
    // $3/M input, $15/M output
    expect(pricing.inputPerMillion).toBe(3);
    expect(pricing.outputPerMillion).toBe(15);
  });

  it("calculates correct cost for claude-haiku-4-6", () => {
    const pricing = getPricing("claude-haiku-4-6");
    expect(pricing.inputPerMillion).toBe(0.8);
    expect(pricing.outputPerMillion).toBe(4);
  });
});
