---
name: browserbase
description: >-
  Cloud browser automation for pi-flow — Browserbase MCP (Stagehand) and browse CLI.
  Use for external sites, JS-heavy apps, and research; use cmux-browser for localhost:8767 paperflow HTML.
argument-hint: "[action or URL]"
---

# browserbase (pi-flow)

Expert browser automation when **cmux WKWebView** is not enough. Pair with **`/skill:cmux-browser`** for paperflow docs on `:8767`.

## Choose the right surface

| Task | Use |
|------|-----|
| Plan/grill/goal HTML on paperflow host | `paperflow_verify` · cmux browser · `/skill:cmux-browser` |
| Grill **Submit** back to Pi | Native grill.js in cmux (do not re-click unless debugging) |
| External product sites, login, SPAs, scraping | **Browserbase MCP** (this skill) |
| Fast static fetch / search | `browse` Fetch API · Search API (`browse --help`) |
| Session / project admin | `browse cloud …` CLI |

See `lib/browser-routing.md`.

## Setup (once per machine)

From Pi (preferred — works in cmux minimal PATH):

```text
paperflow_browse({ action: "install" })
```

Or:

```text
/pi-flow-browserbase-setup
```

Or manually:

```bash
npm install -g browse
export BROWSERBASE_API_KEY=…   # browserbase.com/settings — never commit
browse cloud projects list
```

MCP is merged into `~/.pi/agent/mcp.json` (hosted SHTTP by default). Self-hosted stdio:

```text
/pi-flow-browserbase-setup stdio
```

Set `BROWSERBASE_PROJECT_ID` (and optional `GEMINI_API_KEY`) in env or `~/.pi/agent/browserbase.env` for stdio.

## MCP tools (via `mcp` in Pi)

| Tool | Purpose |
|------|---------|
| `start` | Create or reuse a Browserbase session |
| `end` | Close session |
| `navigate` | `{ "url": "https://…" }` |
| `act` | `{ "action": "click the login button" }` |
| `observe` | `{ "instruction": "find the search box" }` |
| `extract` | `{ "instruction": "get product titles" }` |

**Pattern:**

```text
mcp({ server: "browserbase" })
mcp({ tool: "browserbase_start", args: "{}" })
mcp({ tool: "browserbase_navigate", args: "{\"url\":\"https://example.com\"}" })
mcp({ tool: "browserbase_observe", args: "{\"instruction\":\"list main nav links\"}" })
mcp({ tool: "browserbase_act", args: "{\"action\":\"click Pricing\"}" })
mcp({ tool: "browserbase_extract", args: "{\"instruction\":\"pricing tier names and prices\"}" })
mcp({ tool: "browserbase_end", args: "{}" })
```

Use `mcp({ search: "browserbase" })` if tool names are prefixed differently after connect.

## browse CLI (diagnostics)

```bash
browse --help
browse cloud projects list
browse cloud sessions list
browse doctor
```

After a successful MCP session, `browse cloud sessions list` should show a new session.

## Delegation

| Need | Dispatch |
|------|----------|
| External docs / competitor sites | `researcher` (MCP + this skill) |
| One-shot paperflow HTML check | `pi-flow.cmux-verifier` — not Browserbase |
| Implement browser-related code in repo | `worker` |

## Verify before done

1. `mcp({ tool: "…_start" })` then navigate — no auth errors
2. `browse cloud sessions list` shows activity (when API key set)
3. `/pi-flow-doctor` — browserbase rows pass or documented SKIP

## References

- `docs/BROWSERBASE.md`
- [Browserbase MCP](https://github.com/browserbase/mcp-server-browserbase)
- [browse CLI](https://github.com/browserbase/cli)
