# pi-flow — paperflow in CMUX

Pi-distribusjon for **[cmux](https://github.com/manaflow-ai/cmux)** + **[paperflow](https://github.com/FRIKKern/paperflow)**. **Cursor/Composer 2.5** er valgfri standardmodell — ikke produktnavnet.

## CMUX is the runtime (read first)

```text
Terminal surface [Pi]  +  Browser surface [:8767/paperflow/]  +  Dock feeds
```

| Doc | Content |
|-----|---------|
| **`docs/CMUX.md`** | Full CMUX expert reference |
| `lib/cmux-reference.md` | Cheat sheet |
| `/skill:cmux` | Orchestrator CMUX playbook |
| `/skill:cmux-browser` | Doc verify + browser automation |

**Session start:** `pi-flow-host` registers with paperflow-daemon so grill **Submit** → `cmux send` → Pi pane.

**Tools:** `paperflow_verify` · `paperflow_cmux` · `paperflow_active_goal`

**Outside cmux:** degraded mode (chat grill, SKIP verify) — still works, not target experience.

## Lifecycle (paperflow)

```text
/skill:goal → /skill:plan → grill pause → revise → /skill:build → /skill:review
```

- HTML artifacts: `~/docs/paperflow/…`
- Beads + `.paperflow/active-{goal,phase}`
- `lib/paperflow-thresholds.md`

## Skills

| Skill | Role |
|-------|------|
| `goal` `plan` `build` `review` `autopilot` `resume` | paperflow lifecycle |
| `cmux` `cmux-browser` | CMUX layout, verify, bridge (auto-loaded in cmux) |
| `pi-flow` | Overview |

## Agents (`pi-flow.*`)

| Agent | Role |
|-------|------|
| `doc-writer` | HTML plans/grills |
| `bd-keeper` | Beads only |
| `cmux-verifier` | `paperflow-doc-verify` one-liner |
| `cmux-advisor` | CMUX debug (read-only) |
| `scout` `researcher` | MCP research |
| `worker` `reviewer` `oracle` | build / review |

## Commands

- `/pi-flow-setup` `/pi-flow-doctor` `/pi-flow-cmux-layout`
- `/mcp` — MCP panel

## Upstream

https://github.com/FRIKKern/paperflow/blob/main/ARCHITECTURE.md
