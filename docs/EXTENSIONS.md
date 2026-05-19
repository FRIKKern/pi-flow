# pi-flow extensions

## Architecture

```text
pi-flow-setup     settings, agents, /pi-flow-setup, live doctor
pi-flow-host      tools, session register, cmux skills, goal injection
extensions/shared paperflow-client, host-manager, beads, doctor
```

Bundled: `pi-subagents`, `pi-mcp-adapter`, optional `pi-cursor-provider`.

## Tools

| Tool | Wraps / behavior |
|------|------------------|
| `paperflow_host` | External daemon — `status` \| `ensure` ([HOST.md](./HOST.md)) |
| `paperflow_verify` | `paperflow-doc-verify` |
| `paperflow_cmux` | detect \| browser open |
| `paperflow_active_goal` | `.paperflow/active-*` |
| `paperflow_beads` | `bd ready` \| `show` \| `init` — mutations → bd-keeper |

## Events

| Event | Extension |
|-------|-----------|
| `session_start` | setup: agents · host: register + host check |
| `resources_discover` | host: `skills-cmux/` when cmux |
| `before_agent_start` | host: active goal snippet |
| `appendEntry` | host: `pi-flow-workflow` restore |

## Not in extensions

Lifecycle prose → skills. HTML → doc-writer. bd mutations → bd-keeper. Daemon code → paperflow host.

See [BEST-PRACTICES.md](./BEST-PRACTICES.md).
