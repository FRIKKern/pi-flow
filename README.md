# pi-cursor

**Repo:** https://github.com/FRIKKern/pi-cursor (public)

**Din egen Pi-distribusjon:** terminal-harnesset [Pi](https://pi.dev/), modellen **Composer 2.5** (via Cursor-abonnement), og **MCP på subagenter** i analyse- og gravingsfaser.

Ikke en fork av hele [pi-mono](https://github.com/earendil-works/pi) — det er ikke slik økosystemet deler «egen Pi». Vi følger samme mønster som [@astrofoundry/pi-astro](https://www.npmjs.com/package/@astrofoundry/pi-astro), [@juicesharp/rpiv-pi](https://www.npmjs.com/package/@juicesharp/rpiv-pi) og [gentle-pi](https://www.npmjs.com/package/gentle-pi): **ett `pi install` som bundler extensions, agents, skills og defaults.**

## Hva er innebygd

| Komponent | Kilde | Rolle |
|-----------|--------|--------|
| **pi-cursor-provider** | [ndraiman/pi-cursor-provider](https://github.com/ndraiman/pi-cursor-provider) | Cursor OAuth → Composer 2.5 i Pi |
| **pi-mcp-adapter** | [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MCP uten å sprenge context |
| **pi-subagents** | [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents) | Child agents med `mcp:` i tools |
| **pi-cursor-core** | dette repoet | Agent-sync, `/pi-cursor-setup`, defaults |

**Viktig:** Installer **ikke** `pi-subagents` eller `pi-mcp-adapter` separat etterpå — da får du dupliserte tools. Alt lastes fra `node_modules/` via `package.json` → `pi.extensions`.

## Krav

- Node.js ≥ 20
- [Pi](https://pi.dev/docs/latest): `npm install -g @earendil-works/pi-coding-agent`
- Aktivt **Cursor-abonnement** (Composer 2.5)

## Installasjon

```bash
pi install git:github.com/FRIKKern/pi-cursor
# eller lokalt:
pi install /path/to/pi-cursor
# npm (når publisert): pi install npm:pi-cursor
```

Start Pi i et prosjekt:

```bash
pi
/pi-cursor-setup
/login cursor
/model          # velg composer-2.5
```

Kopier MCP-mal:

```bash
cp .mcp.json.example .mcp.json   # i prosjektrot, rediger servere
/mcp setup
```

Valgfritt wrapper:

```bash
chmod +x bin/pi-cursor
./bin/pi-cursor    # eller: pi-cursor etter npm link
```

## Agenter (med MCP der det teller)

| Agent | MCP | Formål |
|-------|-----|--------|
| `pi-cursor.scout` | `mcp:chrome-devtools` (eksempel) | Kodegraving + runtime |
| `pi-cursor.researcher` | `mcp:context7` (eksempel) | Ekstern docs |
| `pi-cursor.planner` | — | Implementeringsplan |
| `pi-cursor.worker` | — | Implementering |
| `pi-cursor.reviewer` | — | Review |
| `pi-cursor.oracle` | — | Second opinion |

Tilpass `tools:` og `mcp:…` i `agents/*.md` — sync skjer til `~/.pi/agent/agents/pi-cursor.*.md` ved session start.

## Typisk flyt

```text
Bruk scout til å kartlegge [modul]. Bruk researcher hvis du trenger offisiell API-docs.
Lag plan med planner, implementer med worker, kjør reviewer til du er fornøyd.
```

Skill: `/skill:pi-cursor` for kort referanse.

## Prosjekt-instruksjoner

Legg `AGENTS.md` i prosjektrot (eller bruk vår mal). Pi laster det automatisk.

For prosjekt-spesifikke overrides:

```bash
cp settings/defaults.json .pi/settings.json
```

## Utvikle pi-cursor lokalt

```bash
cd pi-cursor
npm install
pi -e .
/pi-cursor-setup
```

## Forks og videre arbeid

Se [FORKS.md](./FORKS.md) for hvilke upstream-prosjekter vi bygger på, og hvordan vi kan vendore egne forks (f.eks. `composer-2.5` aliases i provider).

## Lisens

MIT — se [LICENSE](./LICENSE). Upstream-pakker har egne lisenser.
