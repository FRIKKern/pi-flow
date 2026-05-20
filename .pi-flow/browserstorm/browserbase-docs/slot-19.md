# Inngest + Stagehand AgentKit — Research (Browserstorm 19/20)

**Source:** [integrations/inngest/stagehand.md](https://docs.browserbase.com/integrations/inngest/stagehand.md)  
**pi-flow context:** Event-driven long-running agents vs pi-flow agentstorm

---

## Summary

Inngest orchestrates **durable, event-driven** functions; Browserbase documents wiring **Stagehand AgentKit** so browser steps (`goto`, `observe`, `extract`, `act`) run inside Inngest steps with retries and observability.

| Pattern | Role |
|---------|------|
| Inngest functions | Trigger on events, schedule, or cron |
| Stagehand AgentKit | Browser automation inside each step |
| Browserbase | Cloud browser sessions backing Stagehand |

Use when workflows need **sleep, wait-for-event, and replay** across hours/days — not for one-shot parallel research bursts.

---

## pi-flow mapping

| Topic | pi-flow |
|-------|---------|
| Orchestration | **agentstorm** + beads for parallel research; no Inngest dependency |
| Browser | Hosted **MCP** (`mcp:browserbase`) not AgentKit SDK |
| When to choose Inngest | Production pipelines with external triggers (webhooks, queues) outside Pi |

---

## References

- [Inngest + Stagehand](https://docs.browserbase.com/integrations/inngest/stagehand.md)
- Compare: slot-18 (Temporal), slot-13 (Vercel SSE parallel)
