---
name: build
description: >-
  pi-flow · paperflow build. Use for "build", "next step", "ship it", "execute the plan".
  Claims next bd ready task, dispatches worker subagent, verifies, closes; loops until phase empty.
---

# build (pi-flow)

Port av [paperflow build](https://github.com/FRIKKern/paperflow/blob/main/skills/build/SKILL.md).

**Pi tools:** `paperflow_beads` `ready` · `paperflow_active_goal` — mutations via `pi-flow.bd-keeper`.

## Loop

```text
paperflow_beads({ action: "ready" })
# → pi-flow.bd-keeper: bd update --claim
# → pi-flow.worker (one task)
# → pi-flow.bd-keeper: bd update --close
```

## Rules

- Include `lib/paperflow-thresholds.md` in orchestrator behavior
- Commits >30 LOC: trailer `Subagent-Run: <task-id>`
- One work-task per worker dispatch
- Phase empty → advance `.paperflow/active-phase` or `/skill:review`

## Agents

| Role | Agent |
|------|--------|
| Implement | `pi-flow.worker` |
| Large evidence | `pi-flow.reviewer` |
| bd | `pi-flow.bd-keeper` or orchestrator (exempt) |
