# pi-mcp-adapter — Research (Browserstorm 3/20)

**Package:** [pi-mcp-adapter](https://www.npmjs.com/package/pi-mcp-adapter)  
**Repository:** [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter)  
**pi-flow context:** `settings/mcp.browserbase.json`, `lib/browser-routing.md`, researcher `mcp:browserbase` overrides

---

## Summary

`pi-mcp-adapter` is the official Pi extension for **Model Context Protocol (MCP)** servers. Instead of registering every MCP tool in the system prompt (often 10k+ tokens per server), it exposes a single **`mcp` proxy tool** (~200 tokens) plus optional **direct tools** for high-value subsets. Servers default to **lazy lifecycle** (connect on first use, idle disconnect, metadata cached on disk).

Install: `pi install npm:pi-mcp-adapter` — restart Pi after install.

**Latest npm:** `2.6.1` (2026-05-13). Use **2.x** for current Pi (`@earendil-works/pi-coding-agent` 0.75.x). The 1.x line is obsolete (eager startup, no cache, no direct tools / MCP UI).

---

## Version

| Field | Value |
|-------|--------|
| **Latest** | `2.6.1` |
| **dist-tag** | `latest` → `2.6.1` |
| **License** | MIT |
| **Type** | `module` |
| **Extension entry** | `./index.ts` (via `package.json` → `pi.extensions`) |
| **CLI** | `pi-mcp-adapter` (`init` scans host configs) |
| **Runtime deps** | `@modelcontextprotocol/sdk`, `@earendil-works/pi-ai`, `@earendil-works/pi-tui`, `typebox`, `open`, `zod` |
| **Peer deps** | `zod` ^3.25 \|\| ^4 |
| **devDeps (tested floor)** | `@earendil-works/pi-coding-agent` ^0.74.0 |

Published 1.x on npm ends at **`1.5.1`**; changelog also documents **`1.6.0`** (unified Pi-tool search) immediately before **`2.0.0`** — treat 2.0+ as the supported line.

---

## Core features (2.6.x)

### Context-efficient proxy

| Mode | Example |
|------|---------|
| Status | `mcp({ })` |
| List server | `mcp({ server: "name" })` |
| Search | `mcp({ search: "screenshot navigate" })` |
| Describe | `mcp({ describe: "tool_name" })` |
| Call | `mcp({ tool: "...", args: '{"key": "value"}' })` |
| Connect | `mcp({ connect: "server-name" })` |
| UI messages | `mcp({ action: "ui-messages" })` |

- **`args` is a JSON string**, not an object (since 1.5.0; required for some provider schema limits).
- Search matches MCP tools **and** native Pi extension tools (`[pi tool]` prefix).
- Fuzzy name matching: hyphens ↔ underscores (`resolve-library-id` ↔ `resolve_library_id`).
- Compact collapsed result rows in TUI (2.6.0); full payload still available expanded.

### Lifecycle & performance

| `lifecycle` | Behavior |
|-------------|----------|
| **`lazy`** (default since 2.0) | No connect at startup; connect on first tool call; idle disconnect (default 10 min) |
| **`eager`** | Connect at startup; no auto-reconnect on drop unless reconnect |
| **`keep-alive`** | Connect at startup; health checks + auto-reconnect; no idle timeout |

- **Metadata cache** (`<agent-dir>/mcp-cache.json`): search / list / describe work without live connections.
- **npx resolution cache** (`mcp-npx-cache.json`): resolves `npx` packages to direct binaries (~143 MB npm parent avoided).
- **Failure backoff** (60s), in-flight calls block idle shutdown.

### Direct tools

Promote selected MCP tools to first-class Pi tools (name + schema in system prompt, ~150–300 tokens each):

```json
{
  "mcpServers": {
    "browserbase": {
      "url": "https://mcp.browserbase.com/mcp",
      "directTools": ["browserbase_stagehand_navigate", "browserbase_stagehand_act"]
    }
  }
}
```

| `directTools` | Effect |
|---------------|--------|
| `true` | All tools from server |
| `["tool_a", ...]` | Named subset (original MCP names) |
| omitted / `false` | Proxy only |

Global default via `settings.directTools`; per-server override. `excludeTools` hides tools from direct + proxy + `/mcp` panel. `settings.disableProxyTool` hides proxy when cache-backed direct tools are ready.

### Transports & auth

| Transport | Config |
|-----------|--------|
| **Stdio** | `command` + `args` (+ `env`, `cwd`) |
| **HTTP (remote / hosted)** | `url` — Streamable HTTP with SSE fallback |

| Auth | Config |
|------|--------|
| Bearer | `auth: "bearer"`, `bearerToken` / `bearerTokenEnv` |
| OAuth (interactive) | `auth: "oauth"` — `/mcp-auth`, `/mcp` panel (`ctrl+a`), `settings.autoAuth` |
| OAuth M2M | `oauth.grantType: "client_credentials"` (2.3.2+) |

Env interpolation: `${VAR}`, `$env:VAR` in `env`, `headers`, `bearerToken`, `cwd` (with `~` expansion on `cwd`).

### MCP UI (2.2+)

Tools with `_meta.ui.resourceUri` open interactive UIs (MCP UI standard):

- Browser fallback or native **Glimpse** on macOS (`pi install npm:glimpseui`).
- Bidirectional messages → `mcp({ action: "ui-messages" })` + agent turn via `triggerTurn()`.
- Session reuse: same tool updates existing window instead of replacing.

### Commands & setup

| Command | Purpose |
|---------|---------|
| `/mcp` | Interactive panel (servers, tools, direct/proxy toggles, reconnect) |
| `/mcp setup` | Guided imports, scaffold `.mcp.json`, RepoPrompt quick-add, write previews |
| `/mcp tools` | List all tools |
| `/mcp reconnect` | All servers, or `/mcp reconnect <server>` |
| `/mcp logout <server>` | Clear OAuth + disconnect (2.6.1) |
| `/mcp-auth` | OAuth picker (2.6.0) or `/mcp-auth <server>` |

Post-install: `pi-mcp-adapter init` — detect Cursor / Claude Code / Codex / etc. and write compatibility `imports` to Pi agent dir.

### Other

- **Config imports:** `cursor`, `claude-code`, `claude-desktop`, `vscode`, `windsurf`, `codex`
- **MCP sampling** (2.5.0): servers can request Pi model samples; human approval by default; `samplingAutoApprove` for headless
- **Subagent frontmatter:** `mcp:server-name` or `mcp:server/tool` (requires adapter + explicit subagent `tools` line)
- **Limitations:** no cross-session server sharing; sampling text-only; each Pi session owns processes

---

## Hosted MCP support

“Hosted MCP” here means **remote HTTP MCP endpoints** (vendor runs the server; Pi connects over the network). The adapter does **not** host MCP servers itself — it is the **client adapter** inside Pi.

### How Pi connects to hosted servers

```json
{
  "mcpServers": {
    "my-hosted": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${MY_TOKEN}" },
      "auth": "oauth",
      "lifecycle": "lazy",
      "idleTimeout": 10
    }
  }
}
```

- Transport: **HTTP** (`url`); falls back StreamableHTTP → SSE.
- Auth: bearer token, OAuth authorization code, or `client_credentials` for machine auth.
- Lazy + cache: hosted servers are not held open until needed; tool discovery uses disk cache.

### pi-flow default: Browserbase hosted MCP

pi-flow’s default cloud browser path uses **Browserbase’s hosted MCP** at `https://mcp.browserbase.com/mcp` (`settings/mcp.browserbase.json`):

```json
{
  "mcpServers": {
    "browserbase": {
      "type": "http",
      "url": "https://mcp.browserbase.com/mcp",
      "lifecycle": "lazy",
      "idleTimeout": 10
    }
  }
}
```

| Mode | When |
|------|------|
| **Hosted HTTP** (default) | API key via env; Browserbase runs MCP — merged by `/pi-flow-browserbase-setup` |
| **Self-hosted stdio** | `npx @browserbasehq/mcp` — needs `BROWSERBASE_PROJECT_ID` + model keys |

Pi usage after setup: `mcp({ server: "browserbase" })`, proxy search/call, or researcher subagent with `tools: read, bash, mcp:browserbase` (direct tools only when listed in frontmatter).

---

## Version 2.x vs 1.x

| Area | **1.x** (≤1.5.1 npm) | **2.x** (2.0+ → 2.6.1) |
|------|----------------------|-------------------------|
| **Startup** | Connect all servers eagerly (parallel since 1.3) | **Lazy by default**; optional eager / keep-alive |
| **Context** | Single `mcp` proxy only | Proxy + **directTools**, optional `disableProxyTool` |
| **Discovery offline** | Needs live connection for full metadata | **Disk metadata cache**; search/list/describe without connect |
| **Idle / resources** | Keep-alive only pattern | Configurable **idle timeout**, npx binary cache |
| **OAuth** | Basic `/mcp-auth` | Full callback server, autoAuth, client_credentials, logout, picker |
| **UI** | None | **MCP UI** + Glimpse (2.2+) |
| **Config** | Pi agent `mcp.json` + imports | **Shared MCP first**: `~/.config/mcp/mcp.json`, `.mcp.json`, Pi overrides; `/mcp setup`, `pi-mcp-adapter init` |
| **Pi SDK scope** | `@mariozechner/*` era | **`@earendil-works/*`** since 2.6.0 |
| **Breaking** | `args` → JSON string (1.5.0) | **2.0.0:** lazy default replaces always-on connections |

**Migration from 1.x:** Install latest 2.6.x, run `/mcp setup` or `pi-mcp-adapter init`, move shared servers to `.mcp.json` / `~/.config/mcp/mcp.json`. For servers that must be always connected, set `"lifecycle": "keep-alive"` per server (restores 1.x-style availability).

### Notable 2.x release milestones

| Version | Highlights |
|---------|------------|
| **2.0.0** | Lazy default, metadata cache, idle timeout, `mcp({ connect })`, fuzzy tool names |
| **2.1.0** | `directTools`, `/mcp` TUI panel, subagent `MCP_DIRECT_TOOLS` env |
| **2.2.0** | MCP UI, Glimpse, session reuse |
| **2.3.x** | OAuth callback lifecycle, `client_credentials` |
| **2.4.x** | Standard MCP config precedence, `init`, `/mcp setup`, `autoAuth`, `excludeTools` |
| **2.5.x** | MCP sampling, `PI_CODING_AGENT_DIR` for all state paths |
| **2.6.x** | `@earendil-works/*` migration, compact results, `/mcp-auth` picker, `/mcp logout` |

---

## Integration with Pi Code

“Pi Code” = the **Pi coding agent** (`@earendil-works/pi-coding-agent`) and its extension/package ecosystem.

### Install & extension loading

```bash
pi install npm:pi-mcp-adapter
# optional: pi-mcp-adapter init
/reload   # or restart Pi
```

- Registered via `package.json` → `"pi": { "extensions": ["./index.ts"] }`.
- Keyword `pi-package` for Pi’s npm extension browser.
- Depends on Pi TUI for `/mcp` panel, OAuth UI, sampling approval.

### Config layout (precedence)

1. `~/.config/mcp/mcp.json` — user-global shared  
2. `<agent-dir>/mcp.json` — Pi global override (`~/.pi/agent/mcp.json`, or `$PI_CODING_AGENT_DIR/mcp.json`)  
3. `.mcp.json` — project shared  
4. `.pi/mcp.json` — Pi project override  

Pi-owned writes (imports, `directTools` toggles from panel) target agent-dir / `.pi/mcp.json`. Changing direct tools triggers Pi **reload** (same as `/reload`) so tools re-register without manual restart.

### Agent tool surface

| Surface | How LLM sees MCP |
|---------|------------------|
| **Proxy** | One `mcp` tool; discover via search/describe |
| **Direct** | Named tools alongside `read`, `bash`, `edit`, … |
| **Subagent** | Parent passes `mcp:server` selections; child gets direct MCP tools only if frontmatter lists `mcp:…` (global `directTools: true` alone is insufficient) |

Requires **pi ≥0.59** behavior: direct/proxy tools expose `promptSnippet` in Available tools (2.2.1).

### Pairing with pi-coding-agent 0.75.x

| Goal | Recommendation |
|------|----------------|
| **Production** | `pi-mcp-adapter@2.6.1` + `@earendil-works/pi-coding-agent@0.75.3` |
| **Minimum** | `2.6.0+` (earendil import migration) |
| **Avoid** | 1.x adapters with 0.75.x; pre-2.6.0 2.x on 0.75 may still import `@mariozechner/*` |

Install core agent globally or per project:

```bash
npm install -g @earendil-works/pi-coding-agent@0.75.3
pi install npm:pi-mcp-adapter@2.6.1
pi install npm:pi-subagents@0.24.3   # if using mcp: in subagent frontmatter
```

### Companion extensions

| Extension | Relationship |
|-----------|----------------|
| **pi-subagents** | `tools: mcp:browserbase` in agent `.md` frontmatter |
| **glimpseui** | Native MCP UI windows on macOS |
| **pi-web-access** | Separate from MCP; researcher may use both |

---

## pi-flow relevance

| Use case | How pi-mcp-adapter fits |
|----------|-------------------------|
| **Browserstorm / external web** | Hosted **Browserbase** MCP in `~/.pi/agent/mcp.json`; researcher override `mcp:browserbase` in `settings/defaults.json` |
| **Orchestrator** | Parent uses proxy `mcp({ search })` or delegates to researcher; do not mix cmux paperflow with Browserbase on same step (`lib/browser-routing.md`) |
| **Setup** | `/pi-flow-browserbase-setup` merges hosted JSON; `/reload` after MCP config changes |
| **Token budget** | Lazy + proxy keeps agentstorm sessions from loading all MCP schemas upfront; promote only hot tools via `directTools` if needed |

Without `pi-mcp-adapter`, `mcp:browserbase` in subagent config has no effect — Browserbase agentstorms “not working” is a common misconfiguration (see `lib/subagents-policy.md`).

---

## Sources

- npm: [pi-mcp-adapter@2.6.1](https://www.npmjs.com/package/pi-mcp-adapter) README (2026-05-13)
- GitHub: [CHANGELOG.md](https://github.com/nicobailon/pi-mcp-adapter/blob/main/CHANGELOG.md)
- pi-flow: `settings/mcp.browserbase.json`, `docs/BROWSERBASE.md`, `lib/browser-routing.md`, `lib/subagents-policy.md`
- Related: [pi-subagents](https://www.npmjs.com/package/pi-subagents) README (`mcp:` frontmatter)
- Pi mono / packages: `@earendil-works/pi-coding-agent` 0.75.3
