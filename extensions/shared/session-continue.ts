import * as fs from "node:fs";
import * as path from "node:path";
import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { loadRoster } from "./subagent-roster.ts";

export interface SessionContinueConfig {
	/** Resume last session on startup (default true). */
	continueOnStart: boolean;
	/** Prefer boss session from .pi-flow/subagent-roster.json when valid. */
	preferBossSession: boolean;
}

export function loadSessionContinueConfig(
	settings: Record<string, unknown>,
): SessionContinueConfig {
	const piFlow = (settings.piFlow ?? {}) as Record<string, unknown>;
	const session = (piFlow.session ?? {}) as Record<string, unknown>;
	return {
		continueOnStart: session.continueOnStart !== false,
		preferBossSession: session.preferBossSession !== false,
	};
}

function getDefaultSessionDir(cwd: string): string {
	const agentDir = getAgentDir();
	const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
	const sessionDir = path.join(agentDir, "sessions", safePath);
	fs.mkdirSync(sessionDir, { recursive: true });
	return sessionDir;
}

function isValidSessionFile(filePath: string): boolean {
	try {
		const fd = fs.openSync(filePath, "r");
		const buffer = Buffer.alloc(512);
		const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
		fs.closeSync(fd);
		const firstLine = buffer.toString("utf8", 0, bytesRead).split("\n")[0];
		if (!firstLine) return false;
		const header = JSON.parse(firstLine) as { type?: string; id?: string };
		return header.type === "session" && typeof header.id === "string";
	} catch {
		return false;
	}
}

function findMostRecentSession(sessionDir: string): string | null {
	try {
		const files = fs
			.readdirSync(sessionDir)
			.filter((f) => f.endsWith(".jsonl"))
			.map((f) => path.join(sessionDir, f))
			.filter(isValidSessionFile)
			.map((p) => ({ path: p, mtime: fs.statSync(p).mtime }))
			.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
		return files[0]?.path ?? null;
	} catch {
		return null;
	}
}

function isMessageEntry(entry: SessionEntry): boolean {
	return entry.type === "message";
}

/** True when the active session has no user/assistant turns yet (incl. not flushed to disk). */
export function isFreshSession(entries: SessionEntry[]): boolean {
	return !entries.some((e) => {
		if (!isMessageEntry(e)) return false;
		const role = (e as { message?: { role?: string } }).message?.role;
		return role === "user" || role === "assistant";
	});
}

function sessionFileHasConversation(filePath: string): boolean {
	try {
		const raw = fs.readFileSync(filePath, "utf8");
		for (const line of raw.split("\n")) {
			if (!line.trim()) continue;
			try {
				const entry = JSON.parse(line) as SessionEntry;
				if (!isMessageEntry(entry)) continue;
				const role = (entry as { message?: { role?: string } }).message?.role;
				if (role === "user" || role === "assistant") return true;
			} catch {
				// skip bad lines
			}
		}
	} catch {
		return false;
	}
	return false;
}

export function resolveContinueTarget(
	cwd: string,
	opts?: { preferBossSession?: boolean },
): string | null {
	const preferBoss = opts?.preferBossSession !== false;
	if (preferBoss) {
		const roster = loadRoster(cwd, null);
		const boss = roster.bossSessionFile?.trim();
		if (boss && fs.existsSync(boss) && sessionFileHasConversation(boss)) {
			return boss;
		}
	}

	const sessionDir = getDefaultSessionDir(cwd);
	const recent = findMostRecentSession(sessionDir);
	if (recent && sessionFileHasConversation(recent)) {
		return recent;
	}
	return null;
}

export function shouldAutoContinueOnStartup(
	settings: Record<string, unknown>,
): boolean {
	if (process.env.PI_FLOW_NO_CONTINUE === "1") return false;
	if (process.env.PI_FLOW_CONTINUE_REEXEC === "1") return false;
	return loadSessionContinueConfig(settings).continueOnStart;
}

/** CLI args that mean "do not inject --continue". */
export function argvHasExplicitSessionIntent(argv: string[]): boolean {
	const flags = new Set([
		"-c",
		"--continue",
		"-r",
		"--resume",
		"--no-session",
		"--new",
	]);
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		if (flags.has(arg)) return true;
		if (arg === "--session" || arg === "--fork" || arg === "--session-dir") {
			return true;
		}
	}
	return false;
}

export function injectContinueArgv(argv: string[]): string[] {
	if (argvHasExplicitSessionIntent(argv)) return argv;
	return ["-c", ...argv];
}

export function formatContinueBasename(sessionPath: string): string {
	return path.basename(sessionPath).replace(/\.jsonl$/, "");
}
