# pi-flow extensions

**Production pins & browserstorm synthesis:** [PI-EXTENSIONS.md](./PI-EXTENSIONS.md)

## Architecture

```text
pi-flow-setup     settings, agents, subagent config, /pi-flow-setup, live doctor
pi-flow-host      tools, session register, cmux skills, goal injection
pi-flow-statusline goal/phase/task footer
pi-flow-progress  activity signals, LIVE/DEAD spinner, auto-rescue, /pf-activity · /pf-rescue
pi-flow-subagents boss/follow roster, /pf-* commands, cmux mirror
pi-flow-memory     session journal, named agents, /pf-recall · /pf-chronicler
pi-flow-sessions   auto title from first prompt · /pf-rename
extensions/shared paperflow-client, host-manager, beads, subagent-roster, session-memory
```

Bundled: `pi-subagents`, `pi-mcp-adapter`, optional `pi-cursor-provider`.

## Tools

| Tool | Wraps / behavior |
|------|------------------|
| `paperflow_host` | External daemon — `status` \| `ensure` ([HOST.md](./HOST.md)) |
| `paperflow_opencode` | OpenCode plugin + config + optional serve — `status` \| `ensure` ([OPENCODE.md](./OPENCODE.md)) |
| `paperflow_verify` | `paperflow-doc-verify` |
| `paperflow_cmux` | detect \| browser open |
| `paperflow_active_goal` | `.paperflow/active-*` |
| `paperflow_beads` | `bd ready` \| `show` \| `init` — mutations → bd-keeper |

## Events

| Event | Extension |
|-------|-----------|
| `session_start` | setup: agents · host: register · subagents: roster · memory: journal |
| `message_end` | sessions: auto-name · memory: journal |
| `turn_end` · `tool_execution_*` | memory: journal · subagents: roster |
| `subagent:async-*` | subagents: roster updates |
| `resources_discover` | host: `skills-cmux/` when cmux |
| `before_agent_start` | host: goal · memory: recall block |
| `appendEntry` | host: `pi-flow-workflow` restore |

## Not in extensions

Lifecycle prose → skills. HTML → doc-writer. bd mutations → bd-keeper. Daemon code → paperflow host.

See [BEST-PRACTICES.md](./BEST-PRACTICES.md).
