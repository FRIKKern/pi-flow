---
name: goal
description: >-
  pi-flow · paperflow goal. Use when the user says "start a goal", "open a goal for X",
  "snapshot the goal", "archive the goal", "resume goal", or starts non-trivial multi-artifact work.
  Creates Beads epic + three phases, .paperflow pointers, Goal HTML.
---

# goal (pi-flow)

Pi-port av [paperflow goal](https://github.com/FRIKKern/paperflow/blob/main/skills/goal/SKILL.md). Orchestrator følger `lib/paperflow-thresholds.md`.

## Step 0 — Host (når paperflow er installert)

```bash
~/.local/bin/paperflow-preflight
~/.local/bin/paperflow-doctor --fast
```

Abort ved critical (exit 2). Pi-only uten host: hopp over, bruk `docs/paperflow/` fallback.

## Åpne Goal

1. **bd-keeper** (eller orchestrator inline): epic + `phase-pre-flight` / `phase-build` / `phase-review`
2. Pointers: `.paperflow/active-goal`, `.paperflow/active-phase` — eller kall **`paperflow_active_goal`**
3. **doc-writer**: `~/docs/paperflow/goals/<slug>/index.html` — se `lib/paperflow-paths.md`
4. **CMUX**: `cmux browser open` på :8767 URL når daemon kjører

## Sub-actions

| Action | Hva |
|--------|-----|
| snapshot | Refresh Goal HTML |
| resume | `bd list --type epic` → flip pointers |
| archive | `bd epic close` etter review |

## Agents

- `pi-flow.bd-keeper` — bd only
- `pi-flow.doc-writer` — HTML only
