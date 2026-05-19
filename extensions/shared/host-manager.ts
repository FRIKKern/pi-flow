import * as fs from "node:fs";
import { DAEMON_URL } from "./constants.ts";
import { PAPERFLOW_BIN } from "./paths.ts";
import { commandExists, runCommand } from "./exec.ts";

export interface HostStatus {
	running: boolean;
	url: string;
	detail: string;
	spawnAttempted?: boolean;
}

export async function checkPaperflowHost(): Promise<HostStatus> {
	try {
		const response = await fetch(`${DAEMON_URL}/health`, {
			signal: AbortSignal.timeout(2000),
		});
		if (response.ok) {
			let body = "";
			try {
				body = await response.text();
			} catch {
				body = "ok";
			}
			return {
				running: true,
				url: DAEMON_URL,
				detail: body.slice(0, 200) || "healthy",
			};
		}
		return {
			running: false,
			url: DAEMON_URL,
			detail: `HTTP ${response.status}`,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { running: false, url: DAEMON_URL, detail: message };
	}
}

/** Delegate to paperflow install — never embed daemon inside Pi. */
export async function ensurePaperflowHost(): Promise<HostStatus> {
	const initial = await checkPaperflowHost();
	if (initial.running) return initial;

	const spawnPath = PAPERFLOW_BIN.daemonSpawn();
	if (commandExists(spawnPath)) {
		const spawn = await runCommand(spawnPath, [], { timeout: 15_000 });
		if (spawn.ok) {
			await sleep(800);
			const after = await checkPaperflowHost();
			return {
				...after,
				spawnAttempted: true,
				detail: after.running
					? "started via paperflow-daemon-spawn"
					: `spawn ran but health failed: ${after.detail}`,
			};
		}
	}

	const label = process.env.PAPERFLOW_DAEMON_LABEL ?? guessLaunchdLabel();
	if (label) {
		const uid = typeof process.getuid === "function" ? process.getuid() : 501;
		const kick = await runCommand(
			"launchctl",
			["kickstart", "-k", `gui/${uid}/${label}`],
			{ timeout: 10_000 },
		);
		if (kick.ok) {
			await sleep(1200);
			const after = await checkPaperflowHost();
			return {
				...after,
				spawnAttempted: true,
				detail: after.running
					? `started via launchctl ${label}`
					: `kickstart ran but health failed: ${after.detail}`,
			};
		}
	}

	return {
		...initial,
		detail: `${initial.detail}. Install: curl -fsSL https://raw.githubusercontent.com/FRIKKern/paperflow/main/scripts/quickstart.sh | bash`,
	};
}

function guessLaunchdLabel(): string | null {
	const home = process.env.HOME ?? "";
	const agentsDir = `${home}/Library/LaunchAgents`;
	if (!home || !fs.existsSync(agentsDir)) return null;
	const match = fs
		.readdirSync(agentsDir)
		.find((name) => name.includes("paperflow-daemon") && name.endsWith(".plist"));
	return match ? match.replace(/\.plist$/, "") : null;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
