# Subagents UX - pi-flow as a subagent-first orchestrator

pi-flow's goal is to be the **best subagent tool**: the **boss** session orchestrates; **workers** do the digging, writing, and implementation. You stay in control of *whose chat* you are reading.

## Mental model

```text
┌─ Boss (orchestrator) ─────────────────────────────────────┐
│  You talk here. Dispatches subagent({ ... }) for all heavy work. │
│  /pf-boss always returns here.                                │
└───────────────────────────┬─────────────────────────────────┘
                            │ delegates
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   researcher            scout               worker
   (web/MCP)          (repo map)         (one bd task)
```

| Role | Session | What you see |
|------|---------|----------------|
| **Boss** | Parent Pi session | Plans, merges, grill, bd pointers - never 500-line diffs inline |
| **Subagent** | Child `.jsonl` under parent session dir | Full tool stream, reasoning, artifacts |

## Commands (in Pi)

| Command | Action |
|---------|--------|
| `/pf-agents` | Picker - choose which subagent chat to **follow** |
| `/pf-follow [agent]` | Switch view to that child session (live chat) |
| `/pf-boss` | Return to orchestrator session |
| `/pf-watch` | Nudge on each subagent start ("/pf-follow to watch") |
| `/pf-stack` | Interactive stack picker (↑↓ Enter) — also enables ↓↑ cycling |
| `/pf-mirror [agent] [0-3]` | Open same session in a **cmux worker** pane (`pif` layout) |
| `/pf-storm [N] [agent] task` | **Agentstorm** — parallel burst (default **20** agents) |
| `/pf-memory` | Session memory status (`.pi-flow/memory/`) |
| `/pf-name <slug> [agent]` | Name/bind agent — dedicated `MEMORY.md` |
| `/pf-recall [slug]` | Print recall (auto-injected on boss turns) |
| `/pf-note [slug] text` | Manual journal note |
| `/pf-chronicler [focus]` | Compress journal → `SUMMARY.md` |
| `/pf-rename <title>` | Rename **this Pi session** (auto-titled from first prompt) |

### Keyboard (empty prompt)

| Input | Action |
|-------|--------|
| **↓** / **↑** | Cycle boss ↔ subagent sessions (after `/pf-stack` once) |
| **Ctrl+Shift+]** / **[** | Next / previous in stack |

While following a subagent, the status line shows `follow:researcher` (extension `pi-flow-subagents`). The widget lists active runs.

## Driving the boss from outside Pi

Cursor and shell cannot call `subagent()`. Use the **grill bridge** into the live boss pane:

```bash
scripts/pi-flow-dispatch.sh "/skill:review"
# or in Pi: paperflow_dispatch({ message: "/skill:review" })
```

See [BOSS-DISPATCH.md](./BOSS-DISPATCH.md). Then `/pf-follow reviewer` in cmux.

## cmux boss layout (`pif`)

```bash
pif --cwd ~/my-repo --name my-goal
```

| Pane | Role |
|------|------|
| Top-left (large) | **Boss** - Pi orchestrator |
| Workers A-D | Optional mirrors via `/pf-mirror` |
| Right | paperflow browser `:8767` |

Run Pi only in the **boss** pane for grill Submit and session register. Mirror workers when you want two chats visible at once.

## Orchestrator rules (non-negotiable)

Read `lib/orchestrator.md` and `lib/paperflow-thresholds.md`.

1. **Delegate by default** - scout/researcher/planner/worker/reviewer/oracle for anything over thresholds.
2. **Boss synthesizes** - one paragraph + verdict; paste subagent output only when the user asked for verbatim evidence.
3. **One worker = one bd task** - parallel workers for parallel `bd ready`.
4. **Follow the work** - tell the user `/pf-follow <agent>` when a long research or build run starts.
5. **Ctrl+O** on an in-flight `subagent` tool expands the streaming summary without leaving boss.

## pi-subagents integration

Setup writes `~/.pi/agent/extensions/subagent/config.json`:

- `intercomBridge.mode: always` - children can ping the boss when blocked
- `control.enabled` - long-running / needs-attention notices
- `maxSubagentDepth: 1` - matches paperflow thresholds

Install **pi-intercom** for live child→boss messages during runs (`/pi-flow-setup` does not require it; recommended).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/pf-follow` says no session file | Wait until the subagent persists a session, or expand the tool (Ctrl+O) |
| Lost boss session | `/pf-boss` or resume boss `.jsonl` from `~/.pi/agent/sessions/` |
| cmux mirror failed | Run `pif` layout; need `CMUX_WORKSPACE_ID` |
| Boss does inline code | Streamed rule + thresholds - dispatch `worker` |

See also: [lib/subagents-policy.md](../lib/subagents-policy.md) · [BEST-PRACTICES.md](./BEST-PRACTICES.md)
