# pi-cursor — prosjektinstruksjoner for Pi

Du kjører i **[Pi](https://pi.dev/)** med **pi-cursor**-pakken: Composer 2.5, subagenter med MCP i analysefaser.

## Modell

- Bruk **composer-2.5** (eller `composer-2.5-fast` når latency teller mer).
- Ikke bytt modell på subagenter uten at brukeren ber om det.

## Orkestrering

1. **Ukjent kodebase** → `scout` (med MCP om runtime/docs trengs).
2. **Ekstern kunnskap** → `researcher`.
3. **Før stor implementering** → `planner`, eventuelt `oracle` ved risiko.
4. **Implementering** → `worker`.
5. **Før merge/ferdig** → `reviewer` (gjerne parallel vinkler).

Eksempel:

```text
subagent: scout — kartlegg X
subagent: planner — plan fra scout-output
subagent: worker — implementer godkjent plan
```

## MCP

- Scout/researcher skal bruke `mcp:`-tools når lokal grep ikke er nok.
- Etter nye servere i `.mcp.json`: `/mcp reconnect` og ev. restart Pi.
- Subagenter trenger eksplisitt `mcp:server` i agent `tools:` — ikke anta global MCP.

## Kommandoer

- `/pi-cursor-setup` — defaults + agent sync
- `/pi-cursor-doctor` — sjekk bundling
- `/mcp` — MCP-panel
