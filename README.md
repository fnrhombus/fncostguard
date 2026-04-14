# fncostguard

**Know what your AI CI costs. Before the invoice.**

[![GitHub Action](https://img.shields.io/badge/action-v0.1.0-blue?logo=github)](https://github.com/fnrhombus/fncostguard)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

```yaml
- uses: fnrhombus/fncostguard@v1
  id: guard-start
  with:
    action: start
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    max_cost: 5.00

- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

- uses: fnrhombus/fncostguard@v1
  with:
    action: stop
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    start_time: ${{ steps.guard-start.outputs.start_time }}
    baseline_usage: ${{ steps.guard-start.outputs.baseline_usage }}
    max_cost: 5.00
```

## The problem

AI-powered CI steps (Claude Code, Copilot, etc.) can burn through API credits fast. A single runaway workflow can cost more than your monthly budget. Existing solutions: hope and prayer.

**fncostguard** wraps your AI steps with budget tracking. It measures token usage, estimates cost, and fails the workflow if you go over budget -- before the invoice surprises you.

## How it works

1. **Start** -- Before your AI step, fncostguard records a usage baseline.
2. **AI step runs** -- Your Claude Code action (or any AI action) does its thing.
3. **Stop** -- After the AI step, fncostguard measures the delta, estimates cost, and annotates the workflow run.

If the estimated cost exceeds your `max_cost`, the workflow fails with a clear error.

## Fallback mode

If the Anthropic usage API isn't available, you can provide token counts manually:

```yaml
- uses: fnrhombus/fncostguard@v1
  with:
    action: stop
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    input_tokens: 50000
    output_tokens: 10000
    model: claude-sonnet-4-6
    max_cost: 5.00
```

## Supported models

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|-------|--------------------:|---------------------:|
| claude-opus-4-6 | $15.00 | $75.00 |
| claude-sonnet-4-6 | $3.00 | $15.00 |
| claude-haiku-4-6 | $0.80 | $4.00 |
| claude-opus-4-5 | $15.00 | $75.00 |
| claude-sonnet-4-5 | $3.00 | $15.00 |

Unknown models fall back to the most expensive pricing (Opus) to avoid undercharging.

## Outputs

| Output | Description |
|--------|-------------|
| `start_time` | ISO timestamp when tracking started |
| `baseline_usage` | Usage snapshot at start (JSON) |
| `total_input_tokens` | Input tokens used during the step |
| `total_output_tokens` | Output tokens used during the step |
| `estimated_cost` | Estimated cost in USD |

## Support

If this action saves you money, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/fnrhombus)
- [Buy Me a Coffee](https://buymeacoffee.com/fnrhombus)

## License

MIT
