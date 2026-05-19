# OpenCode — zero-touch integration

pi-flow wires OpenCode to the same **paperflow host** and **cmux** stack as Pi, without manual `opencode.json` edits or grill registration.

## What runs automatically

| When | What happens |
|------|----------------|
| **Pi `session_start`** | `ensurePaperflowHost()` · `registerPiFlowSession()` · merge OpenCode config + install paperflow plugin |
| **OpenCode `session.created`** | Plugin POSTs to `localhost:8767/sessions/register` (`agent: opencode`) |
| **`/pi-flow-setup`** | Full ensure: host, OpenCode plugin, optional `cmux hooks opencode install`, optional serve |

No user action required for Pi sessions in cmux beyond having pi-flow installed.

## OpenCode plugin

Installed to `~/.config/opencode/plugins/pi-flow-paperflow.js` (refreshed on Pi session start).

`opencode.json` gains:

```json
{
  "plugin": ["opencode-cmux", "./plugins/pi-flow-paperflow.js"]
}
```

Existing plugins are preserved.

## Optional: headless serve

Released OpenCode uses **`opencode serve --port N`**, not `dev`.

```bash
export PI_FLOW_OPENCODE_SERVE=1   # or auto
export OPENCODE_PORT=4096         # cmux default; avoid hardcoding 3338
```

`/pi-flow-setup` starts serve when OpenCode is on PATH and port env is set.

Logs: `~/.paperflow/logs/pi-flow-opencode-serve.log`

## Tool

```text
paperflow_opencode action=ensure
paperflow_opencode action=status
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Grill Submit silent in OpenCode pane | `paperflow_host ensure` · restart OpenCode session (plugin registers on `session.created`) |
| cmux sidebar not updating | Update cmux app; run `cmux hooks opencode install` when CLI supports `hooks` |
| Stale web UI after source build | Set `PI_FLOW_OPENCODE_SERVE=1` and re-run `/pi-flow-setup` (restarts serve) |

See [HOST.md](./HOST.md) · [CMUX.md](./CMUX.md).
