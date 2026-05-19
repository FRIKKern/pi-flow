---
name: cmux-browser
description: >-
  cmux browser automation for pi-flow — open paperflow HTML, verify renders, optional
  interactive grill. Use after doc-writer or when debugging plan/grill pages on :8767.
---

# cmux-browser (pi-flow)

Loaded when cmux is detected. Combines [cmux-browser](https://github.com/manaflow-ai/cmux/blob/main/skills/cmux-browser/SKILL.md) with paperflow verify.

## Verify (preferred)

Use **`paperflow_verify`** with the full `:8767` URL and `--kind` equivalent:

```text
paperflow_verify({ url: "http://localhost:8767/paperflow/plans/foo.html", kind: "plan" })
```

One call per dispatch. Return the tool's line to the user.

Subagent **`pi-flow.cmux-verifier`** when delegating verify-only work.

## Open in browser (debug)

```text
paperflow_cmux({ action: "open", url: "http://localhost:8767/paperflow/plans/foo.html" })
```

Or shell:

```bash
cmux --json browser open "<url>"
```

## Manual loop (fallback)

```bash
S=surface:N   # from open stdout
cmux browser "$S" wait --load-state complete --timeout-ms 15000
cmux browser "$S" snapshot --interactive
```

Re-snapshot after navigation.

## Grill

With paperflow host: **Submit** in HTML — bridge sends to Pi. Do not reimplement Submit via clicks unless debugging.

## Rules

- Verifier must not spawn docs surface — only auto-open hook spawns
- `browser open` uses caller workspace (`CMUX_WORKSPACE_ID`)

See `docs/CMUX.md`.
