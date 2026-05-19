# Browserbase in pi-flow

pi-flow ships **Browserbase MCP** (cloud browser + Stagehand) and the **`browse` CLI** alongside cmux paperflow browsing. Use cmux for `:8767` artifacts; use Browserbase for the open web.

## Quick setup

```text
/pi-flow-setup
```

Or only Browserbase:

```text
/pi-flow-browserbase-setup
/reload
```

This automatically:

- Installs `browse` to `~/.pi/agent/bin` (falls back to global npm or `npx`)
- Merges hosted MCP into `~/.pi/agent/mcp.json`
- Loads `~/.pi/agent/browserbase.env` and verifies `browse cloud projects list`

Manual API key (never commit):

```bash
# ~/.pi/agent/browserbase.env
BROWSERBASE_API_KEY=…
BROWSERBASE_PROJECT_ID=…
```

Optional persistent env file (chmod 600):

```bash
cp settings/browserbase.env.example ~/.pi/agent/browserbase.env
# edit keys, then:
chmod 600 ~/.pi/agent/browserbase.env
source ~/.pi/agent/browserbase.env   # or let pi-flow load it on setup
```

## MCP modes

### Hosted (default)

Merged from `settings/mcp.browserbase.json` into `~/.pi/agent/mcp.json`:

```json
{
  "mcpServers": {
    "browserbase": {
      "type": "http",
      "url": "https://mcp.browserbase.com/mcp",
      "lifecycle": "lazy"
    }
  }
}
```

Easiest path — Browserbase hosts the server. See [MCP introduction](https://docs.browserbase.com/integrations/mcp/introduction) and [MCP setup](https://docs.browserbase.com/integrations/mcp/setup). Agent discovery: [llms.txt](https://docs.browserbase.com/llms.txt).

### Self-hosted stdio

For custom models or flags (`--proxies`, `--keepAlive`, etc.):

```text
/pi-flow-browserbase-setup stdio
```

Uses `npx @browserbasehq/mcp` with env:

| Variable | Required |
|----------|----------|
| `BROWSERBASE_API_KEY` | Yes |
| `BROWSERBASE_PROJECT_ID` | Yes (stdio) |
| `GEMINI_API_KEY` | Only if changing Stagehand model from default |

## MCP tools

| Tool | Input |
|------|-------|
| `start` | (none) |
| `end` | (none) |
| `navigate` | `{ "url": "https://…" }` |
| `act` | `{ "action": "…" }` |
| `observe` | `{ "instruction": "…" }` |
| `extract` | `{ "instruction": "…" }` |

In Pi with pi-mcp-adapter:

```text
mcp({ server: "browserbase" })
mcp({ search: "navigate" })
```

## browse CLI highlights

| Task | Command |
|------|---------|
| List projects | `browse cloud projects list` |
| List sessions | `browse cloud sessions list` |
| Environment check | `browse doctor` |
| Scaffold template | `browse templates clone getting-started-with-browserbase --language typescript` |

## Researcher smoke (browse remote)

```bash
export PATH="$HOME/.pi/agent/bin:$PATH"
browse doctor
browse open "https://docs.browserbase.com/integrations/mcp/introduction" --remote
browse snapshot
browse cloud sessions list
browse stop
```

In Pi, delegate to <code>researcher</code> with <code>/skill:browserbase</code> for MCP (start → navigate → observe → extract → end).

## Verify integration

1. `/pi-flow-browserbase-setup`
2. In Pi: `mcp({ server: "browserbase" })` — server connects
3. Call `start` + `navigate` to a test URL
4. Shell: `browse cloud sessions list` — new session appears
5. `/pi-flow-doctor` — browserbase checks green

## Routing with cmux

| URL / task | Tool |
|------------|------|
| `http://localhost:8767/paperflow/…` | `paperflow_verify`, cmux browser |
| External web research | Browserbase MCP → `researcher` subagent |
| Static page text | `browse` Fetch API |

Full matrix: `lib/browser-routing.md` · skills: `/skill:browserbase` · `/skill:cmux-browser`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Unexpected flow-seq-start` in skills | Quote full YAML values (see autopilot `argument-hint`) |
| MCP server missing | `/pi-flow-browserbase-setup` |
| 403 / invalid API key | Regenerate key at browserbase.com/settings |
| `browse` not found | `npm install -g browse` |
| Stdio MCP fails | Set `BROWSERBASE_PROJECT_ID`; try hosted mode |
| No sessions in cloud list | Confirm `start` ran; check API key with `browse cloud projects list` |

## Security

- Store keys in env or `~/.pi/agent/browserbase.env` only
- pi-flow policy redacts secrets in tool output when `redactSecrets` is on
- Do not paste live keys into plans, grills, or git

## Links

- [mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase)
- [Stagehand](https://github.com/browserbase/stagehand)
- [browse CLI](https://github.com/browserbase/cli)
