# pi-flow `package.json` → `pi.extensions` — Catalog (Browserstorm 5/20)

**Repository:** [FRIKKern/pi-flow](https://github.com/FRIKKern/pi-flow)  
**Source:** `package.json` → `pi.extensions`, `pi.skills`, `pi.prompts`, `dependencies`, `package-lock.json`  
**pi-flow version:** `0.9.1`

---

## Summary

pi-flow ships **10 Pi extensions** in a fixed load order: **seven first-party** modules under `extensions/` (paperflow lifecycle, host tools, UX) plus **three bundled npm packages** (`pi-cursor-provider`, `pi-mcp-adapter`, `pi-subagents`). First-party code types against `@earendil-works/pi-coding-agent`; several extensions **no-op in subagent child sessions** (`PI_SUBAGENT_CHILD`) to avoid roster/status crashes during agentstorms.

Install: `pi install git:github.com/FRIKKern/pi-flow`. `postinstall` runs `patch-cursor-provider.mjs` and `verify-bundled-deps.mjs`.

> **Not an extension:** `extensions/pi-flow-core/` is an empty placeholder — **not** in `pi.extensions`.

---

## Extension load order

Declared in `package.json` → `pi.extensions` (order matters for hook registration; setup runs before host/progress):

| # | Path | Origin | Role (one line) |
|---|------|--------|-----------------|
| 1 | `./extensions/pi-flow-setup/index.ts` | pi-flow | Install, settings, doctor, handoff, Browserbase setup |
| 2 | `./extensions/pi-flow-host/index.ts` | pi-flow | Paperflow host, policy, lifecycle tools, cmux/OpenCode |
| 3 | `./extensions/pi-flow-statusline/index.ts` | pi-flow | Dynamic status line (goal, host, beads, cmux) |
| 4 | `./extensions/pi-flow-progress/index.ts` | pi-flow | Stall detection + auto-rescue |
| 5 | `./extensions/pi-flow-subagents/index.ts` | pi-flow | Boss/follow roster, agent stack, `/pf-storm` |
| 6 | `./extensions/pi-flow-memory/index.ts` | pi-flow | Session journal + recall injection |
| 7 | `./extensions/pi-flow-sessions/index.ts` | pi-flow | Auto-continue, auto-name, `/pf-rename` |
| 8 | `node_modules/pi-cursor-provider/index.ts` | npm | Cursor OAuth + local OpenAI-compatible proxy |
| 9 | `node_modules/pi-mcp-adapter/index.ts` | npm | MCP proxy tool + lazy server lifecycle |
| 10 | `node_modules/pi-subagents/src/extension/index.ts` | npm | `subagent` tool, chains, parallel, async |

Also bundled (not extensions):

| Field | Paths |
|-------|--------|
| `pi.skills` | `./skills`, `node_modules/pi-subagents/skills` (+ `skills-cmux` via host `resources_discover` in cmux) |
| `pi.prompts` | `./prompts`, `node_modules/pi-subagents/prompts` |

---

## Bundled dependency versions

| Package | `package.json` pin | `package-lock.json` | In `node_modules` | Role in pi-flow |
|---------|-------------------|---------------------|-------------------|-----------------|
| **pi-flow** | — (`0.9.1` root) | — | — | Pi package; extensions + skills |
| **@earendil-works/pi-coding-agent** | `^0.75.3` | **0.75.3** | Often via Pi CLI | Pi CLI + `ExtensionAPI`; not an extension entry |
| **pi-cursor-provider** | `^0.1.11` | **0.1.11** | **0.1.11** | Default provider `cursor` / `composer-2.5` |
| **pi-mcp-adapter** | `^2.6.1` | **2.6.1** | **2.6.1** | Browserbase + other MCP servers |
| **pi-subagents** | `^0.24.3` | **0.24.3** | **0.24.3** | Delegation; requires pi-coding-agent 0.75.x |
| **@beads/bd** | `^1.0.4` | **1.0.4** | `bin/bd.js` when installed | Beads (`bd ready`, etc.) |
| **typebox** | `^1.0.0` | **1.1.38** | **1.1.38** | Tool parameter schemas (host extension) |

**Transitive (pi-subagents):** `@earendil-works/pi-agent-core`, `@earendil-works/pi-tui` — not separate `pi.extensions` entries.

### postinstall / verify

| Script | Purpose |
|--------|---------|
| `scripts/patch-cursor-provider.mjs` | Inject `composer-2.5` / `composer-2.5-fast` into cursor fallback models + cost table |
| `scripts/verify-bundled-deps.mjs` | Warn if required paths missing: `pi-subagents`, `pi-mcp-adapter`, `@beads/bd`; optional `pi-cursor-provider` |

---

## First-party extensions (detail)

### 1. `pi-flow-setup`

| | |
|--|--|
| **Entry** | `extensions/pi-flow-setup/index.ts` |
| **Child sessions** | Skipped entirely (`isPiSubagentChildSession`) |

**Role:** One-time and on-demand **bootstrap** — merge `settings/defaults.json`, symlink agents into `~/.pi/agent/agents`, deps (`bd`, `jq`), paperflow host, OpenCode integration, Browserbase MCP merge.

**Hooks:** `session_start` — light agent install, Browserbase env, OpenCode config (no full browse install).

**Commands:**

| Command | Purpose |
|---------|---------|
| `/pi-flow-setup` | Full re-apply settings, agents, host, deps, Browserbase |
| `/pi-flow-doctor` | Live health checks |
| `/pi-flow-status` | Dashboard (doctor, policy, skills, extensions list) |
| `/pi-flow-handoff` | New session with active goal + `bd ready` context |
| `/pi-flow-dispatch` | Send line to boss session (grill bridge) |
| `/pi-flow-browserbase-setup` | Browse CLI + MCP + cloud verify |
| `/pi-flow-install-deps` | `bd`, `jq`, `bd init` |
| `/pi-flow-update` | npm/git update package + re-sync |
| `/pi-flow-cmux-layout` | Print `cmux-layout.sh` one-liner |

---

### 2. `pi-flow-host`

| | |
|--|--|
| **Entry** | `extensions/pi-flow-host/index.ts` |
| **Child sessions** | Runs (tools needed in workers) |

**Role:** **Runtime paperflow integration** — external host on `:8767`, active goal injection, destructive-tool policy (oh-my-pi style), streamed lifecycle rules, cmux skill discovery.

**Hooks:**

| Hook | Behavior |
|------|----------|
| `session_start` | Restore workflow state, ensure host, register session, OpenCode |
| `resources_discover` | Expose `skills-cmux/` when inside cmux |
| `before_agent_start` | Inject hidden active-goal message |
| `tool_call` / `tool_result` | Block destructive shell/git; redact secrets |
| `agent_end` | Fire streamed rules as follow-up |

**Tools:** `paperflow_host`, `paperflow_verify`, `paperflow_dispatch`, `paperflow_cmux`, `paperflow_active_goal`, `paperflow_beads`, `paperflow_opencode`, `paperflow_browse`

---

### 3. `pi-flow-statusline`

| | |
|--|--|
| **Entry** | `extensions/pi-flow-statusline/index.ts` |
| **Child sessions** | Skipped (deferred refresh crashed storms) |

**Role:** Pi **status bar** key `pi-flow` — goal id, host up/down, beads count, cmux workspace, model hint. Refreshes on turn/message end and after paperflow/beads/bash tools.

---

### 4. `pi-flow-progress`

| | |
|--|--|
| **Entry** | `extensions/pi-flow-progress/index.ts` |
| **Child sessions** | Skipped (rescue/timers boss-only) |

**Role:** **Liveness guard** — tracks provider/tool/stream activity; working message + telemetry status; **auto-rescue** on stall or empty assistant turn (`piFlow.progress` + `rescue` in defaults).

**Commands:** `/pf-activity`, `/pf-rescue`

**Defaults:** stall 90s, rescue enabled, max 2/turn, 8/session, compact above 85% context.

---

### 5. `pi-flow-subagents`

| | |
|--|--|
| **Entry** | `extensions/pi-flow-subagents/index.ts` |
| **Child sessions** | Skipped (roster/UI boss-only) |

**Role:** **Orchestration UX** on top of pi-subagents — roster in `.pi-flow/subagent-roster.json`, follow boss ↔ worker sessions, agent stack (↑↓), agentstorm dispatch, storm recovery, cmux worker mirror.

**Commands:** `/pf-stack`, `/pf-agents`, `/pf-follow`, `/pf-boss`, `/pf-watch`, `/pf-storm`, `/pf-mirror`  
**Shortcuts:** Ctrl+Shift+] / `[` — next/prev stack item

