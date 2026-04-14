import * as core from "@actions/core";
import { fetchUsageSnapshot } from "./anthropic.js";
import {
  evaluateCost,
  evaluateCostFromTokens,
  formatCostSummary,
  type UsageSnapshot,
} from "./cost.js";

async function runStart(): Promise<void> {
  const apiKey = core.getInput("anthropic_api_key", { required: true });

  const snapshot = await fetchUsageSnapshot(apiKey, core.warning);
  const startTime = new Date().toISOString();

  core.setOutput("start_time", startTime);
  core.setOutput("baseline_usage", JSON.stringify(snapshot));

  core.info(`Cost tracking started at ${startTime}`);
  core.info(
    `Baseline: ${snapshot.inputTokens} input / ${snapshot.outputTokens} output tokens`,
  );
}

async function runStop(): Promise<void> {
  const apiKey = core.getInput("anthropic_api_key", { required: true });
  const maxCost = parseFloat(core.getInput("max_cost") || "10.00");
  const model = core.getInput("model") || "claude-sonnet-4-6";

  // Check for manual token inputs (fallback mode)
  const manualInput = core.getInput("input_tokens");
  const manualOutput = core.getInput("output_tokens");

  let result;

  if (manualInput || manualOutput) {
    // Fallback mode: use manually provided token counts
    const inputTokens = parseInt(manualInput || "0", 10);
    const outputTokens = parseInt(manualOutput || "0", 10);

    result = evaluateCostFromTokens(inputTokens, outputTokens, model, maxCost);
  } else {
    // API mode: compare baseline to current usage
    const baselineRaw = core.getInput("baseline_usage");
    const baseline: UsageSnapshot = baselineRaw
      ? (JSON.parse(baselineRaw) as UsageSnapshot)
      : { inputTokens: 0, outputTokens: 0, timestamp: "" };

    const current = await fetchUsageSnapshot(apiKey, core.warning);
    result = evaluateCost(baseline, current, model, maxCost);
  }

  // Set outputs
  core.setOutput("total_input_tokens", result.inputTokens.toString());
  core.setOutput("total_output_tokens", result.outputTokens.toString());
  core.setOutput("estimated_cost", result.estimatedCost.toFixed(4));

  // Create annotation
  const summary = formatCostSummary(result);

  if (result.overBudget) {
    core.error(
      `AI Cost Guard: Budget exceeded!\n${summary}`,
      { title: "AI Cost Guard: OVER BUDGET" },
    );
    core.setFailed(
      `Cost $${result.estimatedCost.toFixed(4)} exceeds budget of $${result.maxCost.toFixed(2)}`,
    );
  } else {
    core.notice(summary, { title: "AI Cost Guard: Cost Summary" });
    core.info(`Cost tracking complete. ${summary.replace(/\n/g, " | ")}`);
  }
}

async function run(): Promise<void> {
  const action = core.getInput("action", { required: true });

  switch (action) {
    case "start":
      await runStart();
      break;
    case "stop":
      await runStop();
      break;
    default:
      core.setFailed(
        `Unknown action "${action}". Must be "start" or "stop".`,
      );
  }
}

run().catch((err: unknown) => {
  core.setFailed(
    err instanceof Error ? err.message : "An unknown error occurred",
  );
});
