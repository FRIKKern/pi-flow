# Forks og upstream

pi-cursor er en **distribusjonspakke**, ikke en full fork av [earendil-works/pi](https://github.com/earendil-works/pi). Vi bundler og konfigurerer beviste community-extensions.

## Upstream vi bygger på

| Prosjekt | Lisens | Hva vi bruker det til |
|----------|--------|------------------------|
| **[paperflow](https://github.com/FRIKKern/paperflow)** | MIT | Goal/plan/grill/build/review, HTML artifacts, Beads, thresholds, CMUX patterns |
| [pi-subagents](https://github.com/nicobailon/pi-subagents) | MIT | Delegation, parallel, chains |
| [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | MIT | MCP proxy + direct tools |
| [pi-cursor-provider](https://github.com/ndraiman/pi-cursor-provider) | MIT | Cursor OAuth → modeller i Pi |
| [pi-cursor-agent](https://github.com/sudosubin/pi-frontier/tree/main/pi-cursor-agent) | MIT | Alternativ provider (CLI); vi bruker provider inntil vi trenger CLI-spesifikke features |

## Når vi faktisk fork-er

Fork hele pi-mono **anbefales ikke** — vedlikehold blir tungt.

Fork disse når vi trenger varig tilpasning:

1. **pi-cursor-provider** → `packages/cursor-provider/`
   - Composer 2.5 aliases, fast default, bedre feilmeldinger
   - Kommando: `scripts/fork-upstream.sh cursor-provider`

2. **pi-subagents** (sjelden) → kun hvis vi må endre child MCP-regler i kjernen

3. **pi-mcp-adapter** (sjelden) → kun for pi-cursor-spesifikke defaults

## Vendoring i dette repoet

```
pi-cursor/
├── extensions/pi-cursor-core/   # vår kode
├── agents/                      # våre subagent-profiler
└── node_modules/                # npm-bundled upstream (etter install)
```

Fremtidig monorepo (valgfritt, som [rpiv-mono](https://github.com/juicesharp/rpiv-mono)):

```
packages/
  pi-cursor/          # denne pakken
  cursor-provider/    # fork av pi-cursor-provider
```

## Publisering

- npm: `pi-cursor` (pi-package keyword)
- pi.dev/packages: legg til `pi-package` + README + ev. demo-video
