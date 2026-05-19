# pi-flow extensions

## Architecture

```text
pi-flow-setup     settings, agents, subagent config, /pi-flow-setup, live doctor
pi-flow-host      tools, session register, cmux skills, goal injection
pi-flow-subagents boss/follow roster, /pf-* commands, cmux mirror
pi-flow-statusline goal/phase/task footer
extensions/shared paperflow-client, host-manager, beads, subagent-roster
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
| `session_start` | setup: agents · host: register · subagents: roster |
| `tool_execution_*` | subagents: track runs, watch nudges |
| `subagent:async-*` | subagents: roster updates |
| `resources_discover` | host: `skills-cmux/` when cmux |
| `before_agent_start` | host: active goal snippet |
| `appendEntry` | host: `pi-flow-workflow` restore |

## Not in extensions

Lifecycle prose → skills. HTML → doc-writer. bd mutations → bd-keeper. Daemon code → paperflow host.

See [BEST-PRACTICES.md](./BEST-PRACTICES.md).
