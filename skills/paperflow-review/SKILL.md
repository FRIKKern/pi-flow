---
name: paperflow-review
description: >-
  Review-fase: reviewer subagent mot build-evidence. Approve eller reject (reopen build-task).
  "review", "request review", "audit".
---

# paperflow-review (pi-cursor)

Fra [paperflow review](https://github.com/FRIKKern/paperflow/blob/main/skills/review/SKILL.md).

## Flyt

1. Opprett/koble review work-task til build-task (bd-keeper)
2. **reviewer** med: plan-lenke, diff, test-output, task-id
3. Parallel reviewers (valgfritt): correctness | tests | complexity
4. **Approve** → close review + ev. `bd epic close-eligible`
5. **Reject** → `bd update <build-task> --reopen` med konkret feedback → `/skill:paperflow-build`

## Subagent-Run audit

Sjekk commits for `Subagent-Run:` trailer når >30 LOC — flagg manglende trailer.

## Output

Kort verdict til bruker + lenke til review-notat (HTML via doc-writer hvis paperflow host).
