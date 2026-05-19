# Boss dispatch — run skills in the live Pi session

**Problem:** Cursor, shell scripts, and grill Submit are not Pi. They cannot call `subagent()` directly.

**Solution:** The paperflow daemon already routes text to registered boss sessions via `cmux send` (same path as grill **Submit**). pi-flow exposes that as **`paperflow_dispatch`**.

## Mental model

```text
Cursor / shell / grill HTML
        │
        ▼ POST /build  (or paperflow_dispatch)
 paperflow-daemon :8767
        │
        ▼ cmux send + Return
 Boss Pi (one session, same workspace)
        │
        ├── subagent({ agent: "reviewer", … })
        ├── subagent({ agent: "researcher", … })
        └── /pf-follow researcher
```

**Do not** `cmux new-workspace` for build/review. **Do** inject a line into the boss pane.

## Requirements

1. **Paperflow host** up (`paperflow_host ensure` or quickstart)
2. **Boss Pi** running in cmux with `session_start` (auto `registerPiFlowSession`)
3. Optional: filter by `CMUX_WORKSPACE_ID` when multiple workspaces exist

## From Pi (orchestrator tool)

```text
paperflow_dispatch({
  message: "/skill:review",
  workspace: "<CMUX_WORKSPACE_ID>"   // optional
})
```

## From shell (Cursor terminal, CI, scripts)

```bash
cd your-repo
scripts/pi-flow-dispatch.sh "/skill:review"
scripts/pi-flow-dispatch.sh --workspace "$CMUX_WORKSPACE_ID" "/skill:autopilot \"Browserbase integration\""
```

## From Cursor on this repo

You cannot run Pi tools here. Use:

```bash
/Volumes/SATECHI/github/pi-flow/scripts/pi-flow-dispatch.sh "/skill:review"
```

Pick workspace if needed:

```bash
curl -s http://localhost:8767/sessions/discover | jq '.sessions[:3]'
scripts/pi-flow-dispatch.sh --workspace "<uuid>" "/skill:review"
```

Then **`/pf-follow reviewer`** in cmux after the boss dispatches.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `no registered sessions` | Open Pi in cmux boss pane; wait for session_start |
| `session-gone` | Stale registry — restart Pi in that workspace |
| `doc register failed` | Host down or session id unknown |
| `dispatch-failed` | cmux surface died — refocus boss terminal |

See [CMUX.md](./CMUX.md) grill bridge · [SUBAGENTS-UX.md](./SUBAGENTS-UX.md).
