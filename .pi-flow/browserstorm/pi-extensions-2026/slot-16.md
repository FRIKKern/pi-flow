# MCP ecosystem for Pi — Research (Browserstorm 16/20)

**Packages:** [pi-mcp-adapter](https://www.npmjs.com/package/pi-mcp-adapter) @ **2.6.1** · Browserbase hosted MCP · stdio `@browserbasehq/mcp`  
**pi-flow:** Bundled adapter + `settings/mcp.browserbase.json`

---

## Summary

pi-flow defaults to **pi-mcp-adapter** (context-efficient `mcp` proxy) plus **hosted Browserbase MCP** for external web. **stdio MCP** remains supported for offline keys, custom env, or non-Browserbase servers. See slot-03 for adapter API detail.

---

## Architecture

```text
Pi agent → pi-mcp-adapter (mcp tool) → MCP SDK → server
                                              ├─ https://mcp.browserbase.com/... (hosted)
                                              └─ npx @browserbasehq/mcp (stdio)
```

| Mode | Context cost | Lifecycle |
|------|----------------|-----------|
| **Raw MCP in Pi** (no adapter) | All tool defs in prompt | Eager |
| **pi-mcp-adapter 2.x** | ~200 tokens + lazy connect | Idle disconnect, disk cache |
| **Direct tools subset** | Optional per-server | Adapter config |

---

## Hosted vs stdio Browserbase

| | Hosted (`mcp.browserbase.json`) | stdio (`@browserbasehq/mcp`) |
|--|--------------------------------|------------------------------|
| **Setup** | API key in URL or env | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, often `GEMINI_API_KEY` |
| **Gemini** | Often subsidized on hosted | Required for Stagehand locally |
| **pi-flow default** | **Yes** (`/pi-flow-browserbase-setup`) | Documented in `docs/BROWSERBASE.md` |
| **Firewall** | HTTPS outbound | subprocess + network |

Six tools: `browserbase_start`, `end`, `navigate`, `act`, `observe`, `extract`.

---

## Other MCP servers

pi-mcp-adapter supports arbitrary servers in `~/.pi/agent/mcp.json` — databases, GitNexus MCP, etc. pi-flow does not bundle them; add per project.

**pi-gitnexus** (slot-14) is an alternative **Pi extension** path to code intelligence (not generic MCP).

---

## Default recommendation for pi-flow

| Layer | Choice |
|-------|--------|
| **Adapter** | `pi-mcp-adapter@2.6.1` (bundled) |
| **Browser automation** | Hosted Browserbase MCP after setup |
| **Researcher agent** | `mcp:browserbase` override per `lib/subagents-policy.md` |
| **Avoid** | pi-mcp-adapter 1.x; eager-load all MCP tools without adapter |

---

## Operational notes

1. **Lazy connect** — first `mcp({ server: "browserbase" })` pays cold-start latency.
2. **Session cleanup** — `browserbase_end` / skill mandates (parallel storms exhaust concurrency).
3. **Hosted URL** — ensure API key query param per current Browserbase docs if connection fails.

---

## References

- slot-03 (pi-mcp-adapter)
- pi-flow: `settings/mcp.browserbase.json`, `docs/BROWSERBASE.md`, `skills/browserbase/SKILL.md`
