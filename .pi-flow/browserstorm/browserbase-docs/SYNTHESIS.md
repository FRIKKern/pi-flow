# Browserbase documentation — Browserstorm synthesis

**Track:** `.pi-flow/browserstorm/browserbase-docs/` (20 slots)  
**Boss output:** this file + [docs/BROWSERBASE.md](../../docs/BROWSERBASE.md)  
**Index:** [research.md](../../research.md)

Recovered from run `43370bbc` (memory-recall stubs) via doc fetch from `docs.browserbase.com/*.md` and live research on slot 13 (Vercel).

---

## Executive summary

Browserbase gives pi-flow a **hosted cloud browser** via MCP (Stagehand under the hood) and an optional **`browse` CLI** for terminal workflows. pi-flow’s default path is **hosted Streamable HTTP MCP** merged by `/pi-flow-browserbase-setup`, with researchers using `mcp:browserbase` and `skills/browserbase`.

**Critical operator facts:**

| Topic | Takeaway |
|-------|----------|
| **MCP auth** | Hosted URL may need `?browserbaseApiKey=…` per [setup](https://docs.browserbase.com/integrations/mcp/setup.md); pi-flow template uses bare URL + env — verify if tools fail |
| **Concurrency** | Free plan **3** concurrent browsers; agentstorm default **4** → cap at 3 on free |
| **Cost** | **1-minute minimum** per session; end sessions when done |
| **Routing** | cmux `:8767` for paperflow artifacts; Browserbase for external web (`lib/browser-routing.md`) |
| **Enterprise** | ZDR + BYOS for regulated workloads (slots 15–16) |

---

## Slot index

| Slot | File | Topic | pi-flow relevance |
|------|------|-------|-------------------|
| 1 | [slot-01.md](./slot-01.md) | MCP introduction | Default integration path |
| 2 | [slot-02.md](./slot-02.md) | MCP setup | Tools, query params, `/reload` |
| 3 | [slot-03.md](./slot-03.md) | Browse CLI | `paperflow_browse`, setup script |
| 4 | [slot-04.md](./slot-04.md) | Skills intro | `skills/browserbase/` |
| 5 | [slot-05.md](./slot-05.md) | Agent-browser | Alt to MCP |
| 6 | [slot-06.md](./slot-06.md) | Hermes | External agent host |
| 7 | [slot-07.md](./slot-07.md) | OpenClaw | Plugin / CLI path |
| 8 | [slot-08.md](./slot-08.md) | Concurrency | agentstorm vs plan limits |
| 9 | [slot-09.md](./slot-09.md) | Cost optimization | Session minimums |
| 10 | [slot-10.md](./slot-10.md) | Google ADK | Reference |
| 11 | [slot-11.md](./slot-11.md) | LangChain | Reference |
| 12 | [slot-12.md](./slot-12.md) | n8n | Workflow alt |
| 13 | [slot-13.md](./slot-13.md) | Vercel + Stagehand | Parallel SDK pattern vs MCP |
| 14 | [slot-14.md](./slot-14.md) | x402 | Crypto pay-per-use |
| 15 | [slot-15.md](./slot-15.md) | Enterprise security | Compliance |
| 16 | [slot-16.md](./slot-16.md) | ZDR | No logs/replay retention |
| 17 | [slot-17.md](./slot-17.md) | Stripe | Agentic payments |
| 18 | [slot-18.md](./slot-18.md) | Temporal | Durable workflows |
| 19 | [slot-19.md](./slot-19.md) | Inngest | Event-driven agents |
| 20 | [slot-20.md](./slot-20.md) | Integrations index | Gap list |

Duplicate: [slot-13-vercel.md](./slot-13-vercel.md) (same as slot-13).

---

## Architecture (pi-flow)

```
Pi session (boss)
  ├── cmux :8767 → paperflow browse / verify (local artifacts)
  └── mcp:browserbase → hosted MCP → Stagehand → cloud browser
        └── agentstorm researchers (parallel, per-slot markdown)
```

| Layer | Package / config |
|-------|------------------|
| MCP merge | `settings/mcp.browserbase.json` |
| Env | `~/.pi/agent/browserbase.env` |
| Adapter | `pi-mcp-adapter` (proxy tools) |
| Policy | `lib/browser-routing.md`, `lib/subagents-policy.md` |
| Storm outputs | `.pi-flow/browserstorm/browserbase-docs/slot-NN.md` only |

---

## Recommended pi-flow doc updates

1. **MCP URL** — Document optional `browserbaseApiKey` query param in `docs/BROWSERBASE.md` (slot-02).  
2. **Concurrency table** — Link from `skills/agentstorm/SKILL.md` (slot-08).  
3. **Cost** — Note 1-minute minimum in agentstorm operator guide (slot-09).  
4. **Discovery** — Point agents to [llms.txt](https://docs.browserbase.com/llms.txt).  
5. **Enterprise** — ZDR/BYOS subsection (slots 15–16).

---

## Production alignment

Same stack as [docs/PI-EXTENSIONS.md](../../docs/PI-EXTENSIONS.md): Node **≥22.19.0**, `pi-mcp-adapter@2.6.1`, memory recall **disabled in child sessions** (prevents storm stub pollution).

---

## References

- [Browserbase llms.txt](https://docs.browserbase.com/llms.txt)
- [pi-flow BROWSERBASE.md](../../docs/BROWSERBASE.md)
- [PI-EXTENSIONS synthesis](../../docs/PI-EXTENSIONS.md)
