# Node.js version requirements — Research (Browserstorm 17/20)

**Packages:** `@earendil-works/pi-coding-agent@0.75.3`, `pi-subagents@0.24.3`, `pi-flow@0.9.1`

---

## Summary

**Effective requirement for pi-flow + 0.75.x stack: Node.js ≥ 22.19.0.** pi-flow's `package.json` still declares `engines.node: ">=20"` as a broad floor, but upstream Pi 0.75.x enforces **22.19+**. Older Node 20.x may install but fail at runtime or miss features.

---

## engines comparison (npm, May 2026)

| Package | `engines` |
|---------|-----------|
| `@earendil-works/pi-coding-agent` | `node: '>=22.19.0'` |
| `pi-subagents` | (no strict engines; devDeps on 0.74+) |
| `pi-flow` | `node: '>=20'` |
| `pi-acp` (optional) | Node **22+** per README |
| `@oh-my-pi/pi-coding-agent` | `bun: '>=1.3.14'` — different stack |

---

## Compatibility notes

| Node version | pi-flow + 0.75.x |
|--------------|-------------------|
| **22.19+** | **Supported** (match upstream) |
| **20.x** | pi-flow engines allow; **Pi 0.75 may refuse or warn** |
| **18.x** | **Unsupported** |
| **Bun-only (oh-my-pi)** | **Not** pi-flow's tested path |

---

## Install guidance

```bash
node -v   # expect v22.19.0 or newer
npm install -g @earendil-works/pi-coding-agent@0.75.3
pi install git:github.com/FRIKKern/pi-flow
```

cmux / CI images should pin **Node 22 LTS** (or current 22.19+ patch).

---

## pi-subagents

No npm `engines` field; compatibility is **import scope** (0.24.1+ for earendil). Runs on same Node as parent `pi` process — no separate runtime.

---

## Recommendation

| Audience | Action |
|----------|--------|
| **pi-flow docs/operators** | Treat **22.19+** as real minimum; consider bumping pi-flow `engines` to `>=22.19` in a future release |
| **Docker/CI** | `FROM node:22-bookworm` or pin 22.19+ |
| **Global nvm** | `nvm install 22 && nvm use 22` before `pi update --self` |

---

## References

- npm: `@earendil-works/pi-coding-agent` engines
- pi-flow: `package.json`, slot-01, slot-10
