#!/usr/bin/env bash
# Create a cmux workspace: Pi on the left, paperflow browser on the right.
# Usage:
#   cmux-layout.sh [repo-path] [goal-slug]
#   cmux-layout.sh --url 'http://localhost:8767/paperflow/grills/foo-grill.html' [repo]
#   cmux-layout.sh --grill 2026-05-19-pi-flow-browserbase-integration [repo]
set -euo pipefail

REPO="$(pwd)"
NAME="pi-flow"
URL=""
DAEMON="${PAPERFLOW_DAEMON_URL:-http://localhost:8767}"

usage() {
  cat <<'EOF'
Usage: cmux-layout.sh [options] [repo-path] [goal-slug]

  Pi terminal (left) + paperflow browser (right, ~50% width).

Options:
  --url <url>     Browser pane URL (default: paperflow home, or grill when slug matches)
  --grill <slug>  Open /paperflow/grills/<slug>-grill.html in the browser pane
  -h, --help      This help

Examples:
  cmux-layout.sh "$(pwd)" browserbase
  cmux-layout.sh --grill 2026-05-19-pi-flow-browserbase-integration
  pif --cwd "$(pwd)" browserbase --url http://localhost:8767/paperflow/grills/2026-05-19-pi-flow-browserbase-integration-grill.html
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="$2"; shift 2 ;;
    --grill)
      URL="${DAEMON}/paperflow/grills/${2}-grill.html"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *)
      if [[ "$REPO" == "$(pwd)" && ! -d "$REPO/.git" ]] && [[ -d "$1" ]]; then
        REPO="$1"
      else
        NAME="$1"
      fi
      shift
      ;;
  esac
done

CMUX_BIN="$(command -v cmux || true)"
command -v jq >/dev/null 2>&1 || { echo "jq required" >&2; exit 1; }

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
      URL="${DAEMON}/paperflow/grills/2026-05-19-pi-flow-browserbase-integration-grill.html"
      ;;
    *)
      URL="${DAEMON}/"
      ;;
  esac
fi

list_ws_refs() { cmux list-workspaces | grep -oE 'workspace:[0-9]+' | sort -u; }

BEFORE=$(list_ws_refs)
"$CMUX_BIN" new-workspace \
  --name "pi-flow:${NAME}" \
  --cwd "$REPO" \
  --command "pi" >/dev/null

WS=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  AFTER=$(list_ws_refs)
  WS=$(comm -13 <(printf '%s\n' "$BEFORE") <(printf '%s\n' "$AFTER") | head -1)
  [[ -n "$WS" ]] && break
  sleep 0.05
done
[[ -n "$WS" ]] || { echo "could not detect new workspace" >&2; exit 1; }

BOSS=$(cmux list-panes --workspace "$WS" | awk '/pane:/ {print $2; exit}')
[[ "$BOSS" == pane:* ]] || { echo "could not find initial pane" >&2; exit 1; }

OUT=$("$CMUX_BIN" new-pane --workspace "$WS" --direction right --type browser --url "$URL" 2>&1) || true
if [[ "$OUT" == OK\ * ]]; then
  BROWSER=$(awk '{print $2}' <<<"$OUT")
  echo "✓ pi-flow layout ready in $WS"
  echo "  Pi:      $BOSS (left)"
  echo "  Browser: ${BROWSER:-?} → $URL"
  echo ""
  echo "In Pi: review grill → Submit answers (left pane must stay registered)."
else
  echo "✓ workspace $WS (Pi only — browser split failed: $OUT)"
  echo "  Open manually: cmux browser open '$URL'"
fi