**Events:** `subagent:async-started`, `subagent:async-complete`, storm control events.

---

### 6. `pi-flow-memory`

| | |
|--|--|
| **Entry** | `extensions/pi-flow-memory/index.ts` |
| **Child sessions** | Runs (journals per session) |

**Role:** **Durable session memory** under `.pi-flow/memory/` — append-only journal, recall on `before_agent_start` (`pi-flow-memory-recall`), named agents via registry.

**Commands:** `/pf-memory`, `/pf-name`, `/pf-recall`, `/pf-chronicler`, `/pf-note`

**Defaults:** `piFlow.memory.enabled: true`, `recallOnStart: true`, `maxRecallChars: 2400`.

---

### 7. `pi-flow-sessions`

| | |
|--|--|
| **Entry** | `extensions/pi-flow-sessions/index.ts` |
| **Child sessions** | Skipped |

**Role:** **Session continuity** — auto-resume last/boss session on startup, auto-title from first user prompt, manual rename.

**Commands:** `/pf-continue`, `/pf-rename`  
**Status key:** `pi-flow-sess`

---

## Bundled npm extensions (detail)

Deep dives: **slot-02** (pi-subagents), **slot-03** (pi-mcp-adapter), **slot-04** (pi-cursor-provider).

### 8. `pi-cursor-provider` @ 0.1.11

