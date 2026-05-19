# pi-cursor

**Repo:** https://github.com/FRIKKern/pi-cursor (public)

**Pi for CMUX** med **Composer 2.5** og arbeidsflyt fra **[paperflow](https://github.com/FRIKKern/paperflow)**: Goal → HTML plan → **grill (pause)** → revise → build (Beads) → review — med **MCP på subagenter** i analysefasen.

Ikke Cursor IDE. Ikke en fork av [pi-mono](https://github.com/earendil-works/pi) — en **pi-package** (som [pi-astro](https://www.npmjs.com/package/@astrofoundry/pi-astro) / [gentle-pi](https://www.npmjs.com/package/gentle-pi)).

## CMUX + paperflow (anbefalt stack)

```text
cmux terminal  →  Pi (pi-cursor, Composer 2.5)
cmux browser   →  plan/grill HTML @ localhost:8767  (paperflow host)
cmux dock      →  paperflow feeds (valgfritt)
```

1. [paperflow quickstart](https://github.com/FRIKKern/paperflow#first-five-minutes) — daemon, bridge, HTML libs  
2. `pi install git:github.com/FRIKKern/pi-cursor`  
3. `pi` → `/pi-cursor-setup` → `/login cursor` → `/model` (composer-2.5)

Les [docs/CMUX.md](./docs/CMUX.md) og [docs/PAPERFLOW.md](./docs/PAPERFLOW.md).

## Paperflow-skills i Pi

| Skill | Fase |
|-------|------|
| `/skill:paperflow-goal` | Epic + 3 faser + pointers |
| `/skill:paperflow-plan` | Draft HTML → grill → revise → bd tasks |
| `/skill:paperflow-build` | claim → worker → verify → close |
| `/skill:paperflow-review` | Approve / reopen |
| `/skill:paperflow-autopilot` | Hele kjeden (stopper ved grill) |
| `/skill:paperflow-resume` | Bytt Goal |

**Autopilot:**

```text
/skill:paperflow-autopilot "rewrite the onboarding flow"
```

## Bundlet

| Pakke | Rolle |
|-------|--------|
| pi-cursor-provider | Cursor OAuth → Composer 2.5 |
| pi-mcp-adapter | MCP (token-effektiv) |
| pi-subagents | Child agents med `mcp:` |
| pi-cursor-core | Setup, agent-sync, paperflow agents |

Installer **ikke** `pi-subagents` / `pi-mcp-adapter` separat.

## Agenter

| Agent | MCP | Rolle |
|-------|-----|--------|
| scout | chrome-devtools (eksempel) | Kodegraving |
| researcher | context7 (eksempel) | Docs/web |
| doc-writer | — | paperflow HTML |
| bd-keeper | — | `bd` only |
| worker / reviewer / oracle | — | build/review |

Terskler: [lib/paperflow-thresholds.md](./lib/paperflow-thresholds.md) (>30 LOC → subagent).

## Install

```bash
npm install -g @earendil-works/pi-coding-agent
pi install git:github.com/FRIKKern/pi-cursor
pi
/pi-cursor-setup
/login cursor
```

`.mcp.json` fra [`.mcp.json.example`](./.mcp.json.example).

## Utvikle lokalt

```bash
cd pi-cursor && npm install && pi -e .
```

## Lisensser

MIT — [LICENSE](./LICENSE). Paperflow-konsepter © [FRIKKern/paperflow](https://github.com/FRIKKern/paperflow) (MIT).
