# @oh-my-pi vs @earendil-works pi-coding-agent — Research (Browserstorm 10/20)

**Packages:** [@oh-my-pi/pi-coding-agent](https://www.npmjs.com/package/@oh-my-pi/pi-coding-agent) · [@earendil-works/pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)  
**pi-flow pin:** `@earendil-works/pi-coding-agent@^0.75.3`

---

## Summary

Two npm scopes publish **pi-coding-agent** with incompatible version lines: **earendil `0.75.3`** (canonical upstream, Node **≥22.19**) vs **oh-my-pi `15.1.7`** ([can1357/oh-my-pi](https://github.com/can1357/oh-my-pi), Bun **≥1.3.14**). pi-flow bundles extensions and npm deps typed for **`@earendil-works/*`** only.

**Recommendation:** **`@earendil-works/pi-coding-agent@0.75.3`** — do not install oh-my-pi on the same profile as pi-flow.

---

## Version skew (May 2026)

| Scope | Latest | Repo |
|-------|--------|------|
| `@earendil-works` | `0.75.3` | earendil-works/pi-mono |
| `@oh-my-pi` | `15.1.7` | can1357/oh-my-pi |
| `@mariozechner` (legacy) | deprecated | Uninstall if present |

Version numbers are **not comparable** across forks.

---

## Ecosystem alignment

| Component | earendil 0.75.x | oh-my-pi 15.x |
|-----------|-----------------|---------------|
| pi-subagents 0.24.3 | Yes | Scope mismatch |
| pi-mcp-adapter 2.6.1 | Yes | Untested |
| pi-flow extensions | Yes | Likely broken |

---

## Risks

1. Duplicate global `pi` binaries  
2. Wrong import scope in bundled extensions  
3. Changelog / docs confusion (0.75 vs 15.x)

---

## Canonical upstream

| Action | Package |
|--------|---------|
| **Pin** | `@earendil-works/pi-coding-agent@0.75.3` |
| **Update** | `pi update --self` or `/pi-flow-update` |
| **Avoid** | `@oh-my-pi/pi-coding-agent` with pi-flow boss |

---

## References

- pi-flow: `FORKS.md`, `package.json`, slot-01
