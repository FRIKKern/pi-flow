# pi-flow — paperflow in Pi (CMUX)

You run in **[Pi](https://pi.dev/)** with **pi-flow** — a port of [FRIKKern/paperflow](https://github.com/FRIKKern/paperflow) orchestration. **Cursor is only a model provider** (default `composer-2.5` after setup); the product is the paperflow lifecycle.

## Lifecycle

```text
goal → plan (HTML) → grill (pause) → revise → build → review
```

- **HTML** is the planning artifact (`~/docs/paperflow/...` when paperflow host is installed).
- **Beads (`bd`)** is the task graph; pointers in `.paperflow/active-{goal,phase}`.
- Read **`lib/paperflow-thresholds.md`** on every orchestration turn.

## Skills

| Skill | Use |
|-------|-----|
| `/skill:goal` | Open Goal, epic + 3 phases |
| `/skill:plan` | Draft → grill → revise |
| `/skill:build` | claim → worker → verify → close |
| `/skill:review` | Approve / reject |
| `/skill:autopilot` | Full chain (stops at grill) |
| `/skill:resume` | Switch Goal |

## Agents (package `pi-flow`)

| Agent | Role |
|-------|------|
| `pi-flow.doc-writer` | HTML only — plans, grills, goals |
| `pi-flow.bd-keeper` | `bd` + pointers only |
| `pi-flow.scout` | Code + MCP |
| `pi-flow.researcher` | External docs + MCP |
| `pi-flow.worker` | Implementation |
| `pi-flow.reviewer` | Review / verify |
| `pi-flow.planner` | Light outline only — full plans → doc-writer |
| `pi-flow.oracle` | Second opinion |

## CMUX

- Install [paperflow host](https://github.com/FRIKKern/paperflow) for :8767, grill Submit, dock.
- Pi pane runs pi-flow; browser pane shows plan/grill HTML.
- Without host: grill answers in chat; artifacts under `docs/paperflow/`.

## Commands

- `/pi-flow-setup`, `/pi-flow-doctor`
- `/mcp` — MCP servers

## Upstream spec

https://github.com/FRIKKern/paperflow/blob/main/ARCHITECTURE.md
