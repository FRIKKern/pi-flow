---
name: agentstorm
description: >-
  Fan out many parallel subagents at once (default 20). Use when the user says
  agentstorm, storm, or wants a large parallel research/build burst.
argument-hint: "[count] [agent] task…"
---

# agentstorm (pi-flow)

**Agentstorm** = spawn **many subagents** from the boss session. Default **20** slots; **4** run at a time (`defaultConcurrency`) so browse/MCP work does not open 20 tabs at once.

## Defaults (`settings/defaults.json`)

| Key | Default |
|-----|---------|
| `piFlow.agentstorm.defaultCount` | 20 |
| `piFlow.agentstorm.defaultAgent` | `researcher` |
| `piFlow.agentstorm.defaultConcurrency` | 4 |
| `piFlow.agentstorm.maxCount` | 128 |

After changing settings, run `/pi-flow-setup` (merges pi-subagents `parallel.maxTasks` / `concurrency` and `needsAttentionAfterMs`) and restart Pi.

## Quick invoke

```text
/pf-storm research Browserbase MCP docs for pi-flow-l9o — one page per slot
```

```text
/pf-storm 50 researcher Map docs.browserbase.com llms.txt — 50 distinct URLs
```

```text
/pf-storm 12 worker Implement bd-ready tasks from {previous} — one task per slot
```

## Boss tool call (manual)

When the user says **agentstorm** without a number, use **20** slots unless they gave another count.

**Always** use `/pf-storm …` or `buildAgentstormPayload()` — it emits **one task per slot** with unique `output` under `.pi-flow/browserstorm/<stamp>/slot-NN.md`. Never use a single `count: 20` task with the builtin `researcher` agent (that collides on `research.md` and `progress.md`).

```text
/pf-storm 20 researcher Map docs.browserbase.com — one URL per slot
```

User asked for **N** agents → **N explicit tasks**, `concurrency`: **4** (or `piFlow.agentstorm.defaultConcurrency`). Do **not** run 8×3 parallel waves unless they explicitly asked for concurrency 8.

## Multi-agent storm

Different agents in one burst:

```text
subagent({
  tasks: [
    { agent: "scout", task: "Map pi-flow browserbase wiring", progress: true },
    { agent: "researcher", count: 18, task: "External Browserbase docs — 18 URL slices", progress: true }
  ],
  concurrency: 4
})
```

## After dispatch

1. `/pf-watch` (optional — `/pf-storm` turns watch on)
2. Tell the user `/pf-agents` and `/pf-follow <agent>`
3. Boss synthesizes; do not paste 20 full transcripts inline

## When to use

| User says | You do |
|-----------|--------|
| "agentstorm …" / "storm …" | Default **20** slots, **4** concurrent `researcher` |
| "agentstorm 8 …" | **8** slots, still `concurrency: 4` unless they asked for 8-wide |
| "50 researchers on …" | `count: 50`, `concurrency: 4` |
| Small fix / one file | **Do not** agentstorm — single `worker` |

See `lib/subagents-policy.md` and `lib/orchestrator.md`.
