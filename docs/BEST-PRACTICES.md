# pi-flow best practices

How pi-flow maps Pi ecosystem patterns to paperflow — and what we **do not** copy from Claude Code installs.

## Layer model

```text
Extension (TS)     → wires, tools, host ensure, session register
Skills (SKILL.md)  → goal → plan → grill → build → review playbooks
Agents (*.md)      → doc-writer, bd-keeper, worker, … (pi-subagents)
paperflow host     → daemon :8767, HTML, grill bridge (external install)
```

## Do

| Practice | pi-flow |
|----------|---------|
| **Few focused tools** | `paperflow_host`, `paperflow_verify`, `paperflow_beads`, `paperflow_cmux`, `paperflow_active_goal` |
| **Skills for workflow** | Lifecycle stays markdown — easy to diff and grill |
| **Subagents for scope** | >30 LOC / >50 prose → delegate per `lib/paperflow-thresholds.md` |
| **Project agents** | `.pi/agents/pi-flow/` symlinks on `/pi-flow-setup` |
| **Conditional skills** | `skills-cmux/` only when cmux detected |
| **Fail open** | Host/cmux missing → SKIP/warn, Pi keeps working |
| **Single settings source** | `settings/defaults.json` merged by setup |
| **Live doctor** | `/pi-flow-doctor` runs real checks, not static text |
| **External daemon** | `paperflow_host ensure` — see [HOST.md](./HOST.md) |

## Do not (paperflow anti-patterns in Pi)

| Avoid | Instead |
|-------|---------|
| Bash-heavy skills when a tool exists | Call `paperflow_verify`, not raw `paperflow-doc-verify` prose |
| Copy Claude Code hooks into Pi | Pi tools + cmux; hooks stay in paperflow install |
| Embed `paperflow-daemon` in extension | `paperflow_host` delegates to spawn/launchd |
| Global agent copy only | Prefer `.pi/agents/pi-flow/` symlinks |
| Duplicate defaults in TS + JSON | Only `settings/defaults.json` |
| `pf` CLI in Pi skills | `/skill:goal` etc. |
| Manual `cmux browser open` after every write | Trust auto-open when host is up |
| Reimplement grill Submit in TUI | Browser grill + daemon bridge |
| 15 micro-extensions | Two: `pi-flow-setup` + `pi-flow-host` |

## Tool cheat sheet (orchestrator)

```text
paperflow_host({ action: "ensure" })     # before plan/grill in cmux
paperflow_active_goal()                  # pointers
paperflow_verify({ url, kind: "plan" })  # after doc-writer
paperflow_beads({ action: "ready" })     # before build loop
paperflow_cmux({ action: "detect" })     # am I in cmux?
```

Mutating `bd create/close/claim` → **`pi-flow.bd-keeper`** subagent only.

## Bundled Pi packages

| Package | Role |
|---------|------|
| `pi-subagents` | Delegation — do not wrap with custom spawn |
| `pi-mcp-adapter` | MCP for scout/researcher |
| `pi-cursor-provider` | **Optional** — Composer 2.5 default |

## Session state

`pi.appendEntry("pi-flow-workflow", …)` stores last-known goal/phase for restore on reload. Source of truth remains Beads + `.paperflow/active-*` files.

## Upstream

When paperflow changes, update:

1. `lib/paperflow-thresholds.md` (from `shared-thresholds.md`)
2. Skills if phase semantics change
3. `paperflow_host` spawn paths if install layout changes

Do not fork daemon code into pi-flow.
