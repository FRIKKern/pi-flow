# Browser routing (pi-flow)

Orchestrators pick **one** primary browser surface per task. Do not run cmux browser and Browserbase on the same verification step unless debugging.

## Decision tree

```text
Is the URL http://localhost:8767/paperflow/… ?
  yes → paperflow_verify / cmux-browser (WKWebView in workspace)
  no  → Is it a public or staging web app outside paperflow?
          yes → Browserbase MCP (start → navigate → act/observe/extract → end)
          no  → browse Fetch API if static HTML is enough
```

## CMUX browser (paperflow)

| Strength | Limit |
|----------|-------|
| Same workspace as Pi; auto-open after doc-writer | WKWebView — no full Playwright trace |
| Grill Submit bridge to terminal | No network mocking / viewport matrix |
| `paperflow_verify` one-shot | Outside cmux: verify → SKIP |

Commands: `paperflow_cmux` · `cmux browser …` · `/skill:cmux-browser`

## Browserbase (cloud)

| Strength | Limit |
|----------|-------|
| Real cloud Chromium; Stagehand act/observe/extract | Needs API key + MCP or CLI |
| External sites, auth flows, SPAs | Not for localhost paperflow grill UX |
| Hosted MCP at mcp.browserbase.com (default pi-flow config) | Stdio mode needs PROJECT_ID + model key |

Pi: `mcp({ server: "browserbase" })` · `/skill:browserbase` · `/pi-flow-browserbase-setup`

## When to delegate

| Agent | Browser |
|-------|---------|
| `pi-flow.cmux-verifier` | paperflow URLs only |
| `researcher` | Browserbase MCP for external research |
| `scout` | Repo only — no browser |
| Parent orchestrator | Chooses surface; never skip verify on plan/grill |

## Anti-patterns

- Using Browserbase to open `:8767` plan HTML when cmux + `paperflow_verify` already work
- Replacing grill **Submit** with MCP clicks
- Leaving Browserbase sessions open — always `end` when done
- Committing `BROWSERBASE_API_KEY` to git
