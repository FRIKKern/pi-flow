# paperflow × pi-flow

**pi-flow** implements the same lifecycle as [FRIKKern/paperflow](https://github.com/FRIKKern/paperflow) inside Pi. We do not fork paperflow; we mirror its skills, agents, HTML contract, and Beads hierarchy.

## Skill mapping

| paperflow (Claude Code) | pi-flow (Pi) |
|-------------------------|--------------|
| `/paperflow:goal` | `/skill:goal` |
| `/paperflow:plan` | `/skill:plan` |
| `/paperflow:build` | `/skill:build` |
| `/paperflow:review` | `/skill:review` |
| `/paperflow:autopilot` | `/skill:autopilot` |
| `/paperflow:resume` | `/skill:resume` |
| `/paperflow:install` | paperflow `quickstart.sh` + `/pi-flow-setup` |

## Agent mapping

| paperflow | pi-flow |
|-----------|---------|
| `paperflow-doc-writer` | `pi-flow.doc-writer` |
| `paperflow-bd-keeper` | `pi-flow.bd-keeper` |
| `paperflow-researcher` | `pi-flow.researcher` |
| `paperflow-code-editor` | `pi-flow.worker` |
| `paperflow-cmux-verifier` | `pi-flow.cmux-verifier` + `paperflow_verify` tool |

## What stays in paperflow host only

- `paperflow-daemon` (:8767), `claude-bridge`, grill Submit → terminal
- cmux dock feeds, `paperflow-doc-verify`
- Claude Code hooks (`PostToolUse` auto-open)

Install host for full HTML UX; pi-flow skills still work without it (chat grill, local `docs/paperflow/`).

## Standards to copy

1. **Thresholds** — `lib/paperflow-thresholds.md` (from upstream `lib/shared-thresholds.md`)
2. **Paths** — `lib/paperflow-paths.md`
3. **HTML contract** — eyebrow/H1/Mermaid/`PAPERFLOW_GOAL_ID` — see paperflow `ARCHITECTURE.md`
4. **Beads hierarchy** — Goal epic → phases → work-tasks
5. **Grill mandatory** in plan/autopilot unless explicit skip

## Learning upstream

Read in order:

1. `README.md` — product loop
2. `ARCHITECTURE.md` — beads, bridge, hooks
3. `skills/plan/SKILL.md` — grill/revise
4. `skills/autopilot/SKILL.md` — chain
