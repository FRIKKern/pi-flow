---
name: review
description: >-
  pi-flow · paperflow review. Use for "request review", "review this PR", "audit".
  Review-task linked to build-task; approve or reject (reopen build on reject).
---

# review (pi-flow)

Port av [paperflow review](https://github.com/FRIKKern/paperflow/blob/main/skills/review/SKILL.md).

## Flow

1. **bd-keeper**: review work-task linked to build-task
2. **reviewer** subagent(s) — parallel optional: correctness | tests | complexity
3. **Approve** → close review; `bd epic close-eligible`
4. **Reject** → `bd update <build> --reopen` → `/skill:build`

## Subagent-Run audit

Flag commits >30 LOC without `Subagent-Run:` trailer.
