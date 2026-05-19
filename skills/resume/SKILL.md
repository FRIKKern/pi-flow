---
name: resume
description: >-
  pi-flow · paperflow resume. Use for "/resume", "list goals", "switch to goal X".
  Lists Beads epics; on pick, updates .paperflow pointers only (no bd mutation).
---

# resume (pi-flow)

Port av [paperflow resume](https://github.com/FRIKKern/paperflow/blob/main/skills/resume/SKILL.md).

## Process

1. `bd list --type epic --json`
2. Numbered menu for user
3. Write `.paperflow/active-goal` + `active-phase` (first incomplete phase)
4. Open Goal HTML in cmux browser if paperflow host available
