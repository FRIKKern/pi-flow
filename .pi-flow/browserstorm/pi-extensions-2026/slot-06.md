# npm `keywords:pi-package` — Research (Browserstorm 6/20)

**Search:** [npm — keywords:pi-package](https://www.npmjs.com/search?q=keywords:pi-package)  
**Method:** Browserbase remote session via `browse open … --remote` (browse CLI 0.7.3); versions cross-checked with `npm view` / `npm search keywords:pi-package` on **2026-05-19**  
**Result count:** 1000+ packages (npm default sort)

---

## Summary

The `pi-package` keyword marks npm packages that ship **Pi extensions**, **skills**, **prompts**, and/or **themes** via the `package.json` → `pi` field (install with `pi install npm:<name>`). As of May 2026, the default npm search ranking is dominated by **nicobailon's core stack** (subagents, web, MCP), **juicesharp's rpiv UX suite**, **context-mode** (multi-platform context savings, including a Pi adapter), and **Plannotator** (plan review UI).

| # | Package | Latest (2026) | One-line purpose |
|---|---------|---------------|------------------|
| 1 | [context-mode](https://www.npmjs.com/package/context-mode) | **1.0.143** | Context-window savings via sandboxed execution, FTS5 knowledge base, session continuity |
| 2 | [pi-subagents](https://www.npmjs.com/package/pi-subagents) | **0.24.3** | Delegate work to child Pi sessions (parallel, chains, background, clarify TUI) |
| 3 | [pi-web-access](https://www.npmjs.com/package/pi-web-access) | **0.10.7** | Web search, fetch, GitHub clone, PDF/YouTube/video tools for Pi |
| 4 | [pi-mcp-adapter](https://www.npmjs.com/package/pi-mcp-adapter) | **2.6.1** | Use MCP servers in Pi without loading all tool defs into context |
| 5 | [@juicesharp/rpiv-ask-user-question](https://www.npmjs.com/package/@juicesharp/rpiv-ask-user-question) | **1.10.0** | Structured `ask_user_question` TUI (multi-select, previews, notes) |
| 6 | [pi-simplify](https://www.npmjs.com/package/pi-simplify) | **0.2.1** | `/simplify` — review recent git changes for clarity and maintainability |
| 7 | [@juicesharp/rpiv-btw](https://www.npmjs.com/package/@juicesharp/rpiv-btw) | **1.10.0** | `/btw` side questions in a read-only clone panel without polluting main chat |
| 8 | [@plannotator/pi-extension](https://www.npmjs.com/package/@plannotator/pi-extension) | **0.19.20** | Interactive plan review, annotations, code/PR review in browser UI |
| 9 | [@ollama/pi-web-search](https://www.npmjs.com/package/@ollama/pi-web-search) | **0.0.5** | `ollama_web_search` / `ollama_web_fetch` via local Ollama APIs |
| 10 | [@juicesharp/rpiv-todo](https://www.npmjs.com/package/@juicesharp/rpiv-todo) | **1.10.0** | Model todo list + live overlay; survives `/reload` and compaction |

**pi-flow bundles:** `pi-subagents@^0.24.3`, `pi-mcp-adapter@^2.6.1` (see `package.json` → `pi.extensions`).

---

## What is a Pi package?

Pi packages are standard npm modules that declare a `pi` block, for example:

```json
{
  "pi": {
    "extensions": ["./index.ts"],
    "skills": ["./skills"],
    "prompts": ["./prompts"]
  }
}
```

Install: `pi install npm:<package>`. The ecosystem uses the **`pi-package`** keyword for discovery; many also tag `pi`, `pi-extension`, or `pi-coding-agent`.

---

## Top 10 (detail)

### 1. context-mode — `1.0.143`

| Field | Value |
|-------|--------|
| **Repository** | [mksglu/context-mode](https://github.com/mksglu/context-mode) |
| **License** | Elastic-2.0 |
| **Published** | 2026-05-19 |
| **npm weekly downloads** | ~94.9k (search UI, May 2026) |
| **Pi entry** | `./build/adapters/pi/extension.js` + `./skills` |

**What it does:** Multi-platform context toolkit — routes bulky tool output through **sandboxed code execution** (`ctx_execute`, batch/index/search tools), **FTS5 + BM25** knowledge base, and **SQLite session continuity** so compaction does not lose project state. Ships adapters for Claude Code, Gemini CLI, Copilot, Cursor, OpenCode, Codex, OpenClaw, **Pi Coding Agent**, Oh My Pi, etc.

**On Pi specifically:** Extension registers `tool_call`, `tool_result`, `session_start`, `session_before_compact` hooks (~98% routing compliance). Install: `pi install npm:context-mode`. Verify with `ctx stats` in-session. Requires Node ≥ 22.5.

---

### 2. pi-subagents — `0.24.3`

| Field | Value |
|-------|--------|
| **Repository** | [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents) |
| **License** | MIT |
| **Published** | 2026-05-15 |
| **Pi entry** | `./src/extension/index.ts`, skills, prompts |

**What it does:** Adds a **`subagent` tool** and builtins (`scout`, `researcher`, `worker`, …) for single runs, parallel fan-out, sequential chains, background async jobs, and a **clarify TUI**. Pairs with `pi-web-access` for researcher web tools.

**pi-flow:** Bundled extension; agentstorm/roster policy in `lib/subagents-policy.md`. Use **`@earendil-works/pi-coding-agent` 0.75.x** with **`pi-subagents@0.24.1+`** (0.24.0 and below target `@mariozechner/*`).

Install: `pi install npm:pi-subagents`

---

### 3. pi-web-access — `0.10.7`

| Field | Value |
|-------|--------|
| **Repository** | [nicobailon/pi-web-access](https://github.com/nicobailon/pi-web-access) |
| **License** | MIT |
| **Published** | 2026-05-02 |
| **Pi entry** | `./index.ts`, `./skills` |

**What it does:** **`web_search`**, URL fetch, **GitHub repo cloning** (real files, not HTML scrape), PDF extraction, **YouTube** and local video understanding. Zero-config **Exa MCP** search; optional Perplexity/Gemini API keys or Gemini Web via browser cookies; fallback chains when providers fail.

Install: `pi install npm:pi-web-access` — optional `~/.pi/web-search.json` for API keys.

---

### 4. pi-mcp-adapter — `2.6.1`

| Field | Value |
|-------|--------|
| **Repository** | [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) |
| **License** | MIT |
| **Published** | 2026-05-13 |
| **Pi entry** | `./index.ts` |

**What it does:** Connects **MCP servers** to Pi with **on-demand discovery** — one proxy tool (~200 tokens) instead of loading every MCP tool definition up front. Reads `.mcp.json`, `~/.config/mcp/mcp.json`, and Pi overrides; `/mcp setup` imports host configs (Cursor, Claude Code, etc.). Lazy-starts servers when used.

**pi-flow:** Bundled at `node_modules/pi-mcp-adapter/index.ts`.

Install: `pi install npm:pi-mcp-adapter`

---

### 5. @juicesharp/rpiv-ask-user-question — `1.10.0`

| Field | Value |
|-------|--------|
| **Repository** | [juicesharp/rpiv-mono](https://github.com/juicesharp/rpiv-mono) (package `rpiv-ask-user-question`) |
| **License** | MIT |
| **Published** | 2026-05-19 |
| **Pi entry** | `./index.ts` |

**What it does:** Adds **`ask_user_question`** — tabbed terminal UI for structured clarifications (single/multi-select, side-by-side ASCII/markdown previews, per-option notes, review tab before submit). Reduces model guessing on ambiguous tasks.

Install: `pi install npm:@juicesharp/rpiv-ask-user-question`

---

### 6. pi-simplify — `0.2.1`

| Field | Value |
|-------|--------|
| **Repository** | [MattDevy/pi-extensions](https://github.com/MattDevy/pi-extensions) (`packages/pi-simplify`) |
| **License** | MIT |
| **Published** | 2026-05-14 |
| **Pi entry** | `dist/index.js` |

**What it does:** **`/simplify`** slash command — detects changed files via `git diff` and instructs the agent to improve clarity/consistency **without changing behavior**; supports `--staged`, `--ref=<branch>`, or explicit file paths. Follows project `AGENTS.md` / `CLAUDE.md` conventions.

Install: `pi install npm:pi-simplify`

---

### 7. @juicesharp/rpiv-btw — `1.10.0`

| Field | Value |
|-------|--------|
| **Repository** | [juicesharp/rpiv-mono](https://github.com/juicesharp/rpiv-mono) (package `rpiv-btw`) |
| **License** | MIT |
| **Published** | 2026-05-19 |
| **Pi entry** | `./index.ts` |

**What it does:** **`/btw <question>`** — side channel to the **same primary model** using a **read-only clone** of the conversation; answers appear in a bottom panel with its own thread memory. Main transcript stays clean.

Install: `pi install npm:@juicesharp/rpiv-btw`

---

### 8. @plannotator/pi-extension — `0.19.20`

| Field | Value |
|-------|--------|
| **Repository** | [backnotprop/plannotator](https://github.com/backnotprop/plannotator) |
| **License** | MIT OR Apache-2.0 |
| **Published** | 2026-05-19 |
| **Pi entry** | `./` (package root), `./skills` |

**What it does:** **Plan mode** (`pi --plan`, `/plannotator`, `Ctrl+Alt+P`) — agent writes markdown checklists; **`plannotator_submit_plan`** opens a **browser UI** for approve/deny/annotate. Supports plan diff on resubmit, code/PR review flows, layered config (`plannotator.json` in package, `~/.pi/agent/`, project `.pi/`).

Install: `pi install npm:@plannotator/pi-extension` — try without install: `pi -e npm:@plannotator/pi-extension`

---

### 9. @ollama/pi-web-search — `0.0.5`

| Field | Value |
|-------|--------|
| **Repository** | [ollama/pi-web-search](https://github.com/ollama/pi-web-search) (per install docs) |
| **License** | MIT |
| **Published** | 2026-03-28 |
| **Pi entry** | `./index.ts` |

**What it does:** Lightweight alternative to `pi-web-access` — **`ollama_web_search`** and **`ollama_web_fetch`** backed by a **local Ollama** instance (no third-party search API keys). Requires `ollama serve` and web search/fetch enabled in Ollama config.

Install: `pi install npm:@ollama/pi-web-search`

---

### 10. @juicesharp/rpiv-todo — `1.10.0`

| Field | Value |
|-------|--------|
| **Repository** | [juicesharp/rpiv-mono](https://github.com/juicesharp/rpiv-mono) (package `rpiv-todo`) |
| **License** | MIT |
| **Published** | 2026-05-19 |
| **Pi entry** | `./index.ts` |

**What it does:** **`todo` tool**, **`/todos`** command, and a **live overlay** above the editor for the model's task list. State **persists across `/reload` and conversation compaction** so long sessions keep a visible plan.

Install: `pi install npm:@juicesharp/rpiv-todo`

---

## Honorable mentions (#11–15 on same search page)

| Package | Version | Note |
|---------|---------|------|
| [@juicesharp/rpiv-args](https://www.npmjs.com/package/@juicesharp/rpiv-args) | 1.10.0 | `$1` / `$ARGUMENTS` expansion in Pi skills |
| [@gotgenes/pi-permission-system](https://www.npmjs.com/package/@gotgenes/pi-permission-system) | 6.0.1 | Permission enforcement for Pi tools |
| [@samfp/pi-memory](https://www.npmjs.com/package/@samfp/pi-memory) | 1.3.2 | Persistent memory from session corrections |
| [pi-lens](https://www.npmjs.com/package/pi-lens) | 3.8.44 | LSP, linters, formatters, type-checking feedback |
| [@tintinweb/pi-subagents](https://www.npmjs.com/package/@tintinweb/pi-subagents) | 0.7.3 | Alternate subagent extension (Claude Code–style autonomy) |

---

## Ecosystem patterns (2026)

1. **Core platform trio** — `pi-subagents`, `pi-web-access`, `pi-mcp-adapter` (nicobailon) form the default stack for delegation, web, and MCP.
2. **rpiv monorepo** — juicesharp ships coordinated UX extensions (`ask-user`, `btw`, `todo`, `args`) version-locked at **1.10.0** as of research date.
3. **Discovery vs. true Pi packages** — `context-mode` ranks #1 by npm popularity but is **cross-platform**; Pi is one adapter among many.
4. **Keyword sprawl** — 1000+ hits; many scoped packages (`@oppiai/pi-package`, `@outlit/pi`, etc.) are **full agent bundles**, not single extensions.
5. **Install surface** — Uniform `pi install npm:…`; extensions declare paths under `pi.extensions`.

---

## Verification

| Check | Result |
|-------|--------|
| Browserbase `browse open` npm search URL | Page title `keywords:pi-package - npm search`; top 10 package links match table |
| `npm search keywords:pi-package --json` | Same ordering for ranks 1–10 |
| `npm view <pkg> version` | Versions match npm UI (2026-05-19) |

---

## pi-flow relevance

| Package | In pi-flow? |
|---------|-------------|
| pi-subagents | **Yes** — bundled |
| pi-mcp-adapter | **Yes** — bundled |
| pi-web-access | No (researcher can use; not in default `package.json`) |
| context-mode, rpiv-*, plannotator, pi-simplify, @ollama/pi-web-search | No — optional add-ons |

For subagent version pairing with **pi-coding-agent 0.75.x**, see **slot-02** (`pi-subagents` research).
