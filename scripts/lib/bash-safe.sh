# shellcheck shell=bash
# Shared helpers for pi-flow install scripts.
# Requirements: macOS default bash 3.2, curl | bash (no BASH_SOURCE), set -u-safe empty arrays.
#
# Usage (from scripts/foo.sh):
#   # shellcheck source=lib/bash-safe.sh
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/bash-safe.sh"
#   pi_flow_init_scripts "${BASH_SOURCE[0]:-}"

PI_FLOW_RAW_BASE="${PI_FLOW_RAW_BASE:-https://raw.githubusercontent.com/FRIKKern/pi-flow/main}"

pi_flow_info() { printf '\033[36m→\033[0m %s\n' "$*"; }
pi_flow_warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
pi_flow_ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }
pi_flow_die() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# Safe empty-array expansion for bash 3.2 + nounset (use instead of "${arr[@]}").
# Example: bash "$cmd" $(pi_flow_array_args "${INSTALL_ARGS[@]}")
pi_flow_array_args() {
	if [ "$#" -eq 0 ]; then
		return 0
	fi
	printf '%s\n' "$@"
}

# Download standard script bundle into PI_FLOW_SCRIPTS_TMP (curl | bash path).
pi_flow_fetch_script_bundle() {
	local tmp="${1:-}"
	local names=(
		install-deps.sh
		install-cmux-shell.sh
		cmux-boss-layout.sh
		install-paperflow-host.sh
		install-opencode-integration.sh
		bootstrap-pi-flow.sh
	)
	if [ -z "$tmp" ]; then
		tmp="$(mktemp -d -t pi-flow-scripts.XXXXXX)"
		PI_FLOW_SCRIPTS_TMP_CREATED=1
	fi
	PI_FLOW_SCRIPTS_TMP="$tmp"
	mkdir -p "$PI_FLOW_SCRIPTS_TMP/lib"
	pi_flow_info "Downloading pi-flow helper scripts…"
	curl -fsSL "${PI_FLOW_RAW_BASE}/scripts/lib/bash-safe.sh" -o "${PI_FLOW_SCRIPTS_TMP}/lib/bash-safe.sh" \
		|| pi_flow_die "could not download scripts/lib/bash-safe.sh"
	local f url
	for f in "${names[@]}"; do
		url="${PI_FLOW_RAW_BASE}/scripts/${f}"
		curl -fsSL "$url" -o "${PI_FLOW_SCRIPTS_TMP}/${f}" \
			|| pi_flow_die "could not download ${f} from ${url}"
	done
	chmod +x "${PI_FLOW_SCRIPTS_TMP}/install-cmux-shell.sh" \
		"${PI_FLOW_SCRIPTS_TMP}/cmux-boss-layout.sh" \
		"${PI_FLOW_SCRIPTS_TMP}/install-paperflow-host.sh" 2>/dev/null || true
	export PI_FLOW_SCRIPTS_TMP
}

# Resolve script directory or fetch bundle when invoked via curl | bash.
# Arg: path to calling script (pass "${BASH_SOURCE[0]:-}").
pi_flow_init_scripts() {
	local caller="${1:-}"
	PI_FLOW_SCRIPT_DIR=""
	PI_FLOW_SCRIPTS_TMP_CREATED=0

	if [ -n "$caller" ] && [ -f "$caller" ]; then
		PI_FLOW_SCRIPT_DIR="$(cd "$(dirname "$caller")" && pwd)"
		export PI_FLOW_SCRIPTS_TMP="${PI_FLOW_SCRIPTS_TMP:-$PI_FLOW_SCRIPT_DIR}"
		return 0
	fi

	pi_flow_fetch_script_bundle ""
	trap 'if [ "${PI_FLOW_SCRIPTS_TMP_CREATED:-0}" = 1 ]; then rm -rf "${PI_FLOW_SCRIPTS_TMP:-}"; fi' EXIT
}

pi_flow_script_path() {
	local name="$1"
	if [ -f "${PI_FLOW_SCRIPTS_TMP:-}/${name}" ]; then
		printf '%s\n' "${PI_FLOW_SCRIPTS_TMP}/${name}"
		return 0
	fi
	if [ -n "${PI_FLOW_SCRIPT_DIR:-}" ] && [ -f "${PI_FLOW_SCRIPT_DIR}/${name}" ]; then
		printf '%s\n' "${PI_FLOW_SCRIPT_DIR}/${name}"
		return 0
	fi
	return 1
}

# Self-test for CI (empty array + set -u — macOS bash 3.2).
pi_flow_self_test() {
	local errors=0
	if ! bash -c 'set -euo pipefail; a=(); bash -c "exit 0" ${a+"${a[@]}"}'; then
		printf 'FAIL: empty array + set -u\n' >&2
		errors=$((errors + 1))
	fi
	if ! bash -c 'set -euo pipefail; a=(--yes); set -- ${a+"${a[@]}"}; test "$1" = --yes'; then
		printf 'FAIL: non-empty array + set -u\n' >&2
		errors=$((errors + 1))
	fi
	return "$errors"
}
