# pi-flow best practices

Adopted patterns from [oh-my-pi](https://github.com/can1357/oh-my-pi) (OMP), scoped to paperflow — not a feature dump.

## The stack (final)

```text
Skills (6)     goal · plan · build · review · autopilot · resume
Router         pi-flow
CMUX skills    cmux · cmux-browser (when detected)
pi-flow agents doc-writer · bd-keeper · cmux-verifier · chronicler  (4 only)
Subagents      worker · reviewer · oracle · planner · scout · researcher
Host           paperflow-daemon :8767 (external)
Runtime        policy hooks · streamed rules · /pi-flow-status
```

We deliberately **do not** ship 10+ custom agents like OMC or 15 meta-skills like Superpowers.

## OMP patterns we implemented

| Pattern | pi-flow surface |
|---------|-----------------|
| Extension `tool_call` / `tool_result` policy | `extensions/shared/policy.ts` · `pi-flow-host` |
| Streamed lifecycle rules (TTSR-inspired) | `rules/streamed-rules.json` · `agent_end` in host |
| Model roles per phase | `settings/defaults.json` → `piFlow.modelRoles` |
| Lazy skills | `lib/lazy-skills.md` · router skill |
| Unified status dashboard | `/pi-flow-status` |
| Session handoff | `/pi-flow-handoff` |
| Durable session memory | `.pi-flow/memory/` · `/pf-chronicler` · `/skill:memory` |
| Subagent isolation + MCP matrix | `lib/subagents-policy.md` · `subagents.isolation` |
| Boss/follow/mirror UX | `docs/SUBAGENTS-UX.md` · `/pf-*` commands |
| Beads ↔ session sync | `paperflow_beads` `sync_todo` |
| Hashline + LSP | `docs/EDITING.md` (use OMP-capable runtime) |

## Orchestrator

Read `lib/orchestrator.md` before coordinating. Read `lib/paperflow-thresholds.md` before writing code or HTML inline.

## Commands

| Command | Purpose |
|---------|---------|
| `/pi-flow-setup` | Install settings, agents, deps, host |
| `/pi-flow-status` | Doctor + policy + skills + model roles |
| `/pi-flow-doctor` | Health checks only |
| `/pi-flow-handoff [focus]` | New session with goal context |
| `/pi-flow-update` | Package + deps refresh |

## Install

One command: `scripts/quickstart.sh` — Pi, bd, jq, pi-flow, paperflow host.

Update: `scripts/update.sh` or `/pi-flow-update` inside Pi.

## Custom streamed rules

Copy and edit:

```text
.pi-flow/streamed-rules.json
```

Same schema as bundled `rules/streamed-rules.json`.

## Policy override (dangerous)

```bash
export PI_FLOW_ALLOW_DESTRUCTIVE=1
```

Allows destructive git/shell that pi-flow normally blocks. Use only with explicit user approval.
