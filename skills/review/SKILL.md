---
name: review
description: >-
  pi-flow · paperflow review. Review-task, subagent review, approve or reopen build.
pipeline: [goal, plan, build, review]
---

# review

Orchestrator: `lib/orchestrator.md`.

## Flow

1. **`pi-flow.bd-keeper`** — review work-task linked to build
2. **`reviewer`** subagent (parallel optional: correctness · tests · complexity)
3. Approve → close; **`bd epic close-eligible`**
4. Reject → reopen build-task → `/skill:build`

Audit commits >30 LOC without `Subagent-Run:` trailer.
