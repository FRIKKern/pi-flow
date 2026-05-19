---
name: pi-flow
description: >-
  Overview of pi-flow — paperflow lifecycle in Pi (CMUX). Points to goal/plan/build/review skills
  and pi-flow agents. Use when unsure which skill to invoke.
---

# pi-flow

**pi-flow** brings [paperflow](https://github.com/FRIKKern/paperflow) to [Pi](https://pi.dev/) — primarily in **cmux**.

## Lifecycle (same mental model as paperflow)

```text
/skill:goal → /skill:plan → grill pause → revise → /skill:build → /skill:review
```

Or: `/skill:autopilot "<vision>"`

## CMUX (read `docs/CMUX.md`)

When cmux is detected, pi-flow loads `/skill:cmux` and `/skill:cmux-browser` automatically.

| Tool | Purpose |
|------|---------|
| `paperflow_verify` | Doc render check (PASS/WARN/FAIL/SKIP) |
| `paperflow_cmux` | Detect workspace or open URL in browser |
| `paperflow_active_goal` | Read `.paperflow/active-*` pointers |

Commands: `/pi-flow-setup` · `/pi-flow-doctor` · `/pi-flow-cmux-layout`

## Paperflow standards we follow

- HTML plans/grills under `~/docs/paperflow/` (when host installed)
- Beads (`bd`) as persistent task graph; `.paperflow/active-*` pointers
- `lib/paperflow-thresholds.md` — orchestrator delegates >30 LOC / >50 prose / >500 token evidence
- Subagents: `pi-flow.doc-writer`, `pi-flow.bd-keeper`, `pi-flow.worker`, …

## Model

**pi-flow is model-agnostic.** Team default after `/pi-flow-setup` is `composer-2.5` via Cursor provider (`/login cursor`). Change anytime with `/model` or another provider in `models.json`.

## MCP

`scout` / `researcher` use `mcp:` in agent frontmatter — required for analysis/grill prep.

## Commands

- `/pi-flow-setup` — install defaults + sync agents
- `/pi-flow-doctor` — pi-flow + cmux + paperflow checklist
- `/pi-flow-cmux-layout` — print cmux workspace command
