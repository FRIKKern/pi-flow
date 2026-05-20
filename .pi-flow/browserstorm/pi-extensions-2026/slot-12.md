# Pi extension development — Research (Browserstorm 12/20)

**Source:** [earendil-works/pi-mono — extensions.md](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)  
**pi-flow examples:** `extensions/pi-flow-host/`, `extensions/shared/extension-context.ts`

---

## Summary

Pi extensions are TypeScript modules default-exporting a function `(pi: ExtensionAPI) => void` that register hooks, tools, commands, and UI. pi-flow ships seven first-party extensions plus three bundled npm extensions — all targeting **`@earendil-works/pi-coding-agent` 0.75.x** `ExtensionAPI`.

---

## Extension lifecycle hooks (common)

| Hook / API | Use |
|------------|-----|
| `pi.on("session_start", …)` | Re-bind context; merge settings; skip in subagent children when boss-only |
| `pi.on("tool_execution_end", …)` | Progress guards, host policy |
| `pi.registerCommand(name, …)` | Slash commands (`/pi-flow-update`, `/pf-storm`) |
| `pi.registerTool(…)` | Custom tools (host lifecycle) |
| `pi.events.on(…)` | Cross-extension events (e.g. `subagent:control-event`) |

---

## Stale extension context (critical for subagents)

When Pi **forks or replaces** a session (parallel subagents), captured `ExtensionContext` from an earlier `session_start` can throw:

```text
extension ctx is stale
stale after session replacement
```

**pi-flow pattern** (`extensions/shared/extension-context.ts`):

- `isStaleExtensionContextError(msg)` — detect message
- `safeExtensionUi(ctx, fn)` — swallow stale UI calls instead of crashing process
- **Re-bind `ctx` on every `session_start`** — do not close over ctx from module load

**Storm recovery** retries slots matching stale-context regexes.

---

## Subagent child guard

```typescript
// Pattern in pi-flow-setup, pi-flow-host, etc.
if (isPiSubagentChildSession()) return; // skip boss-only hooks
```

Env: `PI_SUBAGENT_CHILD` — prevents roster/statusline/setup from running in researcher children.

---

## Writing a new extension (checklist)

1. Add `extensions/my-ext/index.ts` exporting default function.
2. Register in `package.json` → `pi.extensions` (order matters for hooks).
3. Import types from `@earendil-works/pi-coding-agent` only (not agent-core directly unless embedding).
4. Use **TypeBox** for tool params if registering tools (pi-flow host pattern).
5. Test with `pi -e ./extensions/my-ext/index.ts` before publishing.
6. For npm: add `"pi-package"` keyword + `pi.extensions` array.

---

## Packages vs extensions

| Type | Install | Example |
|------|---------|---------|
| **Pi package** | `pi install npm:…` | pi-flow, pi-subagents |
| **Local extension path** | Listed in `pi.extensions` | `./extensions/pi-flow-host/index.ts` |

Docs: [packages.md](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/packages.md)

---

## pi-flow conventions

| Convention | Where |
|------------|--------|
| Shared utilities | `extensions/shared/` |
| Settings merge | `settings/defaults.json` + `applyPiFlowSettings` |
| Child session skip | `isPiSubagentChildSession()` |
| Status / notify | `ctx.ui.notify`, `safeExtensionUi` |

---

## References

- [extensions.md](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- pi-flow: `extensions/shared/extension-context.ts`, slot-01, slot-05
