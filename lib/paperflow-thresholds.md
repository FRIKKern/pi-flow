## Subagent enforcement (paperflow-thresholds v1)

Ported from [FRIKKern/paperflow](https://github.com/FRIKKern/paperflow) `lib/shared-thresholds.md`. pi-flow orchestrators MUST follow this in CMUX and everywhere else.

**Hard thresholds** — above ANY of these, dispatch a subagent:

- **> 30 LOC** of new code (one logical unit)
- **> 50 lines** of new prose / markdown / HTML body
- **> 500 tokens** of raw tool output captured / synthesised

**Bash-glue carve-out**: bash glue ≤ **25 LOC** may stay inline.

**Pre-write checkpoint** (orchestrator only):

    Doing inline because: <reason>. Above threshold would be <subagent-reason>.

**Recursion depth = 1**: subagent briefs are orchestrator-direct.

**Verification subagent**: build returns >500 tokens evidence → dispatch reviewer (or dedicated verify pass); orchestrator sees one-line verdict.

**Commit trailer** when >30 LOC touched:

    Subagent-Run: <task-id>

**Always orchestrator-direct**:

- `bd create / claim / close / update`
- `.paperflow/active-{goal,phase}` pointer writes
- `Read`, short probes, pointer bumps in live docs (≤5 lines)
- Pasting verbatim subagent output

When in doubt, dispatch.
