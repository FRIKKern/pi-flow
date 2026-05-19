import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DAEMON_URL =
	process.env.PAPERFLOW_DAEMON_URL ?? "http://localhost:8767";

export interface CmuxDetect {
	cmux?: boolean;
	version?: string;
	workspace?: string;
	[key: string]: unknown;
}

export interface ActiveGoalContext {
	goalId: string | null;
	phaseId: string | null;
	goalPath: string | null;
	phasePath: string | null;
	summary: string;
}

export async function cmuxDetectJson(): Promise<CmuxDetect | null> {
	if (process.env.CMUX_WORKSPACE_ID) {
		return {
			cmux: true,
			workspace: process.env.CMUX_WORKSPACE_ID,
			source: "env",
		};
	}

	const detect =
		process.env.PAPERFLOW_CMUX_DETECT ??
		(process.env.HOME
			? `${process.env.HOME}/.local/bin/paperflow-cmux-detect`
			: "");

	if (!detect) return null;

	try {
		const { stdout } = await execFileAsync(detect, [], {
			env: process.env,
			timeout: 5000,
		});
		return JSON.parse(stdout) as CmuxDetect;
	} catch {
		return null;
	}
}

export async function registerPiFlowSession(): Promise<{
	ok: boolean;
	sessionId?: string;
	reason?: string;
}> {
	if (process.env.CMUX_WORKSPACE_ID) {
		process.env.PI_FLOW_SESSION_ID ??=
			process.env.PI_SESSION_ID ??
			`pi-flow-${process.pid}-${Date.now()}`;
	}

	const sessionId =
		process.env.PI_FLOW_SESSION_ID ?? process.env.PI_SESSION_ID ?? "";
	if (!sessionId) {
		return { ok: false, reason: "no session id" };
	}

	let cmuxSurface = process.env.CMUX_SURFACE_REF ?? process.env.CMUX_SURFACE_ID ?? "";
	if (!cmuxSurface) {
		try {
			const { stdout } = await execFileAsync(
				"cmux",
				["identify", "--json"],
				{ timeout: 3000 },
			);
			const parsed = JSON.parse(stdout) as {
				caller?: { surface_ref?: string };
			};
			cmuxSurface = parsed.caller?.surface_ref ?? "";
		} catch {
			// optional
		}
	}

	let tty = "";
	try {
		const t = await execFileAsync("tty", [], { timeout: 1000 });
		tty = t.stdout.trim();
		if (!tty.startsWith("/dev/")) tty = "";
	} catch {
		tty = "";
	}

	const body = {
		session_id: sessionId,
		agent: "pi-flow",
		cmux_workspace: process.env.CMUX_WORKSPACE_ID ?? null,
		cmux_surface: cmuxSurface || null,
		tty: tty || null,
		pid: process.pid,
	};

	try {
		const response = await fetch(`${DAEMON_URL}/sessions/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(2000),
		});
		if (response.ok) {
			return { ok: true, sessionId };
		}
		return { ok: false, reason: `HTTP ${response.status}` };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, reason: message };
	}
}

export async function verifyPaperflowDoc(
	url: string,
	kind?: string,
): Promise<{ verdict: string; line: string }> {
	const verify =
		process.env.PAPERFLOW_DOC_VERIFY ??
		(process.env.HOME
			? `${process.env.HOME}/.local/bin/paperflow-doc-verify`
			: "paperflow-doc-verify");

	const args = [url];
	if (kind) args.push("--kind", kind);

	try {
		const { stdout } = await execFileAsync(verify, args, {
			env: process.env,
			timeout: 60_000,
		});
		const line = stdout.trim().split("\n").pop() ?? "SKIP: no output";
		const verdict = line.split(":")[0]?.trim() ?? "SKIP";
		return { verdict, line };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { verdict: "SKIP", line: `SKIP: ${message}` };
	}
}

export async function cmuxBrowserOpen(url: string): Promise<string> {
	const { stdout } = await execFileAsync("cmux", ["--json", "browser", "open", url], {
		env: process.env,
		timeout: 15_000,
	});
	return stdout.trim();
}

export function readActiveGoalContext(cwd: string): ActiveGoalContext | null {
	const goalPath = path.join(cwd, ".paperflow", "active-goal");
	const phasePath = path.join(cwd, ".paperflow", "active-phase");

	const goalId = readTrimmedFile(goalPath);
	const phaseId = readTrimmedFile(phasePath);

	if (!goalId && !phaseId) return null;

	const lines = [
		goalId ? `Active goal: ${goalId}` : null,
		phaseId ? `Active phase: ${phaseId}` : null,
		`Pointers: ${goalPath}${phaseId ? ` · ${phasePath}` : ""}`,
	].filter((line): line is string => line !== null);

	return {
		goalId,
		phaseId,
		goalPath: fs.existsSync(goalPath) ? goalPath : null,
		phasePath: fs.existsSync(phasePath) ? phasePath : null,
		summary: lines.join("\n"),
	};
}

function readTrimmedFile(filePath: string): string | null {
	try {
		const value = fs.readFileSync(filePath, "utf8").trim();
		return value || null;
	} catch {
		return null;
	}
}

export function isInCmux(detect: CmuxDetect | null): boolean {
	return Boolean(process.env.CMUX_WORKSPACE_ID || detect?.cmux === true);
}
