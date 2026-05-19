# pi-flow — paperflow in CMUX

**Simple stack:** 6 lifecycle skills · **3 pi-flow agents** · pi-subagents builtins · external paperflow host.

## Lifecycle

```text
/skill:goal → /skill:plan → grill → revise → /skill:build → /skill:review
```

Or `/skill:autopilot "vision"`. Router: `/skill:pi-flow` · policy: `lib/orchestrator.md`.

## Agents

| pi-flow only (3) | Role |
|------------------|------|
| `pi-flow.doc-writer` | HTML artifacts |
| `pi-flow.bd-keeper` | Beads + pointers |
| `pi-flow.cmux-verifier` | One-shot doc verify |

| pi-subagents (builtins) | Role |
|-------------------------|------|
| `worker` | Implement |
| `reviewer` | Review |
| `oracle` | Second opinion |
| `planner` | Implementation plan |
| `scout` · `researcher` | Recon · web/MCP |

## Tools

`paperflow_host` · `paperflow_verify` · `paperflow_beads` · `paperflow_cmux` · `paperflow_active_goal`

**Browser:** cmux → `:8767` paperflow · Browserbase MCP → external web (`/skill:browserbase`)

## Install / update

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/update.sh | bash
```

In Pi: `/pi-flow-setup` · `/pi-flow-status` · `/pi-flow-handoff` · `/pi-flow-update`

## Docs

`docs/CMUX.md` · `docs/BROWSERBASE.md` · `docs/BEST-PRACTICES.md` · `docs/EDITING.md` · `docs/BEADS.md` · `docs/HOST.md`