Register provider **`cursor`** — PKCE `/login cursor`, local proxy. pi-flow default **`composer-2.5`** via `settings/defaults.json` + postinstall patch.

### 9. `pi-mcp-adapter` @ 2.6.1

Single **`mcp`** proxy tool; lazy MCP lifecycle. Browserbase merged on setup; researcher override includes `mcp:browserbase`.

### 10. `pi-subagents` @ 0.24.3

Core **`subagent`** tool — parallel/chain/async. Must use **0.24.1+** with `@earendil-works/pi-coding-agent` 0.75.x.

---

## Child-session guard matrix

| Extension | Skipped in child? | Why |
|-----------|-------------------|-----|
| pi-flow-setup | Yes | No duplicate install/handoff |
| pi-flow-statusline | Yes | Timer/UI crashes in storms |
| pi-flow-progress | Yes | Rescue boss-only |
| pi-flow-subagents | Yes | Roster/follow boss-only |
| pi-flow-sessions | Yes | Continue/rename boss-only |
| pi-flow-host | No | Worker tools |
| pi-flow-memory | No | Per-session journals |
| pi-cursor-provider | No | Model access in workers |
| pi-mcp-adapter | No | MCP tools in workers |
| pi-subagents | No | Defines child sessions |

---

## Related Browserstorm slots

| Slot | Topic |
|------|--------|
| 2 | pi-subagents deep dive |
| 3 | pi-mcp-adapter deep dive |
| 4 | pi-cursor-provider / Composer 2.5 |
| 6 | npm `keywords:pi-package` ecosystem |
| 7 | pi-agent-core vs pi-coding-agent |

---

## References

- `package.json`, `settings/defaults.json`, `FORKS.md`, `lib/subagents-policy.md`
- `scripts/verify-bundled-deps.mjs`, `scripts/patch-cursor-provider.mjs`
