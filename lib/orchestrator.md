# pi-flow orchestrator policy

Single reference for the **boss (parent) Pi session** coordinating paperflow. Skills link here; subagents do not inherit this file unless briefed.

**Subagent-first:** the boss **always** delegates heavy work to pi-subagents. The human can **follow** any child chat (`/pf-follow`, `/pf-agents`) and **return** with `/pf-boss`. See `docs/SUBAGENTS-UX.md`.

## The stack (less is more)

| Layer | What |
|-------|------|
| **Skills** | `goal` → `plan` → `build` → `review` (+ `autopilot`, `resume`) |
| **pi-flow agents (3)** | `pi-flow.doc-writer` · `pi-flow.bd-keeper` · `pi-flow.cmux-verifier` |
| **pi-subagents builtins** | `scout` · `researcher` · `planner` · `worker` · `reviewer` · `oracle` |
| **Pi tools** | `paperflow_host` · `paperflow_verify` · `paperflow_beads` · `paperflow_cmux` · `paperflow_active_goal` |
| **Runtime** | Extension policy (block destructive shell/git, redact secrets) · streamed lifecycle rules |

Do not duplicate builtins as `pi-flow.worker` etc.

## Model roles (lifecycle phases)

Configured in `settings/defaults.json` under `piFlow.modelRoles` (merged into `~/.pi/agent/settings.json` on setup).

| Phase | Suggested model | Notes |
|-------|-----------------|-------|
| `goal` / `plan` | composer-2.5, high thinking | Architecture, grill, Beads graph |
| `build` | composer-2.5, medium | Worker subagents for code |
| `review` | composer-2.5; reviewer high | Ship gate |

View live hints: `/pi-flow-status`.

## Boss UX (pi-flow-subagents extension)

| Command | When |
|---------|------|
| `/pf-follow <agent>` | User (or you) wants the child’s live chat |
| `/pf-agents` | Pick from active/recent runs |
| `/pf-boss` | Back to orchestrator after following |
| `/pf-watch` | Nudge on each subagent start |
| `/pf-mirror` | Same session in cmux worker pane (`pif` layout) |

Tell the user `/pf-follow researcher` (etc.) when launching long scout/research/build runs.

## Subagents + MCP (see `lib/subagents-policy.md`)

| Agent | MCP | Writes |
|-------|-----|--------|
| `scout` · `researcher` | Yes (read / web) | No repo writes |
| `worker` | Optional read | One scoped task; prefer isolation |
| `reviewer` · `oracle` | Read-only | Verdict only |

Default isolation: `subagents.isolation.mode: worktree` in pi-flow settings (pi-subagents).

## When to dispatch whom

| Need | Dispatch |
|------|----------|
| HTML plan/grill/goal | `pi-flow.doc-writer` |
| bd create/claim/close/dep | `pi-flow.bd-keeper` |
| Doc render check | `paperflow_verify` or `pi-flow.cmux-verifier` |
| Implement work-task | `worker` (subagent) |
| Code review / >500 token evidence | `reviewer` (subagent) |
| Plan critique before build | `oracle` (subagent) |
| Implementation plan from context | `planner` (subagent) |
| Codebase recon | `scout` (subagent) |
| External docs / web | `researcher` (subagent, Browserbase MCP) |
| Public web app / SPA / login flow | Browserbase MCP — `/skill:browserbase` |
| paperflow HTML on :8767 | `paperflow_verify` / cmux — `/skill:cmux-browser` |

## Thresholds

See `lib/paperflow-thresholds.md`. Summary: >30 LOC code, >50 lines prose, >500 token evidence → subagent.

## Verify before done

Before closing a phase or telling the user "done":

1. `paperflow_verify` on latest plan/grill URL when host is up (or SKIP documented)
2. Build: reviewer one-liner on large evidence
3. `/pi-flow-doctor` or `/pi-flow-status` if anything failed unexpectedly

## Grill

Mandatory in plan/autopilot unless user passes `--skip-grill`. Wait for browser Submit or structured chat answers — do not skip silently.

Streamed rules may inject a one-shot reminder if the model tries to skip grill.

## Long sessions

`/pi-flow-handoff [focus]` — new Pi session with active goal + `bd ready` snapshot.
