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

/** Running entries that have a persisted session (followable). */
export function listFollowableRunning(state: SubagentRosterState): SubagentRunEntry[] {
	return state.runs.filter((r) => r.status === "running" && Boolean(r.sessionFile));
}

/** Running placeholders from tool_execution_start before a session exists. */
export function listPendingRunning(state: SubagentRosterState): SubagentRunEntry[] {
	return state.runs.filter((r) => r.status === "running" && !r.sessionFile);
}

export function listRunning(state: SubagentRosterState): SubagentRunEntry[] {
	return state.runs.filter((r) => r.status === "running");
}

/** Max age for a running entry with no session before we treat it as stale. */
const PENDING_STALE_MS = 2 * 60 * 1000;
/** Max age for any running entry before we auto-complete it. */
const RUNNING_STALE_MS = 30 * 60 * 1000;

/**
 * Drop ghost "running" rows and cap history so the footer/widget stay honest.
 * Call on load and before rendering status/widget.
 */
export function reconcileRoster(state: SubagentRosterState, now = Date.now()): void {
	for (const run of state.runs) {
		if (run.status !== "running") continue;
		const age = now - (run.updatedAt || run.startedAt || now);
		if (!run.sessionFile && age > PENDING_STALE_MS) {
			run.status = "completed";
			run.updatedAt = now;
			continue;
		}
		if (age > RUNNING_STALE_MS) {
			run.status = "completed";
			run.updatedAt = now;
		}
	}
	// Keep completed/failed entries for stack history, but trim deep backlog.
	state.runs = state.runs.slice(0, 32);
}

/** Mark every placeholder row for a tool call when the tool returns without details. */
export function finalizeToolCallRuns(
	state: SubagentRosterState,
	toolCallId: string,
	status: SubagentRunStatus = "completed",
): void {
	const now = Date.now();
	for (const run of state.runs) {
		if (run.toolCallId !== toolCallId) continue;
		if (run.status !== "running") continue;
		run.status = status;
		run.updatedAt = now;
	}
}

export function pickFollowTarget(
	state: SubagentRosterState,
	query?: string,
): SubagentRunEntry | undefined {
	reconcileRoster(state);
	const q = query?.trim();
	if (!q) {
		const followable = listFollowableRunning(state);
		if (followable[0]) return followable[0];
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
	reconcileRoster(state);
	const followable = listFollowableRunning(state);
	const pending = listPendingRunning(state);
	if (state.viewing === "follow" && state.followRunId) {
		const run = state.runs.find((r) => r.id === state.followRunId);
		if (run) {
			const others = followable.filter((r) => r.id !== run.id).length + pending.length;
			return `follow:${run.agent}${others > 0 ? ` (+${others})` : ""}`;
		}
	}
	if (followable.length === 0 && pending.length === 0) return undefined;
	const parts: string[] = [];
	if (followable.length > 0) {
		const byAgent = new Map<string, number>();
		for (const r of followable) {
			byAgent.set(r.agent, (byAgent.get(r.agent) ?? 0) + 1);
		}
		const labels = [...byAgent.entries()]
			.slice(0, 3)
			.map(([agent, n]) => (n > 1 ? `${n}×${agent}` : agent));
		const extraAgents = byAgent.size > 3 ? ` +${byAgent.size - 3} agents` : "";
		parts.push(`sub:${labels.join(",")}${extraAgents}`);
	}
	if (pending.length > 0) {
		parts.push(`pending:${pending.length}`);
	}
	return parts.join(" ");
}

/** Widget/status summaries — only show followable runs as individual lines. */
export function summarizeRunningForWidget(state: SubagentRosterState): {
	followable: SubagentRunEntry[];
	pendingCount: number;
} {
	reconcileRoster(state);
	return {
		followable: listFollowableRunning(state),
		pendingCount: listPendingRunning(state).length,
	};
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
