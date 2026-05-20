# Pi Code extensions — synthesis (browserstorm pi-extensions-2026)

**Source:** 20-slot parallel research under `.pi-flow/browserstorm/pi-extensions-2026/slot-*.md`  
**Date:** 2026-05-19  
**Target:** pi-flow boss sessions (paperflow + agentstorm + Browserbase)

---

## Executive summary

pi-flow is a **Pi package** (`pi install git:github.com/FRIKKern/pi-flow`) that bundles **seven first-party extensions**, **three npm extensions** (`pi-subagents`, `pi-mcp-adapter`, `pi-cursor-provider`), and paperflow lifecycle skills. The stack is anchored on **`@earendil-works/pi-coding-agent@0.75.3`** (canonical upstream after the `@mariozechner/*` migration).

| Tier | Packages | Pin |
|------|----------|-----|
| **Core** | Pi CLI, pi-flow, subagents, MCP adapter, beads, typebox | See [production pins](#production-pins) |
| **Optional** | Cursor provider, pi-web-access, pi-intercom, pi-gitnexus, Ollama web | Per environment |
| **Avoid** | oh-my-pi / mariozechner forks, subagents ≤0.24.0, mcp-adapter 1.x, pi-astro, pi-acp in package.json | — |

**Runtime:** Treat **Node.js ≥ 22.19.0** as the real minimum (Pi 0.75.x); pi-flow still declares `>=20` in `package.json`.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  Boss Pi session (cmux / paperflow)                         │
│  @earendil-works/pi-coding-agent 0.75.x + pi-flow extensions │
└───────────────────────────┬─────────────────────────────────┘
                            │ subagent() concurrency 4
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Child Pi sessions (PI_SUBAGENT_CHILD=1)                    │
│  researcher / worker / scout — boss-only hooks skipped      │
└───────────────────────────┬─────────────────────────────────┘
                            │ mcp:browserbase (lazy)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  pi-mcp-adapter → hosted Browserbase MCP (or stdio MCP)     │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Package | Role |
|-------|---------|------|
| LLM + CLI | `@earendil-works/pi-coding-agent` | `pi`, ExtensionAPI, sessions, built-in tools |
| Agent engine (transitive) | `@earendil-works/pi-agent-core` | `Agent`, loops — do not import from pi-flow extensions |
| Delegation | `pi-subagents` | `subagent` tool, parallel/chain/async, control events |
| MCP | `pi-mcp-adapter` | Context-efficient `mcp` proxy + lazy servers |
| Orchestration UX | pi-flow extensions | Host, setup, storm roster, progress rescue, memory |
| Issues | `@beads/bd` | `bd ready` / task graph (not a Pi extension) |

---

## Production pins

| Component | Exact pin | Notes |
|-----------|-----------|-------|
| `@earendil-works/pi-coding-agent` | **0.75.3** | Node **≥22.19**; scope migration at 0.74+ |
| `pi-flow` | **0.9.1** | This repo |
| `pi-subagents` | **0.24.3** | **≥0.24.1** required for earendil imports |
| `pi-mcp-adapter` | **2.6.1** | 2.x only; lazy MCP default |
| `@beads/bd` | **1.0.4** | Native `bd` CLI |
| `typebox` | **1.1.x** | Resolves from `^1.0.0` |
| `pi-cursor-provider` | **0.1.11** | Optional; Composer 2.5 via postinstall patch |
| `pi-web-access` | **0.10.7** | Optional; researcher web without Browserbase |
| `pi-gitnexus` | **0.6.3** | Optional; code graph |
| `@ollama/pi-web-search` | **0.0.5** | Optional; local Ollama only |

### Avoid

| Component | Why |
|-----------|-----|
| `@oh-my-pi/pi-coding-agent` (15.x) | Different scope, Bun runtime, breaks pi-flow deps |
| `@mariozechner/pi-coding-agent` | Deprecated |
| `pi-subagents` ≤0.24.0 | `@mariozechner/*` imports |
| `pi-mcp-adapter` 1.x | Eager MCP, no cache |
| `@astrofoundry/pi-astro` | Bundles duplicate subagents + conflicting agents |
| `pi-acp` in package.json | Editor ACP bridge (Zed); orthogonal to paperflow |
| Two Browserbase stacks per task | Pick hosted MCP **or** custom Stagehand app, not both |

---

## pi-flow bundled extensions

Load order from `package.json` → `pi.extensions`:

| # | Extension | Priority | Boss-only in children? |
|---|-----------|----------|-------------------------|
| 1 | `pi-flow-setup` | Critical — `/pi-flow-setup`, deps, Browserbase | Yes |
| 2 | `pi-flow-host` | Critical — paperflow lifecycle, host tools | No |
| 3 | `pi-flow-statusline` | UX — goal, host, beads | Yes |
| 4 | `pi-flow-progress` | UX — stall rescue (`/pf-rescue`) | Yes |
| 5 | `pi-flow-subagents` | High — `/pf-storm`, roster, storm recovery | Yes |
| 6 | `pi-flow-memory` | Medium — journal recall | No |
| 7 | `pi-flow-sessions` | Medium — `/pf-continue`, `/pf-rename` | Yes |
| 8 | `pi-cursor-provider` | Optional — Cursor OAuth / Composer 2.5 | No |
| 9 | `pi-mcp-adapter` | High — MCP proxy | No |
| 10 | `pi-subagents` | Critical — delegation | No |

**Headless minimum:** 1–7 + 9–10; skip relying on cursor provider for model access.

**Child guard:** Extensions check `PI_SUBAGENT_CHILD=1` and skip boss roster/statusline/progress hooks so parallel storms do not crash on `reconcileRoster` or stale `ctx.ui` (fix at `08087d9`).

---

## Core npm packages (detail)

### @earendil-works/pi-coding-agent (slot 01)

- **0.75.3** — latest; breaking Node **22.19+** at 0.75.0; npm packages install under `~/.pi/agent/npm/`.
- Extension API: `registerTool`, `registerCommand`, `pi.on(session_start | tool_execution_* | …)`.
- **Stale ctx:** After fork/subagent, `extension ctx is stale` — re-bind on `session_start`; use `safeExtensionUi()` in pi-flow.
- Install: `npm i -g @earendil-works/pi-coding-agent` or [pi.dev/install.sh](https://pi.dev/install.sh).

### pi-subagents (slots 02, 11)

- **0.24.3** with **0.75.x**; builtins: scout, researcher, worker, planner, reviewer, oracle.
- Defaults: **8** max parallel tasks, **4** concurrent; control events at 60s / 240s thresholds.
- **Agentstorm rule:** One `tasks[]` entry per slot with unique `output` — never `count: 20` on one researcher (collides on `research.md`).
- Events: `subagent:control-event` → pi-flow storm recovery (retry failed slots, max 2×, 15s cooldown).

### pi-mcp-adapter (slots 03, 16)

- **2.6.1** — lazy connect, disk metadata cache, `mcp({ search | describe | tool })`, `/mcp` panel.
- pi-flow default: hosted **Browserbase** at `https://mcp.browserbase.com/mcp` (`settings/mcp.browserbase.json`).
- Researcher override: `mcp:browserbase` in settings; without adapter, Browserbase storms fail silently.

### pi-cursor-provider (slot 04)

- **0.1.11** — PKCE `/login cursor`, local proxy to Cursor API.
- pi-flow defaults `composer-2.5`; postinstall `patch-cursor-provider.mjs` adds 2.5 to fallbacks.
- Skip on headless API-key-only deployments.

---

## Optional ecosystem (slots 06, 08–10, 14)

| Package | Version | When to add |
|---------|---------|-------------|
| **pi-web-access** | 0.10.7 | Researcher web via Exa/Perplexity; alternative to Browserbase |
| **@ollama/pi-web-search** | 0.0.5 | Local Ollama web APIs only |
| **pi-acp** | 0.0.27 | Zed/editor ACP — not for paperflow boss |
| **pi-gitnexus** | 0.6.3 | Graph code search in Pi |
| **gitnexus** | 1.6.5 | Standalone MCP/CLI indexing |
| **context-mode** | 1.0.x | Cross-platform context savings (Pi is one adapter) |
| **@plannotator/pi-extension** | 0.19.x | Plan review browser UI |

**npm discovery:** `keywords:pi-package` — 1000+ packages; core trio remains subagents + web-access + mcp-adapter.

**Forks:** Only **`@earendil-works/pi-coding-agent@0.75.3`** for pi-flow users (slot 10).

---

## Beads (slot 13)

`@beads/bd@^1.0.4` — **dependency only**, not `pi.extensions`. Powers `bd ready`, issue graph, paperflow task routing. Initialized by `/pi-flow-setup`.

---

## Agentstorm operations

| Setting | Default | Config |
|---------|---------|--------|
| Slots | 20 | `piFlow.agentstorm.defaultCount` |
| Concurrency | 4 | `piFlow.agentstorm.defaultConcurrency` |
| Agent | researcher | `piFlow.agentstorm.defaultAgent` |
| Output dir | `.pi-flow/browserstorm/<stamp>/slot-NN.md` | `buildAgentstormPayload()` |

**Dispatch:** `/pf-storm [count] [agent] <task>` or explicit `subagent({ tasks: [...], concurrency: 4, failFast: false })`.

**Guards:**

1. Unique `output` per slot.
2. Task text: *"Write ONLY research to your output file"* (prevents memory-recall pollution).
3. Effective parallel browsers ≈ `min(4, Browserbase plan concurrency)`.
4. After storm: boss reads `slot-20.md` or this doc; do not paste 20 transcripts.

**Recovery:** `piFlow.agentstorm.recovery` — auto-retry failed slots; ensure `/pi-flow-update` so children skip boss-only hooks.

---

## MCP + Browserbase default

| Path | Use |
|------|-----|
| Hosted MCP | Default after `/pi-flow-browserbase-setup` |
| stdio `@browserbasehq/mcp` | Custom env, project ID, Gemini key |
| cmux `:8767` | paperflow artifacts — not external web |

Six Browserbase tools: `start`, `end`, `navigate`, `act`, `observe`, `extract`. See `docs/BROWSERBASE.md`.

---

## Versioning & updates (slots 15, 19)

- pi-flow uses **caret ranges** (`^0.75.3`); published `files` omit lockfile — commit lockfile in **your** deployment fork for reproducibility.
- **`/pi-flow-update`:** pull pi-flow, merge settings, deps, Browserbase, then **`/reload`**.
- **Cadence:** monthly Pi patch check; bump subagents with Pi; quarterly mcp-adapter review.
- **Upgrade smoke test:** `subagent({ action: "doctor" })` or 2-slot storm.

---

## Runtime checklist

```bash
node -v                          # ≥ v22.19.0
npm ls @earendil-works/pi-coding-agent pi-subagents pi-mcp-adapter
pi install git:github.com/FRIKKern/pi-flow
cd pi-flow && npm install        # bundled deps + postinstall patches
/pi-flow-setup
/login cursor                    # if using Composer via Cursor
/pi-flow-browserbase-setup
/reload
```

---

## Slot index (deep dives)

| Slot | File | Topic |
|------|------|--------|
| 01 | `slot-01.md` | pi-coding-agent 0.75.x, extension API |
| 02 | `slot-02.md` | pi-subagents overview |
| 03 | `slot-03.md` | pi-mcp-adapter 2.x |
| 04 | `slot-04.md` | pi-cursor-provider / Composer 2.5 |
| 05 | `slot-05.md` | pi-flow extension catalog |
| 06 | `slot-06.md` | npm `pi-package` top 10 |
| 07 | `slot-07.md` | pi-agent-core vs coding-agent |
| 08 | `slot-08.md` | @ollama/pi-web-search |
| 09 | `slot-09.md` | pi-acp (skip) |
| 10 | `slot-10.md` | oh-my-pi vs earendil |
| 11 | `slot-11.md` | agentstorm + SUBAGENT_CONTROL |
| 12 | `slot-12.md` | writing Pi extensions, stale ctx |
| 13 | `slot-13.md` | @beads/bd |
| 14 | `slot-14.md` | gitnexus, pi-astro |
| 15 | `slot-15.md` | semver / lockfile / update |
| 16 | `slot-16.md` | MCP hosted vs stdio |
| 17 | `slot-17.md` | Node 22.19+ |
| 18 | `slot-18.md` | extension importance ranking |
| 19 | `slot-19.md` | security & update policy |
| 20 | `slot-20.md` | production pin table (canonical short form) |

---

## Related pi-flow docs

- `docs/BROWSERBASE.md` — cloud browser setup (separate browserstorm track on docs.browserbase.com)
- `docs/SUBAGENTS-UX.md` — `/pf-follow`, roster
- `skills/agentstorm/SKILL.md` — storm dispatch
- `lib/subagents-policy.md` — researcher vs worker, MCP requirements
- `FORKS.md` — vendor forks including cursor provider

---

## Lessons from this storm

1. **Stale pi-flow install** (`reconcileRoster is not a function`) — run `/pi-flow-update`; boss git checkout must match extension imports.
2. **Boss-only hooks in children** — fixed in `08087d9`; restart Pi after update.
3. **Shared `research.md`** — wrong for multi-slot storms; always per-slot paths under `.pi-flow/browserstorm/`.
4. **Memory recall injection** — task prompt must forbid writing session-recall text as the deliverable.
