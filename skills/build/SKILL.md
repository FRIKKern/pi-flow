---
name: build
description: >-
  pi-flow · paperflow build. Claim next ready bd task, dispatch worker, verify, close; loop until phase empty.
pipeline: [goal, plan, build, review]
---

# build

Orchestrator: `lib/orchestrator.md` + `lib/paperflow-thresholds.md`.

**Tools:** `paperflow_beads` ready · `sync_todo` · `paperflow_active_goal`

Read this skill file when executing (`lib/lazy-skills.md`).

## Loop

```text
paperflow_beads({ action: "ready" })
→ pi-flow.bd-keeper: claim
→ worker (pi-subagent): one task, self-contained brief
→ reviewer if evidence >500 tokens
→ pi-flow.bd-keeper: close
→ paperflow_beads({ action: "sync_todo" }) after each close (session snapshot)
```

## Rules

- One work-task per **worker** dispatch
- Commits >30 LOC: `Subagent-Run: <task-id>`
- Phase empty → `/skill:review`
