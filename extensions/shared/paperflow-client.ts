import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { DAEMON_URL } from "./constants.ts";
import { PAPERFLOW_BIN } from "./paths.ts";

const execFileAsync = promisify(execFile);

export { DAEMON_URL };

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

	const detect = PAPERFLOW_BIN.cmuxDetect();
	if (!detect || !fs.existsSync(detect)) return null;

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
	const verify = PAPERFLOW_BIN.docVerify();
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

async function readScopePointer(
	bin: string,
	kind: "goal" | "phase",
): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync(bin, ["--read", kind], {
			env: process.env,
			timeout: 3000,
		});
		return stdout.trim() || null;
	} catch (error: unknown) {
		const err = error as { stdout?: string };
		const value = err.stdout?.trim();
		return value || null;
	}
}

export async function readScopedGoalIds(): Promise<{
	goalId: string | null;
	phaseId: string | null;
	scope: string | null;
}> {
	const bin = PAPERFLOW_BIN.activeScope();
	if (!fs.existsSync(bin)) {
		return { goalId: null, phaseId: null, scope: null };
	}

	const [goalId, phaseId] = await Promise.all([
		readScopePointer(bin, "goal"),
		readScopePointer(bin, "phase"),
	]);

	let scope: string | null = null;
	try {
		const { stdout } = await execFileAsync(bin, ["--resolve"], {
			env: process.env,
			timeout: 3000,
		});
		scope = stdout.trim() || null;
	} catch {
		scope = null;
	}

	return { goalId, phaseId, scope };
}

export async function writeScopedGoalPointers(
	goalId: string,
	phaseId?: string,
): Promise<void> {
	const bin = PAPERFLOW_BIN.activeScope();
	if (!fs.existsSync(bin)) return;

	try {
		await execFileAsync(bin, ["--write", "goal", goalId.trim()], {
			env: process.env,
			timeout: 3000,
		});
		if (phaseId) {
			await execFileAsync(bin, ["--write", "phase", phaseId.trim()], {
				env: process.env,
				timeout: 3000,
			});
		}
	} catch {
		// optional — legacy repo pointers still work
	}
}

export async function cmuxIdentifyJson(): Promise<{
	workspaceRef?: string;
	paneRef?: string;
	surfaceRef?: string;
	surfaceType?: string;
	tabRef?: string;
} | null> {
	try {
		const { stdout } = await execFileAsync("cmux", ["identify", "--json"], {
			env: process.env,
			timeout: 3000,
		});
		const parsed = JSON.parse(stdout) as {
			caller?: {
				workspace_ref?: string;
				pane_ref?: string;
				surface_ref?: string;
				surface_type?: string;
				tab_ref?: string;
			};
		};
		const caller = parsed.caller;
		if (!caller) return null;
		return {
			workspaceRef: caller.workspace_ref,
			paneRef: caller.pane_ref,
			surfaceRef: caller.surface_ref,
			surfaceType: caller.surface_type,
			tabRef: caller.tab_ref,
		};
	} catch {
		return null;
	}
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

export function writeActiveGoalPointers(
	cwd: string,
	goalId: string,
	phaseId?: string,
): void {
	const dir = path.join(cwd, ".paperflow");
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, "active-goal"), `${goalId.trim()}\n`, "utf8");
	if (phaseId) {
		fs.writeFileSync(path.join(dir, "active-phase"), `${phaseId.trim()}\n`, "utf8");
	}
	void writeScopedGoalPointers(goalId, phaseId);
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
