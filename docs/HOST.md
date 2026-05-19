# Paperflow host vs pi-flow

## Principle

**pi-flow does not embed `paperflow-daemon`.** The daemon is a separate, battle-tested host installed by [paperflow](https://github.com/FRIKKern/paperflow) `install.sh` / LaunchAgent / cmux spawn.

Pi-flow **integrates** via:

| Mechanism | Purpose |
|-----------|---------|
| `paperflow_host` tool | `status` / `ensure` — health check, spawn via `paperflow-daemon-spawn` or launchd |
| `POST /sessions/register` | Grill Submit → Pi pane (session_start) |
| `paperflow_verify` | Wraps `paperflow-doc-verify` |
| Skills + agents | Lifecycle orchestration |

## Why not embed the daemon in a Pi extension?

| Reason | Detail |
|--------|--------|
| **Scope** | Daemon serves static HTML, WebSocket live-reload, registry, grill bridge, simplify API — not a few hundred lines |
| **Supervision** | paperflow uses LaunchAgent or cmux workspace supervisor — Pi sessions restart often |
| **Security** | Extensions run with full user permissions; a persistent HTTP server in every Pi session multiplies attack surface |
| **Pi best practice** | Ephemeral localhost servers only (see pi-web-access curator pattern), torn down on `session_shutdown` |
| **Single port** | `:8767` must be host-scoped — multiple Pi panes share one daemon |

## What `paperflow_host ensure` does

1. `GET http://localhost:8767/health`
2. If down: `~/.local/bin/paperflow-daemon-spawn` (cmux path)
3. Else: `launchctl kickstart` on `*paperflow-daemon*` plist (macOS non-cmux)
4. Never reimplements daemon logic

## Degraded mode (no host)

| Feature | Without host |
|---------|----------------|
| HTML plans/grills | `docs/paperflow/` or `~/docs/paperflow/` files only |
| Grill | Answers in Pi chat |
| Verify | `paperflow_verify` → SKIP |
| Auto-open | Manual browser / cmux open |
| Dock feeds | Unavailable |

Run:

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash
```

Or `/pi-flow-setup` which calls `ensure` once.

## Claude Code hooks stay in paperflow

`PostToolUse` auto-open and `inject-principles` are **Claude Code hooks**, not Pi extensions. pi-flow does not copy them — it uses Pi tools + cmux browser instead.
