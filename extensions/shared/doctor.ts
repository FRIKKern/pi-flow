import * as fs from "node:fs";
import * as path from "node:path";
import { checkPaperflowHost } from "./host-manager.ts";
import { cmuxDetectJson, isInCmux } from "./paperflow-client.ts";
import { PAPERFLOW_BIN } from "./paths.ts";
import { commandExists, runCommand } from "./exec.ts";

export interface DoctorCheck {
	name: string;
	status: "pass" | "warn" | "fail" | "skip";
	detail: string;
}

export async function runPiFlowDoctor(
	cwd: string,
	packageRoot: string,
): Promise<DoctorCheck[]> {
	const checks: DoctorCheck[] = [];

	checks.push(await checkCommand("pi", ["--version"], "Pi CLI"));
	checks.push(checkBundled(packageRoot, "pi-subagents"));
	checks.push(checkBundled(packageRoot, "pi-mcp-adapter"));
	checks.push(optionalBundled(packageRoot, "pi-cursor-provider"));

	const host = await checkPaperflowHost();
	checks.push({
		name: "paperflow-daemon (:8767)",
		status: host.running ? "pass" : "warn",
		detail: host.running
			? host.detail
			: `${host.detail} — use paperflow_host ensure or paperflow quickstart`,
	});

	const cmux = await cmuxDetectJson();
	checks.push({
		name: "cmux",
		status: isInCmux(cmux) ? "pass" : "warn",
		detail: isInCmux(cmux)
			? `ready (${String(cmux?.workspace ?? process.env.CMUX_WORKSPACE_ID ?? "").slice(0, 12)}…)`
			: "not detected",
	});

	if (commandExists(PAPERFLOW_BIN.preflight())) {
		const pf = await runCommand(PAPERFLOW_BIN.preflight(), [], { timeout: 30_000 });
		checks.push({
			name: "paperflow-preflight",
			status: pf.ok ? "pass" : "fail",
			detail: pf.ok ? (pf.stdout.split("\n")[0] ?? "ok") : pf.error,
		});
	} else {
		checks.push({ name: "paperflow-preflight", status: "skip", detail: "not installed" });
	}

	if (commandExists(PAPERFLOW_BIN.doctor())) {
		const doc = await runCommand(PAPERFLOW_BIN.doctor(), ["--fast"], { timeout: 60_000 });
		checks.push({
			name: "paperflow-doctor",
			status: doc.ok ? "pass" : "warn",
			detail: doc.ok ? "ok" : doc.error,
		});
	}

	const goalFile = path.join(cwd, ".paperflow", "active-goal");
	checks.push({
		name: "active-goal",
		status: fs.existsSync(goalFile) ? "pass" : "skip",
		detail: fs.existsSync(goalFile)
			? fs.readFileSync(goalFile, "utf8").trim()
			: "none",
	});

	const agentsDir = path.join(cwd, ".pi", "agents", "pi-flow");
	checks.push({
		name: "project agents",
		status: fs.existsSync(agentsDir) ? "pass" : "warn",
		detail: fs.existsSync(agentsDir)
			? `${fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length} in .pi/agents/pi-flow/`
			: "run /pi-flow-setup",
	});

	return checks;
}

export function formatDoctorReport(checks: DoctorCheck[]): string {
	const lines = ["pi-flow doctor", ""];
	for (const c of checks) {
		const icon =
			c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : c.status === "warn" ? "!" : "·";
		lines.push(`${icon} ${c.name}: ${c.detail}`);
	}
	lines.push(
		"",
		"Tools: paperflow_host · paperflow_verify · paperflow_beads · paperflow_cmux",
		"Docs: docs/BEST-PRACTICES.md · docs/HOST.md",
	);
	return lines.join("\n");
}

async function checkCommand(
	cmd: string,
	args: string[],
	name: string,
): Promise<DoctorCheck> {
	const result = await runCommand(cmd, args, { timeout: 10_000 });
	return {
		name,
		status: result.ok ? "pass" : "fail",
		detail: result.ok ? (result.stdout.split("\n")[0] ?? "ok") : result.error,
	};
}

function checkBundled(packageRoot: string, pkg: string): DoctorCheck {
	const entry = path.join(packageRoot, "node_modules", pkg);
	return {
		name: pkg,
		status: fs.existsSync(entry) ? "pass" : "warn",
		detail: fs.existsSync(entry) ? "bundled" : "missing",
	};
}

function optionalBundled(packageRoot: string, pkg: string): DoctorCheck {
	const entry = path.join(packageRoot, "node_modules", pkg);
	return {
		name: pkg,
		status: fs.existsSync(entry) ? "pass" : "skip",
		detail: fs.existsSync(entry) ? "optional, installed" : "optional, not installed",
	};
}
