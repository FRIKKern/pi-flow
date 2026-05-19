---
name: build
description: >-
  pi-flow · paperflow build. Use for "build", "next step", "ship it", "execute the plan".
  Claims next bd ready task, dispatches worker subagent, verifies, closes; loops until phase empty.
---

# build (pi-flow)

Port av [paperflow build](https://github.com/FRIKKern/paperflow/blob/main/skills/build/SKILL.md).

## Loop

```bash
bd ready --label goal-<slug> --label phase-<active>
bd update <id> --claim
# → pi-flow.worker (one task, self-contained brief)
# → verify (inline or pi-flow.reviewer if >500 token evidence)
bd update <id> --close
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
