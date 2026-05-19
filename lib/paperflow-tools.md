# Pi tools (orchestrator)

| Tool | When |
|------|------|
| `paperflow_host` `ensure` | Start of session / plan |
| `paperflow_active_goal` `read` / `set` | Before plan, build, review; pointer updates |
| `paperflow_verify` | After doc-writer |
| `paperflow_beads` `ready` | Build loop |
| `paperflow_beads` `sync_todo` | Snapshot bd ready into session (Beads ↔ session sync) |
| `paperflow_cmux` `detect` | Debug layout |

**Commands:** `/pi-flow-status` · `/pi-flow-handoff` · `/pi-flow-doctor` · `/pi-flow-browserbase-setup`

**Browser (external web):** Browserbase MCP — `mcp({ server: "browserbase" })` · `/skill:browserbase` · `docs/BROWSERBASE.md`

Agents: see `lib/orchestrator.md` · subagents: `lib/subagents-policy.md`.
