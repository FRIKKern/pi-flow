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
