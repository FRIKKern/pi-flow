---
name: pi-cursor
description: >-
  pi-cursor arbeidsflyt: scout/research med MCP, plan, worker, reviewer.
  Bruk når du jobber i Pi med Composer 2.5 og trenger MCP-tunge subagenter.
---

# pi-cursor workflow

Standard løkke i **Pi** (ikke Cursor IDE):

```
scout → (researcher) → planner → worker → reviewer
```

## Når du bruker hvilken agent

| Agent | Bruk når |
|-------|----------|
| `scout` | Du ikke vet hvor i kodebasen du skal starte; trenger kart + MCP browser |
| `researcher` | Ekstern docs/API; `mcp:context7` eller andre MCP du har konfigurert |
| `planner` | Du har nok kontekst og trenger faser før implementering |
| `worker` | Godkjent plan — implementer |
| `oracle` | Risikabelt valg før du committer til retning |
| `reviewer` | Diff er klar; vil ha review-loop |

## Eksempler (naturlig språk i Pi)

```text
Bruk scout til å kartlegge auth-flyten. Bruk mcp hvis du trenger runtime-oppførsel.
```

```text
Kjør parallel: scout på backend og researcher på offisiell OAuth-dokumentasjon.
```

```text
Når scout er ferdig: planner → worker → parallel reviewers (correctness, tests).
```

## MCP på subagenter

Subagenter får MCP **kun** via `tools: …, mcp:server` i agent-frontmatter. Global `directTools` i `.mcp.json` er ikke nok alene.

Etter nye MCP-servere: `/mcp reconnect <server>` og restart Pi før direct tools.

## Modell

Alle pi-cursor-agenter er satt til **composer-2.5**. Parent skal også bruke `/model` → composer-2.5 etter `/login cursor`.
