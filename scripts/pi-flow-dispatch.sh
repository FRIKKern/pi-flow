#!/usr/bin/env bash
# Send a message to the boss Pi session in cmux (grill bridge / cmux send).
# Does NOT spawn a new workspace — Pi receives the line and runs subagents in-place.
#
# Usage:
#   pi-flow-dispatch.sh "/skill:review"
#   pi-flow-dispatch.sh --workspace "$CMUX_WORKSPACE_ID" "/skill:autopilot \"…\""
#   CMUX_WORKSPACE_ID=… pi-flow-dispatch.sh "/skill:review"
set -euo pipefail

DAEMON="${PAPERFLOW_DAEMON_URL:-http://localhost:8767}"
WORKSPACE="${CMUX_WORKSPACE_ID:-}"
SESSION_ID=""
MESSAGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace) WORKSPACE="$2"; shift 2 ;;
    --session) SESSION_ID="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      MESSAGE="$1"
      shift
      ;;
  esac
done

if [[ -z "$MESSAGE" ]]; then
  echo "usage: pi-flow-dispatch.sh [--workspace UUID] [--session id] \"<message>\"" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PAPERFLOW_DAEMON_URL="$DAEMON"
export CMUX_WORKSPACE_ID="${WORKSPACE:-${CMUX_WORKSPACE_ID:-}}"
exec node "${ROOT}/scripts/pi-flow-dispatch.mjs" \
  ${WORKSPACE:+--workspace "$WORKSPACE"} \
  ${SESSION_ID:+--session "$SESSION_ID"} \
  "$MESSAGE"
