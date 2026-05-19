# Paperflow artifact paths (shared with upstream)

When [paperflow](https://github.com/FRIKKern/paperflow) host is installed (`install.sh`), HTML lives under `~/docs/paperflow/` and serves at `http://localhost:8767/paperflow/...`.

| Kind | Path pattern |
|------|----------------|
| Spec | `~/docs/paperflow/specs/<YYYY-MM-DD>-<slug>.html` |
| Plan | `~/docs/paperflow/plans/<YYYY-MM-DD>-<slug>.html` |
| Grill | `~/docs/paperflow/grills/<YYYY-MM-DD>-<slug>-grill.html` |
| Questionnaire | `~/docs/paperflow/questionnaires/<YYYY-MM-DD>-<slug>-questionnaire.html` |
| Goal home | `~/docs/paperflow/goals/<slug>/index.html` |
| Changelog | `~/docs/paperflow/changelog/<YYYY-MM-DD>-<topic>-changelog.html` |

**Repo pointers** (per checkout):

- `<repo>/.paperflow/active-goal` — Beads goal-task id
- `<repo>/.paperflow/active-phase` — active phase-task id

**Pi-only fallback** (no daemon): mirror plans/grills as HTML or Markdown under `<repo>/docs/paperflow/` and open in cmux browser manually (`cmux browser open <path>`).
