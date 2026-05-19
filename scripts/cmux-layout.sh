#!/usr/bin/env bash
# Open paperflow in the *current* cmux workspace (default).
# Use --new-workspace only for first-time greenfield setup.
#
# Usage:
#   cmux-layout.sh [options] [goal-slug]
#   cmux-layout.sh --url 'http://localhost:8767/paperflow/plans/foo.html'
#   cmux-layout.sh --grill 2026-05-19-pi-flow-browserbase-integration
#   cmux-layout.sh --new-workspace "$(pwd)" my-goal   # rare: new Pi + browser workspace
set -euo pipefail

REPO="${CMUX_WORKSPACE_CWD:-$(pwd)}"
NAME="pi-flow"
URL=""
NEW_WORKSPACE=0
DAEMON="${PAPERFLOW_DAEMON_URL:-http://localhost:8767}"

usage() {
  cat <<'EOF'
Usage: cmux-layout.sh [options] [goal-slug]

Default (attach): open paperflow URL in the *current* cmux workspace.
  Boss Pi stays in this pane — dispatch subagents (researcher, worker, reviewer).
  Do not spawn a second Pi workspace for build/review.

Options:
  --url <url>        Browser URL (default: home or grill slug match)
  --grill <slug>     /paperflow/grills/<slug>-grill.html
  --new-workspace    Create a new cmux workspace with Pi + browser (first-time only)
  [repo-path]        With --new-workspace only: cwd for new workspace
  -h, --help         This help

In Pi (boss session):
  subagent({ agent: "reviewer", task: "…" })   # or /pf-follow reviewer
  paperflow_cmux({ action: "open", url: "…" })

Examples:
  cmux-layout.sh browserbase
  cmux-layout.sh --url http://localhost:8767/paperflow/plans/2026-05-19-pi-flow-browserbase-integration.html
  cmux-layout.sh --new-workspace "$(pwd)" my-goal
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="$2"; shift 2 ;;
    --grill)
      URL="${DAEMON}/paperflow/grills/${2}-grill.html"
      shift 2
      ;;
    --new-workspace) NEW_WORKSPACE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      if [[ "$NEW_WORKSPACE" -eq 1 && -d "$1" ]]; then
        REPO="$1"
      else
        NAME="$1"
      fi
      shift
      ;;
  esac
done

CMUX_BIN="$(command -v cmux || true)"

if [[ -z "$CMUX_BIN" ]]; then
  echo "cmux not found — install: brew tap manaflow-ai/cmux && brew install --cask cmux" >&2
  exit 1
fi

if ! curl -sf "${DAEMON}/health" >/dev/null 2>&1; then
  echo "warn: paperflow daemon not reachable on :8767 — run pi-flow quickstart first" >&2
fi

if [[ -z "$URL" ]]; then
  case "$NAME" in
    *browserbase*)
      URL="${DAEMON}/paperflow/plans/2026-05-19-pi-flow-browserbase-integration.html"
      ;;
    *)
      URL="${DAEMON}/"
      ;;
  esac
fi

open_in_current_workspace() {
  local ws="${CMUX_WORKSPACE_ID:-}"
  if [[ -z "$ws" ]]; then
    echo "not in cmux (CMUX_WORKSPACE_ID unset)" >&2
    echo "  Open in Pi: paperflow_cmux({ action: \"open\", url: \"$URL\" })" >&2
    echo "  Or first-time: cmux-layout.sh --new-workspace \"\$(pwd)\" $NAME" >&2
    return 1
  fi
  local out
  out=$("$CMUX_BIN" browser open "$URL" 2>&1) || true
  if [[ "$out" == OK* ]]; then
    echo "✓ paperflow browser in current workspace ($ws)"
    echo "  URL: $URL"
    echo ""
    echo "Stay in boss Pi — use subagent() for build/review (/pf-follow to watch)."
    return 0
  fi
  out=$("$CMUX_BIN" new-pane --type browser --direction right --url "$URL" 2>&1) || true
  if [[ "$out" == OK* ]]; then
    local surf
    surf=$(awk '{print $2}' <<<"$out")
    echo "✓ browser pane in current workspace ($ws)"
    echo "  Surface: ${surf:-?} → $URL"
    echo ""
    echo "Stay in boss Pi — use subagent() for build/review (/pf-follow to watch)."
    return 0
  fi
  echo "browser open failed: $out" >&2
  echo "  Try: cmux browser open '$URL'" >&2
  return 1
}

spawn_new_workspace() {
  command -v jq >/dev/null 2>&1 || { echo "jq required for --new-workspace" >&2; exit 1; }
  list_ws_refs() { cmux list-workspaces | grep -oE 'workspace:[0-9]+' | sort -u; }
  local before after ws boss out browser
  before=$(list_ws_refs)
  "$CMUX_BIN" new-workspace \
    --name "pi-flow:${NAME}" \
    --cwd "$REPO" \
    --command "pi" >/dev/null
  ws=""
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    after=$(list_ws_refs)
    ws=$(comm -13 <(printf '%s\n' "$before") <(printf '%s\n' "$after") | head -1)
    [[ -n "$ws" ]] && break
    sleep 0.05
  done
  [[ -n "$ws" ]] || { echo "could not detect new workspace" >&2; exit 1; }
  boss=$(cmux list-panes --workspace "$ws" | awk '/pane:/ {print $2; exit}')
  out=$("$CMUX_BIN" new-pane --workspace "$ws" --direction right --type browser --url "$URL" 2>&1) || true
  if [[ "$out" == OK* ]]; then
    browser=$(awk '{print $2}' <<<"$out")
    echo "✓ new workspace $ws (first-time layout only)"
    echo "  Pi:      $boss"
    echo "  Browser: ${browser:-?} → $URL"
    echo ""
    echo "Use this workspace once; later runs use attach mode (no new workspace)."
  else
    echo "✓ workspace $ws (Pi only — browser split failed: $out)"
  fi
}

if [[ "$NEW_WORKSPACE" -eq 1 ]]; then
  spawn_new_workspace
else
  open_in_current_workspace
fi
