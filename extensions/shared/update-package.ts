import { runCommand } from "./exec.ts";

const PI_FLOW_PACKAGE = "git:github.com/FRIKKern/pi-flow";

export async function updatePiFlowPackage(): Promise<{
	ok: boolean;
	stdout: string;
	detail: string;
}> {
	const result = await runCommand("pi", ["update", PI_FLOW_PACKAGE], {
		timeout: 300_000,
	});
	if (result.ok) {
		return {
			ok: true,
			stdout: result.stdout,
			detail: result.stdout.split("\n").slice(-3).join(" ") || "updated",
		};
	}

	const fallback = await runCommand("pi", ["install", PI_FLOW_PACKAGE], {
		timeout: 300_000,
	});
	return {
		ok: fallback.ok,
		stdout: fallback.ok ? fallback.stdout : result.stdout,
		detail: fallback.ok
			? "installed (update failed, install succeeded)"
			: `update failed: ${result.error}`,
	};
}
