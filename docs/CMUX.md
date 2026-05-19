# pi-flow in CMUX

pi-flow is designed to run **inside cmux** alongside the **paperflow host**.

## Recommended layout

```text
┌─ cmux workspace ─────────────────────────────┐
│ Pi pane      →  pi-flow, /skill:autopilot …   │
│ Browser pane →  plan/grill @ localhost:8767   │
│ Dock         →  paperflow feeds (optional)    │
└──────────────────────────────────────────────┘
```

## Setup

1. cmux — `brew install --cask cmux`
2. paperflow — `curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash`
3. Pi — `npm i -g @earendil-works/pi-coding-agent`
4. pi-flow — `pi install git:github.com/FRIKKern/pi-flow` → `/pi-flow-setup`

Model: any Pi provider. Default after setup is `composer-2.5` via `/login cursor` — change with `/model` if you prefer Anthropic/OpenAI/etc.

## Grill in cmux

With paperflow host: fill grill in browser → Submit → message lands in the Pi pane (bridge).

Without host: paste grill questions in Pi; user replies in chat before revise.

## pf CLI vs Pi

paperflow's `pf goal "…"` targets Claude Code. In cmux with Pi, use `/skill:goal` or `/skill:autopilot` in the Pi pane instead.
