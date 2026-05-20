# Browserbase MCP setup — Research (Browserstorm 2/20)

**Source:** [integrations/mcp/setup.md](https://docs.browserbase.com/integrations/mcp/setup.md)  
**pi-flow context:** `settings/mcp.browserbase.json`, `extensions/shared/mcp-browserbase.ts`, `/pi-flow-browserbase-setup`

---

## Summary

Hosted endpoint:

```text
https://mcp.browserbase.com/mcp
```

**Required query param for hosted tool calls:** `browserbaseApiKey` (API key from dashboard).

**Optional query params:** `modelName` (default `google/gemini-2.5-flash-lite`), `modelApiKey`, `keepAlive`, `proxies`, `verified` (boolean strings `"true"` / `"false"`).

### MCP tools (pi-flow researcher surface)

| Tool | Purpose |
|------|---------|
| `start` | Create/reuse session; returns `sessionId` |
| `end` | Close active session |
| `navigate` | `{ "url": "https://…" }` |
| `act` | Natural-language action |
| `observe` | Find elements |
| `extract` | Structured page extraction |

### STDIO extras

Local `npx @browserbasehq/mcp` supports flags: `--proxies`, `--keepAlive`, `--contextId`, viewport size, `--modelName`, `--modelApiKey`, etc. Requires `BROWSERBASE_PROJECT_ID` and often `GEMINI_API_KEY` for non-default models.

---

## pi-flow mapping

| Item | pi-flow |
|------|---------|
| Template | `settings/mcp.browserbase.json` — URL without query param (lazy lifecycle) |
| Setup | `applyBrowserbaseMcp()` merges into `~/.pi/agent/mcp.json`; API key via `browserbase.env` / env load |
| **Gap to verify** | If hosted MCP fails auth, add `?browserbaseApiKey=${BROWSERBASE_API_KEY}` per doc or use pi-mcp-adapter bearer config |
| Modes | `/pi-flow-browserbase-setup` (hosted) · `… stdio` for self-hosted |

After MCP config change: **`/reload`** in Pi.

---

## References

- [MCP setup](https://docs.browserbase.com/integrations/mcp/setup.md)
- pi-flow: `docs/BROWSERBASE.md`
