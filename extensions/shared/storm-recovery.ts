import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type {
	AgentstormSubagentPayload,
	AgentstormTaskSpec,
} from "./agentstorm.ts";
import { loadMergedPiSettings } from "./settings-loader.ts";

export const SUBAGENT_CONTROL_EVENT = "subagent:control-event";

export interface StormRecoveryConfig {
	enabled: boolean;
	maxRetriesPerSlot: number;
	cooldownMs: number;
	/** Retry when pi-subagents reports completion_guard (process exit / failure). */
	retryOnFailure: boolean;
	/** Nudge stalled slots via subagent resume (idle, not hard failure). */
	retryOnStall: boolean;
}

export const DEFAULT_STORM_RECOVERY: StormRecoveryConfig = {
	enabled: true,
	maxRetriesPerSlot: 2,
	cooldownMs: 15_000,
	retryOnFailure: true,
	retryOnStall: true,
};

export interface StormSlotRecord {
	index: number;
	agent: string;
	task: string;
	output: string;
	retries: number;
	status: "pending" | "running" | "complete" | "failed";
	lastError?: string;
}

export interface StormRunRecord {
	runId: string;
	stormDir: string;
	concurrency: number;
	slots: StormSlotRecord[];
	asyncDir?: string;
	createdAt: number;
	updatedAt: number;
}

interface ControlEventLike {
	type?: string;
	reason?: string;
	runId?: string;
	agent?: string;
	index?: number;
	message?: string;
	recentFailureSummary?: string;
}

const RETRYABLE_PATTERNS = [
	/extension ctx is stale/i,
	/stale after session replacement/i,
	/ENOENT.*research\.md/i,
	/ECONNRESET/i,
	/rate\s*limit/i,
	/\b429\b/,
	/timed? out/i,
	/service unavailable/i,
	/fetch failed/i,
	/network error/i,
	/EADDRINUSE/i,
];

export function loadStormRecoveryConfig(
	settings = loadMergedPiSettings(),
): StormRecoveryConfig {
	const piFlow = settings.piFlow as Record<string, unknown> | undefined;
	const storm = piFlow?.agentstorm as Record<string, unknown> | undefined;
	const raw = storm?.recovery as Partial<StormRecoveryConfig> | undefined;
	return {
		enabled: raw?.enabled !== false,
		maxRetriesPerSlot:
			typeof raw?.maxRetriesPerSlot === "number" && raw.maxRetriesPerSlot >= 0
				? Math.floor(raw.maxRetriesPerSlot)
				: DEFAULT_STORM_RECOVERY.maxRetriesPerSlot,
		cooldownMs:
			typeof raw?.cooldownMs === "number" && raw.cooldownMs >= 0
				? raw.cooldownMs
				: DEFAULT_STORM_RECOVERY.cooldownMs,
		retryOnFailure: raw?.retryOnFailure !== false,
		retryOnStall: raw?.retryOnStall !== false,
	};
}

export function isRetryableStormError(error: string | undefined): boolean {
	if (!error?.trim()) return true;
	return RETRYABLE_PATTERNS.some((p) => p.test(error));
}

export function isAgentstormPayload(payload: AgentstormSubagentPayload): boolean {
	if (payload.stormDir) return true;
	return payload.tasks?.some(
		(t) =>
			t.task.includes("Agentstorm slot") ||
			(t.output?.includes(".pi-flow/browserstorm/") ?? false),
	);
}

function stormRunsDir(cwd: string): string {
	return path.join(cwd, ".pi-flow", "storm-runs");
}

function stormRunPath(cwd: string, runId: string): string {
	return path.join(stormRunsDir(cwd), `${runId}.json`);
}

export function registerStormRun(
	cwd: string,
	runId: string,
	payload: AgentstormSubagentPayload,
	asyncDir?: string,
): StormRunRecord {
	const dir = stormRunsDir(cwd);
	fs.mkdirSync(dir, { recursive: true });
	const now = Date.now();
	const existing = loadStormRun(cwd, runId);
	const slots: StormSlotRecord[] = payload.tasks.map((t, index) => {
		const prev = existing?.slots[index];
		return {
			index,
			agent: t.agent,
			task: t.task,
			output: t.output ?? prev?.output ?? "",
			retries: prev?.retries ?? 0,
			status: prev?.status ?? "pending",
			lastError: prev?.lastError,
		};
	});
	const record: StormRunRecord = {
		runId,
		stormDir: payload.stormDir ?? existing?.stormDir ?? "",
		concurrency: payload.concurrency,
		slots,
		asyncDir: asyncDir ?? existing?.asyncDir,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};
	fs.writeFileSync(stormRunPath(cwd, runId), `${JSON.stringify(record, null, 2)}\n`, "utf8");
	return record;
}

