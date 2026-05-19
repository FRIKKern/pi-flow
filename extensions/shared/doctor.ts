import * as fs from "node:fs";
import * as path from "node:path";
import { resolveBdCommand } from "./deps.ts";
import { checkPaperflowHost } from "./host-manager.ts";
import { cmuxDetectJson, isInCmux } from "./paperflow-client.ts";
import { PAPERFLOW_BIN } from "./paths.ts";
import { commandExists, runCommand } from "./exec.ts";
import { loadStreamedRules } from "./streamed-rules.ts";

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

	const bd = resolveBdCommand(packageRoot);
	const bdVer = await runCommand(bd.cmd, [...bd.argsPrefix, "--version"], { timeout: 10_000 });
	checks.push({
		name: "beads (bd)",
		status: bdVer.ok ? "pass" : "fail",
		detail: bdVer.ok ? (bdVer.stdout.split("\n")[0] ?? "ok") : "run /pi-flow-install-deps",
	});

	const beadsDir = path.join(cwd, ".beads");
	checks.push({
		name: "beads repo (.beads/)",
		status: fs.existsSync(beadsDir) ? "pass" : "warn",
		detail: fs.existsSync(beadsDir) ? "initialized" : "run /pi-flow-setup in project root",
	});

	checks.push(await checkCommand("jq", ["--version"], "jq"));
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
			: "not detected — optional; see docs/CMUX.md",
	});

	const rules = loadStreamedRules(cwd);
	checks.push({
		name: "streamed lifecycle rules",
		status: rules.length > 0 ? "pass" : "warn",
		detail: `${rules.length} rule(s) — bundled + .pi-flow/streamed-rules.json`,
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
			: "none — /skill:goal",
	});

	const agentsDir = path.join(cwd, ".pi", "agents", "pi-flow");
	checks.push({
		name: "project agents",
		status: fs.existsSync(agentsDir) ? "pass" : "warn",
		detail: fs.existsSync(agentsDir)
			? `${fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length} in .pi/agents/pi-flow/`
			: "run /pi-flow-setup",
	});

	const policyEnv = process.env.PI_FLOW_ALLOW_DESTRUCTIVE === "1";
	checks.push({
		name: "runtime policy",
		status: policyEnv ? "warn" : "pass",
		detail: policyEnv
			? "PI_FLOW_ALLOW_DESTRUCTIVE=1 — destructive shell/git allowed"
			: "blocks rm -rf, force-push, reset --hard; redacts secrets in tool output",
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
		"Full dashboard: /pi-flow-status",
		"Tools: paperflow_host · paperflow_verify · paperflow_beads · paperflow_cmux · paperflow_active_goal",
		"Docs: docs/BEST-PRACTICES.md · docs/HOST.md · docs/EDITING.md",
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
		detail: fs.existsSync(entry) ? "bundled" : "missing — run npm install in pi-flow package",
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
