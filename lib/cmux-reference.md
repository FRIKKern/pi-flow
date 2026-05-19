# CMUX reference (pi-flow)

Condensed from [manaflow-ai/cmux](https://github.com/manaflow-ai/cmux) skills + [paperflow](https://github.com/FRIKKern/paperflow) cmux integration.

## Topology

```text
Window → Workspace → Pane → Surface (terminal | browser)
```

## Environment (injected in cmux terminal surfaces)

| Variable | Use |
|----------|-----|
| `CMUX_WORKSPACE_ID` | UUID — paperflow sidecars, session register |
| `CMUX_SURFACE_ID` | UUID — `cmux send` target |
| `CMUX_SOCKET_PATH` | Override socket |

```bash
cmux identify --json
cmux tree --workspace "$CMUX_WORKSPACE_ID"
```

## paperflow + cmux (three layers)

1. **auto-open** — PostToolUse on `~/docs/paperflow/**/*.html` → cmux browser `goto` (sidecar `~/.paperflow/cmux-docs-surface.<workspace-uuid>.handle`)
2. **doc-verify** — `paperflow-doc-verify <url>` → PASS/WARN/FAIL/SKIP
3. **bridge** — grill Submit → POST :8767/build → `cmux send` to registered surface

## pi-flow session register

```bash
~/.local/bin/pi-flow-session-register   # or via Pi session_start hook
# POST localhost:8767/sessions/register { session_id, cmux_workspace, cmux_surface, agent: pi-flow }
```

## Browser (docs surface)

```bash
cmux browser open "http://localhost:8767/paperflow/plans/foo.html"
cmux browser surface:N goto <url>
cmux browser surface:N wait --load-state complete --timeout-ms 5000
cmux browser surface:N wait --selector "pre.mermaid svg" --timeout-ms 3000
cmux browser surface:N errors list
cmux browser surface:N get text --selector h1
cmux browser surface:N screenshot --out /tmp/doc.png
```

**Rule:** verifier must not spawn docs surface — only auto-open hook spawns.

## Orchestrator → Pi pane

```bash
cmux send "Grill answers for plan: ..."
cmux send-key Return
```

## Detect

```bash
paperflow-cmux-detect   # exit 0 = ready (needs CMUX_WORKSPACE_ID + cmux binary)
```

## Dock

`~/.config/cmux/dock.json` — paperflow install adds feeds (goal-path, bd-ready, auto-open log, doctor).

## Shortcuts

| Action | Default |
|--------|---------|
| Toggle Dock | ⌥⌘B |
| New workspace | (see cmux settings) |

## Not supported in WKWebView browser

viewport/offline emulation, network mocking, trace/screencast — use external Chrome MCP for that if needed.
