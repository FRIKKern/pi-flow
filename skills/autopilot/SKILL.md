---
name: autopilot
description: >-
  pi-flow · Chain goal → plan → grill → revise → build → review. Stops before archive.
argument-hint: "<vision> [--skip-grill]"
pipeline: [goal, plan, build, review]
---

# autopilot

Thin chain — each step is the matching `/skill:*`. Orchestrator: `lib/orchestrator.md`.

## Preflight

`paperflow_host ensure` · optional `paperflow-preflight`

**Boss Pi only** — dispatch `subagent()` for plan/build/review work. Do **not** spawn a new cmux workspace mid-chain (`cmux-layout.sh` attach mode opens the browser in the *current* workspace). `/pf-follow <agent>` to watch children.

**External drivers (Cursor, shell):** `scripts/pi-flow-dispatch.sh "/skill:review"` or `paperflow_dispatch({ message: "…" })` — see `docs/BOSS-DISPATCH.md`.

## Chain

```text
/skill:goal "<vision>"
/skill:plan          # draft
[GRILL PAUSE unless --skip-grill]
/skill:plan          # revise with answers
/skill:build
/skill:review
```

Print summary table with Goal/plan/grill URLs. **Do not auto-archive.**
