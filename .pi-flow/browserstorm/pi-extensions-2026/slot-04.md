# pi-cursor-provider — Research (Browserstorm 4/20)

**Package:** [pi-cursor-provider](https://www.npmjs.com/package/pi-cursor-provider)  
**Repository:** [ndraiman/pi-cursor-provider](https://github.com/ndraiman/pi-cursor-provider)  
**pi-flow context:** bundled npm dep, `settings/defaults.json`, `scripts/patch-cursor-provider.mjs`, Composer 2.5 default model

---

## Summary

`pi-cursor-provider` is a Pi extension that exposes **Cursor subscription models** to Pi via **PKCE OAuth** (browser login, no client secret) and a **local OpenAI-compatible HTTP proxy** that translates `/v1/chat/completions` into Cursor's **gRPC / HTTP/2** API (`api2.cursor.sh`). Pi talks to `http://127.0.0.1:<port>/v1` as provider **`cursor`** with API mode **`openai-completions`**.

**Latest npm version is `0.1.11`** (published 2026-04-09). pi-flow pins **`pi-cursor-provider@^0.1.11`** and loads it from `node_modules/pi-cursor-provider/index.ts` in `package.json` → `pi.extensions`.

**Composer 2.5** is pi-flow's **default model** (`composer-2.5`, plus `composer-2.5-fast` in `enabledModels`). Upstream `0.1.11` ships **`composer-2` / `composer-2-fast`** in fallback JSON only — **not `composer-2.5`**. pi-flow's **`postinstall`** script (`scripts/patch-cursor-provider.mjs`) injects Composer 2.5 into `cursor-models-raw.json` and the cost table in `index.ts` when missing.

---

## Version

| Field | Value |
|-------|--------|
| **Latest** | `0.1.11` |
| **dist-tag** | `latest` → `0.1.11` |
| **License** | MIT |
| **Type** | `module` |
| **Extension entry** | `./index.ts` (via `package.json` → `pi.extensions`) |
| **Runtime deps** | `@bufbuild/protobuf` ^2 |
| **Peer deps** | `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent` — both `*` |
| **Node** | `>=18` (package); pi-flow requires **`>=20`** |

### pi-flow pin

| Field | Value |
|-------|--------|
| **package.json** | `"pi-cursor-provider": "^0.1.11"` |
| **Bundled extension path** | `node_modules/pi-cursor-provider/index.ts` |
| **postinstall** | `node scripts/patch-cursor-provider.mjs` (Composer 2.5 fallback + cost row) |
| **verify** | optional in `scripts/verify-bundled-deps.mjs` |

---

## Composer 2.5 provider

### What "Composer 2.5" means here

| Layer | Detail |
|-------|--------|
| **Provider id** | `cursor` (registered by extension via `pi.registerProvider("cursor", …)`) |
| **Model ids (pi-flow)** | `composer-2.5`, `composer-2.5-fast` |
| **Settings** | `defaultProvider: "cursor"`, `defaultModel: "composer-2.5"` in `settings/defaults.json` |
| **Reasoning** | Patched fallback sets `reasoning: false` for both; upstream treats `composer-*` as reasoning-capable in `supportsReasoningModelId()` but **no effort dedup** when the model id has no effort suffix (same as `composer-2`) |
| **Context / output** | pi-flow patch: `contextWindow: 200000`, `maxTokens: 64000` |
| **Cost (patched)** | `input: 0.5`, `output: 2.5`, `cacheRead: 0.2`, `cacheWrite: 0` (same row shape as `composer-2`) |

### Upstream vs pi-flow

| Source | `composer-2` | `composer-2.5` |
|--------|--------------|----------------|
| **npm `0.1.11` tarball** | ✓ in `cursor-models-raw.json` | ✗ |
| **After `/login cursor`** | ✓ if returned by `GetUsableModels` gRPC | ✓ **if** Cursor account lists it |
| **Before login (fallback)** | ✓ | ✓ **only after** `npm install` / `postinstall` patch in pi-flow |

Without OAuth, Pi can still **select** `composer-2.5` from patched fallbacks; the proxy returns **"Not logged in to Cursor. Run /login cursor"** until `/login cursor` succeeds.

### Model mapping (effort / fast / thinking)

Cursor often exposes effort variants (`-low`, `-medium`, `-high`, `-max`, `-xhigh`, `-fast`, `-thinking`). The extension **collapses** variants that share the same base so Pi's **thinking level** maps to Cursor effort suffixes. Models **without** an effort segment (e.g. `composer-2`, and by extension patched `composer-2.5`) stay **as-is** with `supportsReasoningEffort: false`.

Disable dedup for raw Cursor ids:

```bash
PI_CURSOR_RAW_MODELS=1 pi
```

---

## Architecture

```text
Pi  →  openai-completions  →  http://127.0.0.1:PORT/v1/chat/completions
                                      ↓
                              proxy.ts (local HTTP)
                                      ↓
                              h2-bridge.mjs (Node HTTP/2)
                                      ↓
                              api2.cursor.sh (gRPC)
```

| Concern | Behavior |
|---------|----------|
| **Auth** | PKCE OAuth; `/login cursor`; tokens refreshed via `refreshToken` |
| **Discovery** | After login/refresh, `GetUsableModels` replaces fallback list |
| **Tools** | Rejects Cursor-native tools; Pi tools via MCP |
| **Sessions** | `pi_session_id` on requests; checkpoints, fork recovery, tool continuations in proxy |
| **Debug** | `PI_CURSOR_PROVIDER_DEBUG=1` → JSONL in tmp; `npm run debug:timeline` in package |

---

## Setup requirements for pi-flow

### Hard requirements

| Requirement | Notes |
|-------------|--------|
| **[Pi](https://pi.dev/)** | pi-flow is a Pi package; install via quickstart or `pi install git:github.com/FRIKKern/pi-flow` |
| **Node.js ≥ 20** | pi-flow `engines`; provider alone allows ≥ 18 |
| **Active [Cursor](https://cursor.com) subscription** | OAuth + API access |
| **`/login cursor`** | Required before real inference (see `prompts/setup.md`) |
| **Bundled install** | `npm install` in pi-flow (or quickstart) pulls `pi-cursor-provider` and runs patch |

### pi-flow install path (typical)

```bash
curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/quickstart.sh | bash
# or dev:
cd pi-flow && npm install && pi -e .
/pi-flow-setup
```

`/pi-flow-setup` merges `settings/defaults.json` into `~/.pi/agent/settings.json` (and project `.pi/settings.json`), including:

- `defaultProvider: "cursor"`
- `defaultModel: "composer-2.5"`
- `enabledModels: ["composer-2.5", "composer-2.5-fast"]`
- `piFlow.modelRoles` and `subagents.agentOverrides` → `composer-2.5` for goal/plan/build/review and subagents

Then authenticate:

```text
/login cursor
/model    # confirm composer-2.5 or composer-2.5-fast
```

### Optional / alternative

| Scenario | Action |
|----------|--------|
| **Skip Cursor provider** | Omit dep or don't install; doctor reports `pi-cursor-provider` as **optional, skip**; use another provider via `/login` |
| **Manual extension only** | `pi install npm:pi-cursor-provider` (no pi-flow patch — no `composer-2.5` fallback unless Cursor lists it post-login) |
| **Vendor fork** | Clone into `packages/`, point `package.json` dependency (see `FORKS.md`) |
| **Debug proxy** | `PI_CURSOR_PROVIDER_DEBUG=1` |

### Doctor / status

- `/pi-flow-doctor` — `optionalBundled(..., "pi-cursor-provider")` → pass if `node_modules/pi-cursor-provider` exists
- Does **not** verify Cursor OAuth; user must run `/login cursor` separately

---

## pi-flow integration map

| Artifact | Role |
|----------|------|
| `package.json` → `pi.extensions` | Loads provider extension |
| `package.json` → `dependencies` | `^0.1.11` |
| `scripts/postinstall` | Patch Composer 2.5 + `verify-bundled-deps.mjs` |
| `settings/defaults.json` | Cursor provider + Composer 2.5 defaults |
| `agents/*.md` | `model: composer-2.5` on doc-writer, bd-keeper, cmux-verifier |
| `extensions/pi-flow-setup` | Lists extension; applies settings on `/pi-flow-setup` |
| `README.md` / `prompts/setup.md` | Documents optional provider + `/login cursor` |

### Model-agnostic claim

pi-flow is **model-agnostic** in architecture (skills, Beads, paperflow host) but **defaults to Composer 2.5 via Cursor**. Other providers work if the user changes `defaultProvider` / `defaultModel` and logs in accordingly.

---

## Pairing with pi-coding-agent (pi-flow stack)

| Package | pi-flow version | Notes |
|---------|-----------------|-------|
| `@earendil-works/pi-coding-agent` | `^0.75.3` | pi-flow core agent |
| `pi-cursor-provider` | `^0.1.11` | Declares peer `@mariozechner/pi-coding-agent` `*` — works as extension import; scope mismatch is upstream packaging, not a separate pi-flow fork |
| `pi-subagents` | `^0.24.3` | Subagents also default to `composer-2.5` via merged settings |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `composer-2.5` missing in `/model` | Patch not run or old install | `npm install` in pi-flow package dir; check `node_modules/pi-cursor-provider/cursor-models-raw.json` |
| Request fails immediately | Not logged in | `/login cursor` |
| Only `composer-2` after login | Cursor account / API catalog | Select listed model or wait for Cursor to expose 2.5; patch still helps pre-login UI |
| Provider missing | Optional dep not installed | `npm install` in pi-flow; or `pi install npm:pi-cursor-provider` |
| Wrong effort variant sent | Dedup + thinking level | Adjust thinking; or `PI_CURSOR_RAW_MODELS=1` |

---

## Sources

- npm: [pi-cursor-provider@0.1.11](https://www.npmjs.com/package/pi-cursor-provider) metadata and README (2026-04-09)
- pi-flow: `package.json`, `settings/defaults.json`, `scripts/patch-cursor-provider.mjs`, `FORKS.md`, `docs/EXTENSIONS.md`, `extensions/shared/doctor.ts`
- Upstream tarball: `cursor-models-raw.json`, `index.ts` (provider registration, `MODEL_COST_TABLE`, `processModels`)
