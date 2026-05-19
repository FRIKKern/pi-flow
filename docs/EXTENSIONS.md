# pi-flow extensions

pi-flow uses Pi’s [extension API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md) for **integration and guardrails**. Lifecycle playbooks stay in **skills**.

## Two extensions

| Extension | Role |
|-----------|------|
| **`pi-flow-setup`** | `/pi-flow-setup`, `/pi-flow-doctor`, `/pi-flow-cmux-layout`, agent install, settings merge |
| **`pi-flow-host`** | paperflow tools, session register, cmux skill discovery, active-goal injection |

Bundled third-party extensions (unchanged):

- `pi-subagents` — delegation
- `pi-mcp-adapter` — MCP panel
- `pi-cursor-provider` — optional Cursor models

## Tools (LLM-callable)

| Tool | Description |
|------|-------------|
| `paperflow_verify` | Wraps `paperflow-doc-verify` → `PASS\|WARN\|FAIL\|SKIP` line |
| `paperflow_cmux` | `detect` workspace or `open` URL in cmux browser |
| `paperflow_active_goal` | Read `.paperflow/active-goal` and `active-phase` |

All tools **fail open** when the host or cmux is missing (SKIP / error text, never block Pi startup).

## Events

| Event | Handler |
|-------|---------|
| `session_start` (host) | `POST /sessions/register` for grill bridge; cmux notify |
| `resources_discover` (host) | Adds `skills-cmux/` when cmux detected |
| `before_agent_start` (host) | Injects active goal/phase when pointers exist |

## Agents

pi-subagents reads:

- `.pi/agents/pi-flow/*.md` (symlinks on `/pi-flow-setup`)
- `~/.pi/agent/agents/pi-flow.*.md` (global copy fallback)

Agents use `package: pi-flow` in frontmatter → `pi-flow.doc-writer`, etc.

## What we deliberately do not extension-ize

- goal → plan → grill → build workflow (skills)
- HTML authoring (doc-writer agent)
- Beads mutations (bd-keeper agent)
- paperflow daemon / auto-open / grill.js (paperflow host)

## Development

```bash
pi -e /path/to/pi-flow
/reload   # after editing extension TS
```

Extensions load via jiti — no compile step required.
