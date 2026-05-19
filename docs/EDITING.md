# Editing quality (hashline + LSP)

pi-flow does not reimplement oh-my-pi's hashline or LSP stack. Use a Pi runtime that provides them.

## Hashline (hash-anchored edits)

[oh-my-pi](https://github.com/can1357/oh-my-pi) benchmarks show large gains for models that struggle with `str_replace` whitespace matching.

**Recommendation:**

- Prefer **oh-my-pi** (`omp`) or a Pi build with hashline enabled when doing heavy `build` phases.
- In skills, tell `worker` subagents to use the runtime's native edit tool (hashline when available).

## LSP (format + diagnostics)

OMP runs format-on-write and diagnostics after edits when LSP servers are installed.

**Recommendation:**

- Install language servers for your stack (TypeScript, Rust, Python, …).
- Run `/pi-flow-doctor` — not a substitute for LSP, but catches host/beads/cmux issues.
- Treat failing diagnostics as build-phase blockers before `/skill:review`.

## pi-flow runtime policy

Regardless of edit tool:

- Destructive `rm -rf` and `git push --force` are blocked by `pi-flow-host` (unless `PI_FLOW_ALLOW_DESTRUCTIVE=1`).
- Secrets in tool output are redacted.
- Use `trash` instead of `rm` (project convention).
