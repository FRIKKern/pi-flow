---
name: cmux
description: >-
  CMUX expert mode for pi-flow. Layout, handles, paperflow doc routing, browser verify,
  grill bridge, Dock, session register. Use in cmux when setting up workspaces, debugging
  doc open/verify, or routing messages to the Pi pane.
---

# cmux (pi-flow)

pi-flow's **primary runtime is cmux**. Loaded automatically when cmux is detected.

## Step 0 — Am I in cmux?

Prefer the **`paperflow_cmux`** tool (`action: detect`) or:

```bash
paperflow-cmux-detect
```

| Result | Meaning |
|--------|---------|
| `cmux: true` | Full integration |
| not in cmux | Pi-only — chat grill, local `docs/paperflow/` |

## Session register (grill bridge)

On session start, **pi-flow-host** registers with paperflow-daemon (`POST :8767/sessions/register`). Grill **Submit** in browser → `cmux send` → this Pi pane.

## Recommended workspace

```bash
scripts/cmux-layout.sh "$(pwd)" "<goal-slug>"
```

Or `/pi-flow-cmux-layout` inside Pi.

## After doc-writer saves HTML

1. Rely on paperflow **auto-open** (do not spawn browser unless debugging)
2. Verify with **`paperflow_verify`** tool or subagent `pi-flow.cmux-verifier`
3. Branch PASS/SKIP/WARN/FAIL per `docs/CMUX.md`

## Pi tools (preferred over raw shell)

| Tool | Use |
|------|-----|
| `paperflow_verify` | `url` + optional `kind` → PASS/WARN/FAIL/SKIP line |
| `paperflow_cmux` | `detect` or `open` + `url` |
| `paperflow_active_goal` | Read `.paperflow/active-*` pointers |

## Deep reference

- `docs/CMUX.md` · `lib/cmux-reference.md`
- `/skill:cmux-browser` — interactive browser flows
- `/pi-flow-doctor` — read-only debug
