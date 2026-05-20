# Browserbase + Vercel (Stagehand, parallel sessions) — Research (Browserstorm 13/20)

**Source:** [Vercel quickstart](https://docs.browserbase.com/integrations/vercel/quickstart.md)  
**Related:** [Vercel introduction](https://docs.browserbase.com/integrations/vercel/introduction.md) · [browserbase-nextjs-template](https://github.com/browserbase/browserbase-nextjs-template) · [Stagehand docs](https://docs.stagehand.dev/)  
**pi-flow context:** `docs/BROWSERBASE.md`, `settings/mcp.browserbase.json`, `skills/browserbase/SKILL.md`, `lib/browser-routing.md`, `lib/subagents-policy.md`

---

## Summary

Browserbase’s Vercel quickstart describes a **Next.js research agent** that runs **up to five parallel cloud browsers** (one Stagehand instance per source), streams partial results over **SSE**, and **synthesizes** findings with the **Vercel AI SDK** (`generateObject` + Anthropic). This is **direct Stagehand SDK** integration (`@browserbasehq/stagehand`), not the Browserbase MCP server pi-flow uses by default. pi-flow has **no Vercel/Next.js app** in-repo; the useful mapping is architectural: parallel multi-session research vs pi-flow’s single-session MCP tools and **agentstorm** subagent concurrency.

---

## Stack (quickstart)

| Layer | Package / API | Role |
|-------|----------------|------|
| Cloud browsers | `@browserbasehq/sdk` | Sessions, `sessions.debug()` live view URLs |
| Browser agent | `@browserbasehq/stagehand` | `init()`, `extract()`, page via `stagehand.context.activePage()` |
| Orchestration LLM | `ai` + `@ai-sdk/anthropic` | Final structured summary (`generateObject` + Zod schema) |
| Runtime | Vercel serverless (`export const maxDuration = 300`) | Long-running research route |
| Env | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `ANTHROPIC_API_KEY` | Template requires project ID explicitly |

**Install (doc):** `npm i @browserbasehq/stagehand @browserbasehq/sdk ai @ai-sdk/anthropic zod`

---

## Parallel sessions pattern

Each research source gets its own Stagehand instance on Browserbase. Default template runs five sources (Google News, HN, YouTube, Wikipedia, DuckDuckGo search).

**Parallel path (paid concurrency > 1):**

1. `Promise.all` to create N Stagehand sessions.
2. SSE `liveViews` event with debugger URLs.
3. `Promise.allSettled` for extraction per source.
4. `finally`: `stagehand.close()` on every session.

**Sequential fallback (free plan, concurrency = 1):** loop sources one-by-one; SSE `mode` reports `{ isSequential, concurrency }`.

---

## Stagehand vs MCP (pi-flow default)

| Capability | Vercel quickstart (Stagehand SDK) | pi-flow (Browserbase MCP) |
|------------|-----------------------------------|---------------------------|
| API | TypeScript `page.goto`, `stagehand.extract(zod)` | Six MCP tools: start/end/navigate/act/observe/extract |
| Sessions | Many Stagehand instances | Typically one session per MCP connection |
| Streaming | HTTP SSE from Next.js route | Pi tool results |
| Deploy | Vercel | Pi / cmux / local MCP |

---

## pi-flow mapping

| Topic | Vercel quickstart | pi-flow |
|-------|-------------------|---------|
| Parallel browsers | `Promise.all` on 5 Stagehand sessions | **agentstorm** parallelizes **researcher** subagents (`defaultConcurrency: 4`) |
| Multi-source research | Fixed 5 functions in one HTTP request | `/pf-storm` with per-slot outputs |
| Live debugging | `sessions.debug()` URLs | `browse cloud sessions list` |
| Credentials | `.env.local` on Vercel | `~/.pi/agent/browserbase.env` |

**Effective parallel browse** ≈ `min(agentstorm concurrency, Browserbase plan concurrency)`.

---

## Operational notes

- Free Browserbase **concurrency = 1** → sequential only in template; agentstorm still queues 4 researchers but each may need sequential browser use on free tier.
- Template uses **Anthropic** for Stagehand + synthesis; pi-flow hosted MCP may not require Gemini key on hosted path.
- Do not mix Vercel Stagehand app + hosted MCP on the same task without clear separation.

---

## References

- [Vercel quickstart](https://docs.browserbase.com/integrations/vercel/quickstart.md)
- pi-flow: `docs/BROWSERBASE.md`, `docs/PI-EXTENSIONS.md` (agentstorm guards)
