# pi-cursor — CMUX + Paperflow

Pi-distribusjon for **[cmux](https://github.com/manaflow-ai/cmux)** med arbeidsflyt lært fra **[FRIKKern/paperflow](https://github.com/FRIKKern/paperflow)**.

**Modell:** Composer 2.5 only (`/login cursor`, `/model` → composer-2.5).

## Mental model (paperflow)

```text
Goal → Plan (HTML) → Grill (pause) → Revise → Build (bd loop) → Review
```

- **HTML er planleggingsformatet** — ikke engangs-Markdown i chat (`~/docs/paperflow/...` + localhost:8767 når host er installert).
- **Beads (`bd`)** er persistent state; pointers i `.paperflow/active-{goal,phase}`.
- **Orchestrator koordinerer**; subagenter implementerer (se `lib/paperflow-thresholds.md`).

## CMUX stack (anbefalt)

| Lag | Rolle |
|-----|--------|
| **cmux** | Terminal + browser + dock |
| **paperflow host** | `install.sh` — daemon, grill Submit → terminal, doc auto-open |
| **Pi + pi-cursor** | Composer 2.5, MCP subagents, `/skill:paperflow-*` |

Uten paperflow host: Pi + `docs/paperflow/*.html` + grill-svar i chat fungerer fortsatt.

## Skills (slash i Pi)

| Skill | Når |
|-------|-----|
| `/skill:paperflow-goal` | Nytt mål, epic + faser |
| `/skill:paperflow-plan` | Draft → grill → revise |
| `/skill:paperflow-build` | Claim → worker → verify → close |
| `/skill:paperflow-review` | Approve / reject |
| `/skill:paperflow-autopilot` | Hele kjeden (pauser ved grill) |
| `/skill:paperflow-resume` | Bytt aktiv Goal |
| `/skill:pi-cursor` | Kort agent-referanse |

## Agenter (pi-cursor.*)

| Agent | Rolle |
|-------|--------|
| `doc-writer` | HTML plan/grill/spec (ingen bash) |
| `bd-keeper` | Kun `bd` + pointers |
| `scout` | Kodegraving + MCP |
| `researcher` | Ekstern research + MCP |
| `planner` | Lett plan (når ikke full HTML-plan) |
| `worker` | Implementering |
| `reviewer` | Review / verify evidence |
| `oracle` | Second opinion |

## Subagent thresholds (obligatorisk)

Les `lib/paperflow-thresholds.md`. >30 LOC / >50 prose / >500 token evidence → dispatch. Commits >30 LOC: `Subagent-Run: <task-id>`.

## MCP

- `scout` / `researcher`: `mcp:` i agent frontmatter
- Konfig: `.mcp.json` + `/mcp setup`
- Subagenter får ikke MCP uten eksplisitt `tools: …, mcp:server`

## Typisk autopilot i cmux

```text
/skill:paperflow-autopilot "rewrite onboarding flow"
```

Du leser plan + grill i cmux browser; svar Submit (bridge) eller i Pi-chat; build/review kjører via subagenter.

## Upstream

- Spec: https://github.com/FRIKKern/paperflow/blob/main/ARCHITECTURE.md
- Docs: `docs/PAPERFLOW.md`, `docs/CMUX.md` i dette repoet
