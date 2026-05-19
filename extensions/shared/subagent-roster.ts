import * as fs from "node:fs";
import * as path from "node:path";

export type SubagentRunStatus = "running" | "completed" | "failed" | "detached";

export interface SubagentRunEntry {
	id: string;
	agent: string;
	status: SubagentRunStatus;
	sessionFile?: string;
	taskPreview?: string;
	startedAt: number;
	updatedAt: number;
	runId?: string;
	toolCallId?: string;
	workerSlot?: number;
}

export interface SubagentRosterState {
	bossSessionFile: string | null;
	viewing: "boss" | "follow";
	followRunId: string | null;
	autoFollow: boolean;
	runs: SubagentRunEntry[];
}

export function createRosterState(bossSessionFile: string | null): SubagentRosterState {
	return {
		bossSessionFile,
		viewing: "boss",
		followRunId: null,
		autoFollow: false,
		runs: [],
	};
}

export function upsertRun(
	state: SubagentRosterState,
	entry: Omit<SubagentRunEntry, "updatedAt"> & { updatedAt?: number },
): SubagentRunEntry {
	const now = entry.updatedAt ?? Date.now();
	const existing = state.runs.find((r) => r.id === entry.id);
	const merged: SubagentRunEntry = {
		...(existing ?? {}),
		...entry,
		updatedAt: now,
	};
	const next = state.runs.filter((r) => r.id !== entry.id);
	next.unshift(merged);
	state.runs = next.slice(0, 32);
	return merged;
}

export function markRunStatus(
	state: SubagentRosterState,
	id: string,
	status: SubagentRunStatus,
	sessionFile?: string,
): void {
	const run = state.runs.find((r) => r.id === id);
	if (!run) return;
	run.status = status;
	run.updatedAt = Date.now();
	if (sessionFile) run.sessionFile = sessionFile;
}

export function listRunning(state: SubagentRosterState): SubagentRunEntry[] {
	return state.runs.filter((r) => r.status === "running");
}

export function pickFollowTarget(
	state: SubagentRosterState,
	query?: string,
): SubagentRunEntry | undefined {
	const q = query?.trim();
	if (!q) {
		const running = listRunning(state);
		if (running[0]) return running[0];
		return state.runs.find((r) => r.sessionFile);
	}
	const byId = state.runs.find((r) => r.id.startsWith(q) || r.runId?.startsWith(q));
	if (byId) return byId;
	const byAgent = state.runs.find((r) => r.agent === q || r.agent.includes(q));
	if (byAgent) return byAgent;
	const idx = Number.parseInt(q, 10);
	if (Number.isFinite(idx) && idx >= 1 && idx <= state.runs.length) {
		return state.runs[idx - 1];
	}
	return undefined;
}

export function formatRosterLine(state: SubagentRosterState): string | undefined {
	const running = listRunning(state);
	if (state.viewing === "follow" && state.followRunId) {
		const run = state.runs.find((r) => r.id === state.followRunId);
		if (run) {
			return `follow:${run.agent}${running.length > 1 ? ` (+${running.length - 1})` : ""}`;
		}
	}
	if (running.length === 0) return undefined;
	const names = running.slice(0, 3).map((r) => r.agent);
	const extra = running.length > 3 ? ` +${running.length - 3}` : "";
	return `sub:${names.join(",")}${extra}`;
}

interface SubagentToolDetails {
	runId?: string;
	mode?: string;
	results?: Array<{
		agent?: string;
		sessionFile?: string;
		progress?: { status?: string };
		task?: string;
	}>;
	progress?: Array<{
		agent?: string;
		status?: string;
	}>;
}

export function ingestSubagentToolResult(
	state: SubagentRosterState,
	toolCallId: string,
	result: unknown,
): SubagentRunEntry[] {
	const details = (result as { details?: SubagentToolDetails })?.details;
	if (!details) return [];

	const runId = details.runId ?? toolCallId;
	const out: SubagentRunEntry[] = [];
	const now = Date.now();

	if (details.results?.length) {
		for (let i = 0; i < details.results.length; i++) {
			const r = details.results[i]!;
			const status = mapProgressStatus(r.progress?.status);
			const id = `${runId}:${r.agent ?? i}`;
			out.push(
				upsertRun(state, {
					id,
					runId,
					toolCallId,
					agent: r.agent ?? "subagent",
					status,
					sessionFile: r.sessionFile,
					taskPreview: r.task?.slice(0, 80),
					startedAt: now,
				}),
			);
		}
		return out;
	}

	if (details.progress?.length) {
		for (let i = 0; i < details.progress.length; i++) {
			const p = details.progress[i]!;
			const id = `${runId}:${p.agent ?? i}`;
			out.push(
				upsertRun(state, {
					id,
					runId,
					toolCallId,
					agent: p.agent ?? "subagent",
					status: mapProgressStatus(p.status),
					startedAt: now,
				}),
			);
		}
	}

	return out;
}

function mapProgressStatus(status?: string): SubagentRunStatus {
	switch (status) {
		case "running":
		case "pending":
			return "running";
		case "detached":
			return "detached";
		case "failed":
			return "failed";
		default:
			return "completed";
	}
}

export function rosterPersistPath(cwd: string): string {
	return path.join(cwd, ".pi-flow", "subagent-roster.json");
}

export function saveRoster(cwd: string, state: SubagentRosterState): void {
	try {
		const file = rosterPersistPath(cwd);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
	} catch {
		// non-fatal
	}
}

export function loadRoster(cwd: string, bossSessionFile: string | null): SubagentRosterState {
	const base = createRosterState(bossSessionFile);
	try {
		const file = rosterPersistPath(cwd);
		if (!fs.existsSync(file)) return base;
		const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as SubagentRosterState;
		return {
			...base,
			...parsed,
			bossSessionFile: bossSessionFile ?? parsed.bossSessionFile,
			runs: Array.isArray(parsed.runs) ? parsed.runs : [],
		};
	} catch {
		return base;
	}
}
