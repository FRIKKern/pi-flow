# Lazy skill loading

pi-flow follows the oh-my-pi skill model: **metadata in the prompt, body on demand**.

## For orchestrators

1. `/skill:pi-flow` (router) only lists names — do not assume full skill text is in context.
2. When executing a phase, **read the skill file** (e.g. `skills/plan/SKILL.md` or `read skill://plan` when the runtime supports it).
3. Read `lib/orchestrator.md` and `lib/paperflow-thresholds.md` once per coordinating session.

## Skill index

| Skill | Read when |
|-------|-----------|
| `goal` | Opening or resuming a Goal |
| `plan` | Draft / grill / revise |
| `build` | Claiming work-tasks |
| `review` | Phase complete |
| `autopilot` | End-to-end from vision |
| `resume` | Switching Goals |
| `cmux` · `cmux-browser` | Only when cmux detected (auto-discovered) |

## CMUX skills

Loaded via `resources_discover` in `pi-flow-host` when cmux is active — not bundled into every session.
