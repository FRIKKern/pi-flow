# Integrations index — Research (Browserstorm 20/20)

**Source:** [integrations/get-started.md](https://docs.browserbase.com/integrations/get-started.md)  
**pi-flow context:** Gap analysis vs `docs/BROWSERBASE.md` and this browserstorm set

---

## Summary

Browserbase integrates with AI agents (MCP, Stagehand, ADK, CrewAI), workflow tools (n8n, Temporal, Inngest), payments (Stripe, x402), and platforms (Vercel, OpenClaw, Hermes).

**Prerequisites:** Browserbase API key + third-party credentials as needed.

Featured integrations (doc cards): Braintrust, Stripe, CrewAI, x402, n8n, OpenClaw.

---

## pi-flow coverage (this storm)

| Slot | Topic | pi-flow doc action |
|------|-------|-------------------|
| 1–2 | MCP intro/setup | ✅ `docs/BROWSERBASE.md` |
| 3–4 | Browse CLI + skills | ✅ setup + browse tool |
| 5–7 | Agent-browser, Hermes, OpenClaw | Reference only |
| 8–9 | Concurrency + cost | ✅ agentstorm policy |
| 10–12 | ADK, LangChain, n8n | Reference / optional |
| 13 | Vercel + Stagehand parallel | Slot 13 — SDK path vs MCP |
| 14–17 | x402, security, ZDR, Stripe | Enterprise / niche |
| 18–19 | Temporal, Inngest | Long-running workflow alt |
| 20 | This index | Cross-link `docs/BROWSERBASE.md` |

### Gaps to close in pi-flow docs

1. Document **hosted MCP `browserbaseApiKey`** query param vs env-only merge.  
2. Link **concurrency table** from agentstorm skill.  
3. Add **ZDR/BYOS** pointer for enterprise section.  
4. Point discovery to [llms.txt](https://docs.browserbase.com/llms.txt).

---

## References

- [Get started](https://docs.browserbase.com/integrations/get-started.md)
- [llms.txt](https://docs.browserbase.com/llms.txt)
- pi-flow: `docs/BROWSERBASE.md`, `docs/PI-EXTENSIONS.md`