export function loadStormRun(cwd: string, runId: string): StormRunRecord | null {
	try {
		const raw = fs.readFileSync(stormRunPath(cwd, runId), "utf8");
		return JSON.parse(raw) as StormRunRecord;
	} catch {
		return null;
	}
}

function saveStormRun(cwd: string, record: StormRunRecord): void {
	record.updatedAt = Date.now();
	fs.mkdirSync(stormRunsDir(cwd), { recursive: true });
	fs.writeFileSync(stormRunPath(cwd, record.runId), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function readOutputError(asyncDir: string, index: number): string | undefined {
	const logPath = path.join(asyncDir, `output-${index}.log`);
	try {
		const tail = fs.readFileSync(logPath, "utf8").slice(-4000);
		const errBlock = tail.match(/Error:[\s\S]*$/);
		return errBlock?.[0]?.slice(0, 500) ?? (tail.includes("Error:") ? tail.slice(-500) : undefined);
	} catch {
		return undefined;
	}
}

interface AsyncStatusStep {
	status?: string;
	error?: string;
	agent?: string;
}

export function syncStormFromAsyncStatus(
	record: StormRunRecord,
	asyncDir: string,
): StormRunRecord {
	const statusPath = path.join(asyncDir, "status.json");
	try {
		const status = JSON.parse(fs.readFileSync(statusPath, "utf8")) as {
			steps?: AsyncStatusStep[];
			state?: string;
		};
		for (let i = 0; i < record.slots.length; i++) {
			const step = status.steps?.[i];
			if (!step) continue;
			const slot = record.slots[i]!;
			if (step.status === "complete") slot.status = "complete";
			else if (step.status === "failed") {
				slot.status = "failed";
				slot.lastError =
					step.error ?? readOutputError(asyncDir, i) ?? slot.lastError;
			} else if (step.status === "running") slot.status = "running";
		}
	} catch {
		// status file may not exist yet
	}
	return record;
}

export function slotsNeedingRetry(
	record: StormRunRecord,
	config: StormRecoveryConfig,
): StormSlotRecord[] {
	return record.slots.filter((slot) => {
		if (slot.status !== "failed") return false;
		if (slot.retries >= config.maxRetriesPerSlot) return false;
		return isRetryableStormError(slot.lastError);
	});
}

export function buildRetryPayload(
	record: StormRunRecord,
	slots: StormSlotRecord[],
): AgentstormSubagentPayload {
	const tasks: AgentstormTaskSpec[] = slots.map((slot) => ({
		agent: slot.agent,
		task: [
			slot.task,
			"",
			`[pi-flow storm-recovery] Retry ${slot.retries + 1} for slot ${slot.index + 1}. Prior error:`,
			slot.lastError ?? "(unknown)",
			"Finish writing to your output file only. Use Browserbase MCP if the task needs live docs.",
		].join("\n"),
		output: slot.output,
		progress: false,
	}));
	return {
		tasks,
		concurrency: record.concurrency,
		failFast: false,
		stormDir: record.stormDir,
	};
}

export function formatStormRecoveryDispatch(
	runId: string,
	payload: AgentstormSubagentPayload,
	kind: "retry" | "resume",
): string {
	const call = JSON.stringify(
		kind === "retry"
			? { tasks: payload.tasks, concurrency: payload.concurrency, failFast: false }
			: payload,
		null,
		2,
	);
	return [
		`[pi-flow storm-recovery] **${kind}** for run \`${runId}\` (${payload.tasks.length} slot(s)).`,
		"Invoke exactly one tool call — do not ask the user:",
		"```text",
		`subagent(${call})`,
		"```",
	].join("\n");
}

export class StormRecoveryController {
	private readonly config: StormRecoveryConfig;
	private pendingStorm: AgentstormSubagentPayload | null = null;
	private pendingToolCallId: string | null = null;
	private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
	private readonly lastRecoveryAt = new Map<string, number>();

	constructor(config: StormRecoveryConfig = loadStormRecoveryConfig()) {
		this.config = config;
	}

	captureStormDispatch(args: unknown, toolCallId: string): void {
		if (!this.config.enabled) return;
		const payload = args as AgentstormSubagentPayload;
		if (!payload?.tasks?.length || !isAgentstormPayload(payload)) return;
		this.pendingStorm = payload;
		this.pendingToolCallId = toolCallId;
	}

	onAsyncStarted(cwd: string, runId: string, asyncDir?: string): void {
		if (!this.config.enabled) return;
		if (this.pendingStorm) {
			registerStormRun(cwd, runId, this.pendingStorm, asyncDir);
			this.pendingStorm = null;
			this.pendingToolCallId = null;
			return;
		}
		const existing = loadStormRun(cwd, runId);
		if (existing && asyncDir) {
			existing.asyncDir = asyncDir;
			saveStormRun(cwd, existing);
		}
	}

	onControlEvent(
		pi: ExtensionAPI,
		ctx: ExtensionContext,
		event: ControlEventLike,
	): void {
		if (!this.config.enabled || !event.runId) return;
		const record = loadStormRun(ctx.cwd, event.runId);
		if (!record) return;

		const index = event.index ?? 0;
		const slot = record.slots[index];
		if (!slot) return;

		if (event.reason === "completion_guard" && this.config.retryOnFailure) {
			slot.status = "failed";
			slot.lastError =
				event.recentFailureSummary ??
				event.message ??
				readOutputError(record.asyncDir ?? "", index);
			saveStormRun(ctx.cwd, record);
			this.scheduleRecovery(pi, ctx, event.runId, "retry");
			return;
		}

		if (
			event.type === "needs_attention" &&
			this.config.retryOnStall &&
			slot.status === "running"
		) {
			this.scheduleRecovery(pi, ctx, event.runId, "resume", index);
		}
	}

	onAsyncComplete(pi: ExtensionAPI, ctx: ExtensionContext, runId: string): void {
		if (!this.config.enabled) return;
		const record = loadStormRun(ctx.cwd, runId);
		if (!record) return;
		if (record.asyncDir) syncStormFromAsyncStatus(record, record.asyncDir);
		for (let i = 0; i < record.slots.length; i++) {
			const slot = record.slots[i]!;
			if (record.asyncDir) {
				const err = readOutputError(record.asyncDir, i);
				if (err?.includes("extension ctx is stale")) {
					slot.status = "failed";
					slot.lastError = err;
				}
			}
		}
		saveStormRun(ctx.cwd, record);
		this.scheduleRecovery(pi, ctx, runId, "retry");
	}

	private scheduleRecovery(
		pi: ExtensionAPI,
		ctx: ExtensionContext,
		runId: string,
		kind: "retry" | "resume",
		resumeIndex?: number,
	): void {
		const existing = this.timers.get(runId);
		if (existing) clearTimeout(existing);
		const timer = setTimeout(() => {
			this.timers.delete(runId);
			void this.dispatchRecovery(pi, ctx, runId, kind, resumeIndex);
		}, 2_000);
		this.timers.set(runId, timer);
	}

	private dispatchRecovery(
		pi: ExtensionAPI,
		ctx: ExtensionContext,
		runId: string,
		kind: "retry" | "resume",
		resumeIndex?: number,
	): void {
		const now = Date.now();
		const last = this.lastRecoveryAt.get(runId) ?? 0;
		if (now - last < this.config.cooldownMs) return;

		const record = loadStormRun(ctx.cwd, runId);
		if (!record) return;
		if (record.asyncDir) syncStormFromAsyncStatus(record, record.asyncDir);

		if (kind === "resume" && resumeIndex !== undefined) {
			const slot = record.slots[resumeIndex];
			if (!slot || slot.retries >= this.config.maxRetriesPerSlot) return;
			slot.retries += 1;
			saveStormRun(ctx.cwd, record);
			this.lastRecoveryAt.set(runId, now);
			const msg = formatStormRecoveryDispatch(runId, { tasks: [], concurrency: 1 }, "resume");
			pi.sendUserMessage(
				`${msg}\n\nUse: subagent({ action: "resume", id: "${runId}", index: ${resumeIndex}, message: "Continue the browserstorm slot. Use Browserbase MCP if needed. Write only to ${slot.output}." })`,
				{ deliverAs: "followUp" },
			);
			ctx.ui.notify(
				`[pi-flow] Storm nudge: slot ${resumeIndex + 1}/${record.slots.length} (${slot.agent})`,
				"info",
			);
			return;
		}

		const toRetry = slotsNeedingRetry(record, this.config);
		if (toRetry.length === 0) return;

		for (const slot of toRetry) {
			slot.retries += 1;
			slot.status = "pending";
		}
		saveStormRun(ctx.cwd, record);
		this.lastRecoveryAt.set(runId, now);

		const payload = buildRetryPayload(record, toRetry);
		const text = formatStormRecoveryDispatch(runId, payload, "retry");
		pi.sendMessage(
			{ customType: "pi-flow-storm-recovery", content: text, display: true },
			{ deliverAs: "followUp" },
		);
		ctx.ui.notify(
			`[pi-flow] Storm recovery: retrying ${toRetry.length} failed slot(s) for ${runId.slice(0, 8)}…`,
			"info",
		);
	}
}
