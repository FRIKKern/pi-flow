---
name: session
description: >-
  Pi session titles — auto-named from your first message; rename with /pf-rename
  or /name. Resume via Pi session picker.
---

# session (pi-flow)

## Auto-name (default on)

After your **first user message**, pi-flow sets the Pi session title from that prompt (like Claude Code auto-titles).

- Active goal → `pi-flow-l9o · <your request…>`
- No goal → first ~56 chars of your message
- Skips `/name`, `/pf-rename`, `/pi-flow-handoff` as first line

Setting: `piFlow.sessionNaming.autoNameFromFirstPrompt` in `settings/defaults.json`.

## Rename anytime

```text
/pf-rename browserbase storm · wave 2
/name browserbase storm · wave 2
```

Either command updates the title in the **session picker** and terminal tab. After a manual rename, auto-name will not overwrite.

## Resume later (default on)

pi-flow **continues your last session automatically** on startup (including after a crash):

- `pi-flow` launcher passes `pi -c` by default
- Plain `pi` with pi-flow loaded re-opens the last conversation (boss session preferred)
- Fresh start: `pi --new` or `PI_FLOW_NO_CONTINUE=1 pi`
- Manual: `/pf-continue`

Picker / keybindings still work:

1. Bind `app.session.resume` in `~/.pi/agent/keybindings.json` (or use Pi's session UI).
2. Open session picker → search your title → Enter.
3. **Ctrl+N** — show named sessions only.

Setting: `piFlow.session.continueOnStart` in `settings/defaults.json`.

Pair with `/pf-chronicler` + `/pi-flow-handoff` for goal + memory context.

## Not the same as

| Command | What |
|---------|------|
| `/pf-name <slug>` | **Subagent** persona memory (`.pi-flow/memory/agents/`) |
| `/pf-rename` | **Pi session** display name (JSONL `session_info`) |
