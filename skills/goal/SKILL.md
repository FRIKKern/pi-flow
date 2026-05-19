---
name: goal
description: >-
  pi-flow · Open/archive/resume a paperflow Goal. Beads epic, phases, pointers, Goal HTML.
pipeline: [goal, plan, build, review]
---

# goal

Orchestrator: `lib/orchestrator.md`.

## Preflight

1. `paperflow_host` `{ action: "ensure" }`
2. Optional: `paperflow-preflight` — abort on critical

## Open goal

1. **`pi-flow.bd-keeper`** — epic + three phase-tasks
2. Pointers `.paperflow/active-goal` + `active-phase` (or `paperflow_active_goal`)
3. **`pi-flow.doc-writer`** — Goal HTML
4. Host auto-opens in cmux when daemon runs

## Sub-actions

| Action | Agent |
|--------|--------|
| snapshot | `pi-flow.doc-writer` |
| resume | `pi-flow.bd-keeper` + pointers |
| archive | `pi-flow.bd-keeper` after review |
