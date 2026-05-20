# Browserbase MCP introduction — Research (Browserstorm 1/20)

**Source:** [integrations/mcp/introduction.md](https://docs.browserbase.com/integrations/mcp/introduction.md)  
**pi-flow context:** `docs/BROWSERBASE.md`, `settings/mcp.browserbase.json`, `skills/browserbase/SKILL.md`, `lib/browser-routing.md`

---

## Summary

The Browserbase MCP server gives any MCP client a cloud browser built on **Stagehand**. Agents use natural-language commands (`act`, `observe`, `extract`) plus explicit session lifecycle tools.

| Transport | Recommendation |
|-----------|----------------|
| **Hosted Streamable HTTP** | `https://mcp.browserbase.com/mcp` — Browserbase infrastructure (default for pi-flow) |
| **STDIO** | `npx @browserbasehq/mcp` — local process, more env flags |

**Key features (doc):** natural-language automation, navigate/click/fill, structured extraction, session create/reuse/close.

---

## pi-flow mapping

| Topic | pi-flow choice |
|-------|----------------|
| Default path | Hosted MCP merged by `/pi-flow-browserbase-setup` into `~/.pi/agent/mcp.json` |
| Researcher | `mcp:browserbase` in `settings/defaults.json` + `skills/browserbase` |
| vs cmux | `:8767` paperflow artifacts stay on cmux; Browserbase = external web (`lib/browser-routing.md`) |
| Adapter | `pi-mcp-adapter` proxy tool (~200 tokens) — not raw MCP tool dump |

**Do not** mix cmux paperflow browse and Browserbase MCP on the same orchestrator step.

---

## References

- [MCP introduction](https://docs.browserbase.com/integrations/mcp/introduction.md)
- [llms.txt index](https://docs.browserbase.com/llms.txt)
