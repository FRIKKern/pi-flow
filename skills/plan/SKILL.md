---
name: plan
description: >-
  pi-flow · paperflow plan. Use for "plan X", "draft a plan", "grill this plan",
  "revise the plan after grill", "simplify this doc". Draft → grill (mandatory pause) → revise;
  materialise Beads work-tasks. HTML under ~/docs/paperflow/plans/.
---

# plan (pi-flow)

Port av [paperflow plan](https://github.com/FRIKKern/paperflow/blob/main/skills/plan/SKILL.md).

**Pi tools first:** `paperflow_active_goal` · `paperflow_host ensure` · `paperflow_verify` — see `lib/paperflow-tools.md`.

## Process

**Questionnaire** (optional, unclear scope) → **Draft** → **Grill** (pause) → **Revise**

Questionnaire og grill på samme plan — ikke begge.

### Phase A — Draft

1. Read `.paperflow/active-goal` + active phase (`bd show`)
2. **doc-writer** → `~/docs/paperflow/plans/<YYYY-MM-DD>-<slug>.html`
   - Eyebrow → H1 → byline → ingress → H2 + Mermaid
   - `window.PAPERFLOW_GOAL_ID` required
3. Orchestrator: `bd create` + `bd dep add` per step; `file-claim:` labels when paths known
4. **researcher** (+ MCP) før draft hvis ekstern docs trengs
5. **CMUX:** kall **`paperflow_verify`** med plan-URL (eller `pi-flow.cmux-verifier`). PASS/SKIP → continue; FAIL → debug før grill

### Phase B — Grill (mandatory)

1. **researcher** → questions; **doc-writer** → `~/docs/paperflow/grills/<date>-<slug>-grill.html`
2. **STOP** until answers:
   - With paperflow host: Submit in browser → `Grill answers for <plan>:`
   - Pi-only: user answers in chat, structured
3. Skip only on explicit "skip grill"

### Phase C — Revise

1. **doc-writer** updates plan HTML
2. **bd-keeper** syncs work-tasks
3. Offer: re-grill | `/skill:build` | stop

## Handoff

Etter revise: `/skill:build` — ikke implementer i plan-skill.
