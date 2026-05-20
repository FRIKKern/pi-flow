# @earendil-works/pi-coding-agent — Research (Browserstorm 1/20)

**Package:** [@earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)  
**Repository:** [earendil-works/pi-mono](https://github.com/earendil-works/pi-mono) (`packages/coding-agent`)  
**pi-flow context:** `package.json` dependency, `AGENTS.md`, bundled extensions under `extensions/`, `FORKS.md`

---

## Summary

`@earendil-works/pi-coding-agent` is the **canonical Pi CLI** (terminal coding harness): read/bash/edit/write tools, session tree, compaction, providers, and a **TypeScript extension API** for tools, commands, lifecycle events, and TUI hooks. **Latest npm is `0.75.3`** (2026-05-18). The **`@mariozechner/*` scope is legacy**; 0.74+ moved to **`@earendil-works/*`**. For pi-flow, pin **`@earendil-works/pi-coding-agent@^0.75.3`** with **`pi-subagents@^0.24.3`** (same scope). **Node ≥22.19.0** is required as of 0.75.0 (pi-flow declares `>=20` but should align engines with upstream).

Install: `npm install -g @earendil-works/pi-coding-agent` or `curl -fsSL https://pi.dev/install.sh | sh`

---

## Version

| Field | Value |
|-------|--------|
| **Latest** | `0.75.3` |
| **dist-tag** | `latest` → `0.75.3` |
| **License** | MIT |
| **CLI binary** | `pi` → `dist/cli.js` |
| **Programmatic** | `main`: `./dist/index.js`, `types`: `./dist/index.d.ts` |
| **Engines** | `node`: `>=22.19.0` |
| **Core deps** | `@earendil-works/pi-agent-core`, `pi-ai`, `pi-tui`, `typebox`, `jiti`, … |
| **Unscoped `pi-coding-agent` on npm** | Placeholder — **do not use** for 0.75.x |

### 0.75.x changelog highlights

| Version | Date | Notable changes |
|---------|------|-----------------|
| **0.75.0** | 2026-05-17 | **Breaking:** min Node **22.19.0**; npm pi packages install under `~/.pi/agent/npm/`; system prompt uses XML boundaries; undici 8 dispatcher; many provider/AI fixes via `pi-ai` |
| **0.75.1** | 2026-05-18 | Anthropic/Bedrock/Azure/OpenCode/Xiaomi fixes; undici fetch globals for Node 26; config selector scaling; removed broken Codex fast variants |
| **0.75.2** | 2026-05-18 | Bun binary + Windows fixes (editor, npm self-update, pnpm, cross-spawn); Xiaomi reasoning replay |
| **0.75.3** | 2026-05-18 | HTTP/1.1 fetch dispatcher fix for undici 8 HTTP/2 session races ([#4681](https://github.com/earendil-works/pi/issues/4681)) |

**0.74.x line:** scope migration to `@earendil-works/*` (0.74.0); image generation, Together AI, Windows ARM64 binaries, session resume OOM cap (0.74.1).

### Recommended pin for pi-flow

```json
"@earendil-works/pi-coding-agent": "^0.75.3"
```

- **Floor:** `0.75.0` (scope + Node 22.19+); **prefer `0.75.3`** for undici/HTTP stability.
- **Pair with:** `pi-subagents@^0.24.3` (imports `@earendil-works/*` since 0.24.1).
- **Update path:** `pi update --self` migrates from `@mariozechner/pi-coding-agent` when published.

---

## Extension API capabilities

Extensions are **default-export factory functions** `(pi: ExtensionAPI) => void | Promise<void>`. Async factories are awaited before `session_start` / `resources_discover` — useful for remote model registration.

### Registration surface

| API | Purpose |
|-----|---------|
| `pi.registerTool()` | LLM-callable tools (TypeBox parameters) |
| `pi.registerCommand()` | `/commands` (checked before agent) |
| `pi.registerProvider()` | Custom model providers |
| `pi.on(event, handler)` | Lifecycle hooks |
| `pi.appendEntry()` | Session-persistent extension state |

### Key lifecycle events

```
startup → session_start → resources_discover
prompt → before_agent_start → agent_start → turn_start
       → tool_execution_start → tool_call → tool_execution_end → turn_end → agent_end
/new|/resume → session_shutdown → session_start
/fork → session_before_fork → session_shutdown → session_start (fork)
/compact → session_before_compact → session_compact
```

| Event | Typical use |
|-------|-------------|
| `session_start` | Per-session init; read `ctx.sessionManager` |
| `resources_discover` | Inject skill/prompt/theme paths (`startup` \| `reload`) |
| `tool_call` | Block/modify tools (permission gates) |
| `tool_execution_start` / `tool_execution_end` | Wrap tool runs; pi-flow progress/statusline hooks |
| `before_agent_start` | Inject messages, modify system prompt chain |
| `session_shutdown` | Cleanup before switch/fork/exit |
| `session_compact` | Custom compaction behavior |

### ExtensionContext (`ctx`)

| Member | Role |
|--------|------|
| `ctx.ui` | `notify`, `confirm`, `select`, `input`, `custom()`, `setStatus`, `setWidget` |
| `ctx.sessionManager` | Branch, entries, session file path |
| `ctx.cwd` | Working directory |
| `ctx.model` / `ctx.modelRegistry` | Current model |
| `ctx.signal` | Abort signal (Esc cancels nested async) |
| `ctx.getSystemPrompt()` | Pi system prompt string (not full provider payload) |

**Stale ctx:** After `/new`, `/resume`, `/fork`, or **parallel subagent forks**, captured `ExtensionContext` references throw **`extension ctx is stale`**. Extensions must re-bind on `session_start` and guard UI calls. pi-flow implements `safeExtensionUi()` and `isPiSubagentChildSession()` (`PI_SUBAGENT_CHILD=1`) so boss-only UI (statusline, progress rescue) skips child sessions — see commit `08087d9` (boss-only hooks in subagent children).

### Discovery locations

| Path | Scope |
|------|--------|
| `~/.pi/agent/extensions/*.ts` | Global |
| `.pi/extensions/*.ts` | Project |
| `package.json` → `pi.extensions` | Pi packages (pi-flow uses this) |
| `settings.json` → `extensions` / `packages` | Explicit paths + `pi install npm:…` |

Imports: `@earendil-works/pi-coding-agent` (types), `typebox`, `@earendil-works/pi-ai`, `@earendil-works/pi-tui`.

### Built-in capabilities (not extensions)

Default tools: `read`, `write`, `edit`, `bash`. Modes: interactive, print/JSON, RPC, SDK embed. Sessions under `~/.pi/agent/sessions/`. Skills (`/skill:name`), prompt templates, themes, `/reload` hot-reload for extensions/skills.

**Pi does not ship subagents/plan mode** — install packages (e.g. `pi-subagents`) or build via extensions.

---

## pi-flow usage

| Topic | pi-flow choice |
|-------|----------------|
| Dependency | `"@earendil-works/pi-coding-agent": "^0.75.3"` in `package.json` |
| Extensions | Six first-party (`pi-flow-setup`, `host`, `statusline`, `progress`, `subagents`, `memory`, `sessions`) + `pi-cursor-provider`, `pi-mcp-adapter`, `pi-subagents` via `pi.extensions` |
| Boss vs child | `isPiSubagentChildSession()` gates boss UI; children get subagent extension only |
| Stale ctx | `extensions/shared/extension-context.ts` — never crash boss on stale `ctx.ui` |
| Node engines | package.json `>=20` — **consider bumping to `>=22.19.0`** to match 0.75.0 |

pi-flow is itself a **pi package** (`keywords: pi-package`): consumers run `pi install` / use bundled `pi.extensions` list rather than copying extension files manually.

---

## When to upgrade

| Signal | Action |
|--------|--------|
| New 0.75.x patch on npm | Run `pi update --self` or bump `package.json` + `npm install` |
| Extension `import` errors from `@mariozechner/*` | Upgrade extension package to earendil scope |
| `extension ctx is stale` crashes | Re-bind ctx on `session_start`; use `safeExtensionUi` |
| Node 20 runtime | Upgrade to **22.19+** before 0.75.x |

---

## References

- [npm: @earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
- [pi.dev](https://pi.dev) · [install.sh](https://pi.dev/install.sh)
- [earendil-works/pi-mono](https://github.com/earendil-works/pi-mono) — `packages/coding-agent/docs/extensions.md`
- [Extensions doc](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [Pi packages doc](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/packages.md)
- pi-flow: `package.json`, `FORKS.md`, `extensions/shared/extension-context.ts`, `AGENTS.md`
