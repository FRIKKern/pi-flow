---
name: plan
description: >-
  pi-flow · paperflow plan. Draft → grill (mandatory pause) → revise; Beads work-tasks.
  HTML under ~/docs/paperflow/plans/.
pipeline: [goal, plan, build, review]
---

# plan

Orchestrator follows `lib/orchestrator.md` + `lib/paperflow-thresholds.md`.

**Tools:** `paperflow_active_goal` · `paperflow_host ensure` · `paperflow_verify`

## Flow

Questionnaire (optional) → **Draft** → **Grill** (stop) → **Revise**

### Draft

1. `paperflow_active_goal` or read `.paperflow/active-*`
2. **`pi-flow.doc-writer`** → plan HTML (`lib/paperflow-paths.md`)
3. **`pi-flow.bd-keeper`** → `bd create` + deps + `file-claim:` labels
4. **`researcher`** (subagent) if external docs needed before draft
5. **`paperflow_verify`** on plan URL — FAIL blocks grill

### Grill (mandatory)

1. **`researcher`** + **`pi-flow.doc-writer`** → grill HTML
2. **STOP** for answers (browser Submit or chat)
3. Skip only if user said `--skip-grill`

### Revise

1. **`pi-flow.doc-writer`** updates plan
2. **`pi-flow.bd-keeper`** syncs tasks
3. Hand off: `/skill:build`

Do not implement code in this skill.
