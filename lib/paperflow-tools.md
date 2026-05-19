# Pi tools (orchestrator quick reference)

Prefer these over shell one-liners in skills.

| Tool | When |
|------|------|
| `paperflow_host` `ensure` | Session start / before plan in cmux |
| `paperflow_host` `status` | Doctor / debugging |
| `paperflow_active_goal` | Before plan, build, review |
| `paperflow_verify` | After doc-writer saves HTML |
| `paperflow_beads` `ready` | Build loop — next task |
| `paperflow_beads` `show` | Inspect one id |
| `paperflow_cmux` `detect` | Layout / debug |
| `paperflow_cmux` `open` | Manual browser only |

Subagents: `pi-flow.doc-writer`, `pi-flow.bd-keeper`, `pi-flow.worker`, `pi-flow.cmux-verifier`.
