#!/usr/bin/env bash
# cmux-boss-layout — spawn a fresh boss layout in a new cmux workspace.
#
# Reference layout (matches the user's workspace:1, ratios 25/25/50 columns):
#
#   ┌─────────┬──────────┬───────────────────┐
#   │  boss   │ worker A │                   │
#   │ (75%h)  ├──────────┤                   │
#   │         │ worker B │      browser      │
#   │         ├──────────┤      (50% w)      │
#   ├─────────┤ worker C │                   │
#   │ term    ├──────────┤                   │
#   │ (25%h)  │ worker D │                   │
#   └─────────┴──────────┴───────────────────┘
#     25% w     25% w
#
# Usage:
#   cmux-boss-layout [--cwd <path>] [--name <title>] [--url <browser-url>] [--no-cc]
#                      [--pi] [--boss-command <cmd>] [--command <cmd>]
#
# Aliases (installed by pi-flow): pf = cc layout · pif = pi layout

set -euo pipefail

CWD="$PWD"
NAME=""
URL="about:blank"
LAUNCH_SHELL=1
BOSS_CMD="cc --agent cmux-boss"
WORKER_CMD="cc"

usage() {
  sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cwd) CWD="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --url) URL="$2"; shift 2 ;;
    --no-cc) LAUNCH_SHELL=0; shift ;;
    --pi)
      BOSS_CMD="pi"
      WORKER_CMD="pi"
      shift
      ;;
    --boss-command) BOSS_CMD="$2"; shift 2 ;;
    --command) WORKER_CMD="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "unknown arg: $1" >&2; usage 1 ;;
  esac
done

# pi-flow: default browser pane to paperflow host when using Pi layout
if [[ "$BOSS_CMD" == "pi" && "$URL" == "about:blank" ]]; then
  URL="${PAPERFLOW_DAEMON_URL:-http://localhost:8767}/"
fi

command -v cmux >/dev/null || { echo "cmux CLI not on PATH" >&2; exit 1; }
command -v jq   >/dev/null || { echo "jq required" >&2; exit 1; }

list_ws_refs() { cmux list-workspaces | grep -oE 'workspace:[0-9]+' | sort -u; }

BEFORE=$(list_ws_refs)
NEW_ARGS=(--cwd "$CWD")
[[ -n "$NAME" ]] && NEW_ARGS+=(--name "$NAME")
[[ $LAUNCH_SHELL -eq 1 ]] && NEW_ARGS+=(--command "$BOSS_CMD")

cmux new-workspace "${NEW_ARGS[@]}" >/dev/null
WS=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  AFTER=$(list_ws_refs)
  WS=$(comm -13 <(printf '%s\n' "$BEFORE") <(printf '%s\n' "$AFTER") | head -1)
  [[ -n "$WS" ]] && break
  sleep 0.05
done
[[ -n "$WS" ]] || { echo "could not detect new workspace" >&2; exit 1; }
WS_UUID=$(cmux rpc workspace.list '{}' \
  | jq -r --arg ref "$WS" '.workspaces[] | select(.ref==$ref) | .id')
[[ -n "$WS_UUID" ]] || { echo "could not resolve UUID for $WS" >&2; exit 1; }
echo "→ new workspace: $WS  ($WS_UUID)"

cmux rpc workspace.select "{\"workspace_id\":\"$WS_UUID\"}" >/dev/null &

BOSS=$(cmux list-panes --workspace "$WS" | awk '/pane:/ {print $2; exit}')
[[ "$BOSS" == pane:* ]] || { echo "could not find initial pane" >&2; exit 1; }
echo "  boss pane: $BOSS"

LAST_FOCUS_FILE=$(mktemp)
trap 'rm -f "$LAST_FOCUS_FILE"' EXIT

new_split() {
  local src_pane="$1" direction="$2"; shift 2
  if [[ "$(cat "$LAST_FOCUS_FILE" 2>/dev/null)" != "$src_pane" ]]; then
    cmux focus-pane --workspace "$WS" --pane "$src_pane" >/dev/null
    echo -n "$src_pane" >"$LAST_FOCUS_FILE"
  fi
  local out
  out=$(cmux new-pane --workspace "$WS" --direction "$direction" "$@" 2>&1)
  if [[ "$out" != OK\ * ]]; then
    echo "new-pane ($direction) failed: $out" >&2; exit 1
  fi
  awk '{print $2, $3}' <<<"$out"
}

boss_term_heights() {
  cmux rpc pane.list "{\"workspace_id\":\"$WS_UUID\"}" \
    | jq -r --arg b "$1" --arg t "$2" '
      [.panes[] | select(.ref==$b or .ref==$t)] as $p |
      ($p[] | select(.ref==$b) | .pixel_frame.height|tonumber) as $bh |
      ($p[] | select(.ref==$t) | .pixel_frame.height|tonumber) as $th |
      "\($bh) \($th)"
    '
}

read -r BROWSER_SURF BROWSER < <(new_split "$BOSS" right --type browser --url "$URL")
echo "  browser:       $BROWSER (surface $BROWSER_SURF)"

read -r CENTER_SURF CENTER < <(new_split "$BOSS" right)
echo "  center anchor: $CENTER (surface $CENTER_SURF)"

read -r TERM_SURF TERM < <(new_split "$BOSS" down)
echo "  terminal:      $TERM (surface $TERM_SURF)"

read -r W2_SURF W2 < <(new_split "$CENTER" down)
read -r W3_SURF W3 < <(new_split "$CENTER" down)
read -r W4_SURF W4 < <(new_split "$W2"     down)
echo "  workers:       $CENTER, $W3, $W2, $W4 (top→bottom)"

read -r BH TH < <(boss_term_heights "$BOSS" "$TERM")
COL_H=$(( BH + TH ))
TARGET_BOSS_H=$(( COL_H * 3 / 4 ))
DELTA_PX=$(( TARGET_BOSS_H - BH ))
if (( DELTA_PX > 0 )); then
  cmux resize-pane --workspace "$WS" --pane "$BOSS" -D --amount "$DELTA_PX" >/dev/null
  echo "  resized boss +${DELTA_PX}px down (boss → 75% of left column)"
fi

if [[ $LAUNCH_SHELL -eq 1 ]]; then
  for s in "$CENTER_SURF" "$W3_SURF" "$W2_SURF" "$W4_SURF"; do
    cmux send --workspace "$WS" --surface "$s" "${WORKER_CMD}\n" >/dev/null &
  done
  echo "  workers A-D: ${WORKER_CMD} launched in parallel"
fi
wait

cmux focus-pane --workspace "$WS" --pane "$BOSS" >/dev/null
echo "✓ boss layout ready in $WS"
