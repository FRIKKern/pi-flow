# @earendil-works/pi-agent-core — Research (Browserstorm 7/20)

**Package:** [@earendil-works/pi-agent-core](https://www.npmjs.com/package/@earendil-works/pi-agent-core)  
**Repository:** [earendil-works/pi-mono](https://github.com/earendil-works/pi-mono) (`packages/agent`)  
**pi-flow context:** transitive via `@earendil-works/pi-coding-agent@^0.75.3`; extensions import `pi-coding-agent` only

---

## Summary

`@earendil-works/pi-agent-core` is the **agent runtime library** in the Pi monorepo: stateful `Agent` class, low-level `agentLoop` / `agentLoopContinue`, tool execution (parallel/sequential), event streaming, and a higher-level **`AgentHarness`** (skills, prompt templates, session I/O, steer/follow-up queues). It sits on `@earendil-works/pi-ai` for models and streaming.

`@earendil-works/pi-coding-agent` is the **product layer** built on top: CLI (`pi`), TUI, extensions SDK, session files, built-in tools (`read` / `bash` / `edit` / `write`), compaction UX, and `AgentSession` (wraps `Agent` from agent-core). **pi-flow does not depend on agent-core directly** — it pins `pi-coding-agent` and loads extensions that type against `ExtensionAPI` from that package.

**Latest npm:** `0.75.3` (same version line and `gitHead` as `pi-coding-agent`, `pi-ai`, and `pi-tui`).

---

## Relationship to pi-coding-agent

### Layering (pi-mono)

```text
@earendil-works/pi-ai              LLM providers, models, message streaming
        ↑
@earendil-works/pi-agent-core      Agent, agentLoop, tools, events, AgentHarness
        ↑
@earendil-works/pi-coding-agent    CLI + AgentSession + extensions + sessions + TUI
        ↑
@earendil-works/pi-tui             Terminal UI primitives (sibling dep of coding-agent)
```

| Package | Monorepo path | Role |
|---------|---------------|------|
| **pi-agent-core** | `packages/agent` | Reusable agent engine; embeddable without Pi CLI |
| **pi-coding-agent** | `packages/coding-agent` | Terminal coding harness; `bin.pi` → `dist/cli.js` |
| **pi-ai** | `packages/ai` | Shared by both |
| **pi-tui** | `packages/tui` | Used by coding-agent for interactive mode |

### How coding-agent uses agent-core

`createAgentSession()` (SDK entry in `pi-coding-agent`) constructs a **`new Agent({...})`** from agent-core, then wraps it in **`AgentSession`**, which adds:

- Session persistence (`SessionManager`)
- Extension hooks (`ExtensionRunner`)
- Model registry, settings, resource loader (skills, prompts, themes)
- Built-in coding tools registered as `AgentTool` instances
- Compaction / branch-summary events (`AgentSessionEvent` extends `AgentEvent`)

Public types re-used from agent-core in coding-agent’s `.d.ts` files include `Agent`, `AgentEvent`, `AgentMessage`, `AgentState`, `AgentTool`, `ThinkingLevel`. Extension authors in pi-flow typically import **`ExtensionAPI`** / **`ExtensionContext`** from `pi-coding-agent`, not from agent-core.

### Duplicate surface: compaction & harness

`pi-agent-core` **main export** includes harness utilities (`compact`, `generateSummary`, `AgentHarness`, session repos, skills helpers). `pi-coding-agent` also exports compaction helpers from `core/compaction/` that use **`AgentMessage`** types from agent-core but implement **session-entry–aware** compaction for Pi’s JSONL sessions. For Pi extensions, prefer **coding-agent / session APIs** unless building a standalone agent without Pi sessions.

### When to depend on agent-core directly

| Use case | Depend on |
|----------|-----------|
| Pi package / extension (pi-flow) | `@earendil-works/pi-coding-agent` |
| Custom CLI or embedded agent without Pi harness | `@earendil-works/pi-agent-core` (+ `pi-ai`) |
| Child processes that run full `pi` (pi-subagents) | `pi-coding-agent` at runtime; peers list agent-core for types |

---

## Version

| Field | pi-agent-core | pi-coding-agent |
|-------|---------------|-----------------|
| **Latest** | `0.75.3` | `0.75.3` |
| **Published versions** | `0.74.0`–`0.75.3` (6 releases) | Same set, same timestamps |
| **gitHead (0.75.3)** | `a7d8dd3…` | `a7d8dd3…` (identical) |
| **License** | MIT | MIT |
| **Type** | `module` | `module` |
| **Node engines** | `>=22.19.0` | `>=22.19.0` |
| **Scope migration** | Replaces `@mariozechner/pi-agent-core` (deprecated @ `0.73.1`) | Replaces `@mariozechner/pi-coding-agent` |

### Monorepo lockstep (0.75.x)

All four `@earendil-works/*` core packages publish **the same version number** per release:

| Package | Latest | Declared dep on agent-core |
|---------|--------|----------------------------|
| `pi-ai` | `0.75.3` | — |
| `pi-agent-core` | `0.75.3` | `pi-ai: ^0.75.3` |
| `pi-tui` | `0.75.3` | — |
| `pi-coding-agent` | `0.75.3` | `pi-agent-core: ^0.75.3`, `pi-ai: ^0.75.3`, `pi-tui: ^0.75.3` |

**Rule:** Keep `pi-coding-agent`, `pi-agent-core`, `pi-ai`, and `pi-tui` on the **same minor** (ideally exact patch) when upgrading. The monorepo’s `build:binary` script builds `../tui`, `../ai`, `../agent`, then coding-agent in that order.

### pi-flow pin

| Field | Value |
|-------|--------|
| **package.json** | `"@earendil-works/pi-coding-agent": "^0.75.3"` only (no direct agent-core) |
| **Lockfile (resolved)** | `pi-agent-core@0.75.3` under `node_modules/@earendil-works/pi-agent-core` (transitive) |
| **bin/pi-flow** | Suggests `npm install -g @earendil-works/pi-coding-agent` if `pi` missing |
| **Extension imports** | All `extensions/pi-flow-*` → `@earendil-works/pi-coding-agent` |
| **pi-flow engines** | `node >= 20` (below agent-core’s declared `>=22.19.0`) |

### Alignment risks in pi-flow’s dependency tree

| Source | Issue |
|--------|--------|
| **pi-cursor-provider@0.1.11** | Peer deps still `@mariozechner/pi-coding-agent` / `pi-ai` → can install **deprecated 0.73.1** tree alongside earendil 0.75.x |
| **pi-mcp-adapter@2.6.1** | Runtime `pi-ai: ^0.74.0` → lockfile may hoist **`pi-ai@0.74.1`** at repo root while coding-agent nests **`0.75.3`** |
| **pi-subagents@0.24.3** | Peer `*` on all earendil packages; devDeps tested at `^0.74.0`; **compatible with 0.75.3**, not auto-pinned |
| **npm `pi-coding-agent` (unscoped)** | Placeholder package — **not** the 0.75.x line |

**Recommendation for upgrades:** Bump `@earendil-works/pi-coding-agent` and run `npm install`; verify `npm ls @earendil-works/pi-agent-core @earendil-works/pi-ai` shows a single 0.75.x line. Consider `overrides` if a bundled extension keeps pulling `0.74.x` or `@mariozechner/*` duplicates.

---

## pi-agent-core API surface (0.75.3)

### Entry points

| Export | Purpose |
|--------|---------|
| `Agent` | Stateful agent with `prompt()`, `continue()`, `subscribe()`, tool batching |
| `agentLoop` / `agentLoopContinue` | Low-level async generators (no `Agent` class barrier semantics) |
| `AgentHarness` | Higher orchestration: skills, templates, session phase machine, queues |
| `streamProxy` | Browser/backend proxy streaming |
| Harness: `compact`, `generateSummary`, session repos, `uuidv7`, skills, system-prompt helpers | Shared compaction/session primitives |
| `./node` subpath | Node-specific utilities (`exports["./node"]`) |

### Core concepts (from README)

- **`AgentMessage`** vs LLM `Message`: custom app messages via declaration merging; **`convertToLlm`** required before each LLM call.
- **Event flow:** `agent_start` → `turn_start` → `message_*` → optional `tool_execution_*` → `turn_end` → `agent_end`.
- **Tool execution:** `parallel` (default) or `sequential`; per-tool `executionMode`; `beforeToolCall` / `afterToolCall` hooks.
- **Queues:** steering and follow-up modes (`one-at-a-time` / `all`).

### pi-coding-agent API surface (what pi-flow uses)

| Export | Built on agent-core |
|--------|---------------------|
| `createAgentSession`, `AgentSession` | `new Agent()` + session/extensions |
| `ExtensionAPI`, `ExtensionContext`, hooks | Observes `Agent` / tool events |
| `SessionManager`, `convertToLlm` | Session-shaped messages |
| `createCodingTools`, `createReadTool`, … | `AgentTool` factories |
| `main`, `InteractiveMode`, `RpcClient` | CLI modes |

---

## pi-flow implications

1. **No direct agent-core dependency needed** for current extensions; staying on `pi-coding-agent@^0.75.3` pulls the correct agent-core transitively.
2. **Extension development:** Import types and hooks from `@earendil-works/pi-coding-agent`. Only add `@earendil-works/pi-agent-core` if implementing custom agent loops outside `AgentSession`.
3. **Version upgrades:** Treat `0.75.x` as a **monorepo unit** — read upstream changelog for `packages/agent` and `packages/coding-agent` together.
4. **Subagents / MCP:** `pi-subagents` lists agent-core as an optional peer (`*`); runtime resolution comes from the host Pi install (pi-flow’s coding-agent dep).
5. **Node version:** Upstream Pi 0.75.x declares Node **≥ 22.19.0**; pi-flow documents **≥ 20** — expect possible mismatch warnings; prefer Node 22+ for parity with upstream.
6. **Legacy scope:** Avoid `@mariozechner/pi-agent-core` / `pi-coding-agent` in new code; migrate peer packages (e.g. pi-cursor-provider) when upstream updates land.

---

## Quick reference

```bash
# Versions (research date)
npm view @earendil-works/pi-agent-core version      # 0.75.3
npm view @earendil-works/pi-coding-agent version    # 0.75.3

# pi-flow install tree (after npm install)
npm ls @earendil-works/pi-agent-core @earendil-works/pi-coding-agent
```

| Question | Answer |
|----------|--------|
| What is pi-agent-core? | Agent engine library (Agent + loop + harness) |
| What is pi-coding-agent? | Pi CLI/SDK; depends on agent-core |
| Same version? | Yes — 0.75.3 released together from pi-mono |
| Does pi-flow pin agent-core? | No — transitive via pi-coding-agent `^0.75.3` |
| Should pi-flow extensions import agent-core? | Only if bypassing AgentSession; default is pi-coding-agent |
