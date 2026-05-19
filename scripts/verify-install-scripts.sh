#!/usr/bin/env bash
# CI / maintainer check: bash 3.2-safe install scripts, syntax, curl|bash verify mode.
set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
FAIL=0

info() { printf '→ %s\n' "$*"; }
ok() { printf '✓ %s\n' "$*"; }
fail() { printf '✗ %s\n' "$*" >&2; FAIL=1; }

info "syntax check (bash -n)"
while IFS= read -r -d '' f; do
	if ! bash -n "$f"; then
		fail "syntax error: $f"
	fi
done < <(find scripts -name '*.sh' -print0)

info "bash-safe self-test"
# shellcheck source=scripts/lib/bash-safe.sh
source "${ROOT}/scripts/lib/bash-safe.sh"
if pi_flow_self_test; then
	ok "empty-array + set -u"
else
	fail "bash-safe self-test"
fi

info "quickstart verify (repo checkout)"
if PI_FLOW_VERIFY=1 bash scripts/quickstart.sh; then
	ok "quickstart PI_FLOW_VERIFY"
else
	fail "quickstart PI_FLOW_VERIFY"
fi

info "update verify (repo checkout)"
if PI_FLOW_VERIFY=1 bash scripts/update.sh; then
	ok "update PI_FLOW_VERIFY"
else
	fail "update PI_FLOW_VERIFY"
fi

info "quickstart verify (stdin — simulated curl | bash, local file:// bundle)"
export PI_FLOW_VERIFY=1
# file:// so CI/PR tests the PR branch without hitting GitHub raw
export PI_FLOW_RAW_BASE="file://${ROOT}"
if PI_FLOW_VERIFY=1 bash <"${ROOT}/scripts/quickstart.sh"; then
	ok "stdin quickstart verify (curl|bash path)"
else
	fail "stdin quickstart verify"
fi

if [ "$FAIL" -eq 0 ]; then
	ok "all install script checks passed"
	exit 0
fi
fail "install script checks failed"
exit 1
