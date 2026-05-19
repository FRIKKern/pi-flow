# pi-cursor i CMUX

pi-cursor er ment å kjøre **primært i cmux** sammen med paperflow host.

## Layout (forslag)

```text
┌─────────────────────────────────────────────┐
│ cmux: Pi pane (pi-cursor, Composer 2.5)      │
├─────────────────────────────────────────────┤
│ cmux: browser — plan/grill @ :8767         │
├─────────────────────────────────────────────┤
│ cmux: dock — paperflow feeds (optional)      │
└─────────────────────────────────────────────┘
```

## Setup

1. Install cmux: `brew tap manaflow-ai/cmux && brew install --cask cmux`
2. Install paperflow host (quickstart fra FRIKKern/paperflow)
3. Install Pi: `npm i -g @earendil-works/pi-coding-agent`
4. Install pi-cursor: `pi install git:github.com/FRIKKern/pi-cursor`
5. I prosjekt-repo: `pi` → `/pi-cursor-setup` → `/login cursor`

## Browser

- Med paperflow: docs åpnes automatisk til `http://localhost:8767/paperflow/...`
- Manuelt: `cmux browser open <url eller file://…>`
- Grill Submit i browser → bridge → melding i aktiv terminal (paperflow); Pi må være fokusert i riktig pane

## Pi i cmux workspace

- Én Pi-session per workspace; `.paperflow/active-*` er per repo
- `pf goal "…"` (paperflow CLI) kan spawne Claude med slash — for Pi bruk direkte `/skill:paperflow-goal`

## Verifikasjon

paperflow `paperflow-doc-verify` er for HTML @ :8767. I Pi: bruk reviewer + ev. `mcp:chrome-devtools` for UI-tasks.

## Uten cmux

Pi + paperflow daemon i vanlig browser fungerer; dock og cmux-verifier blir SKIP.
