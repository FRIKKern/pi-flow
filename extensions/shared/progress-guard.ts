import type {
	ExtensionContext,
	MessageUpdateEvent,
} from "@earendil-works/pi-coding-agent";
import {
	buildSessionContext,
	calculateContextTokens,
	estimateContextTokens,
	getLastAssistantUsage,
} from "@earendil-works/pi-coding-agent";

type StreamEvent = MessageUpdateEvent["assistantMessageEvent"];
type TurnUsage = { input: number; output: number; totalTokens: number };

export interface ProgressGuardConfig {
	/** No meaningful signal for this long → eligible for rescue. */
	stallAfterMs: number;
	checkIntervalMs: number;
	telemetryIntervalMs: number;
	/** Any signal inside this window = alive (even if phase looks idle). */
	aliveWindowMs: number;
	/** Extra time for first provider byte after HTTP response headers. */
	llmFirstByteMs: number;
	/** Max tool run without tool_update / end. */
	toolStallMs: number;
}

const DEFAULTS: ProgressGuardConfig = {
	stallAfterMs: 90_000,
	checkIntervalMs: 8_000,
	telemetryIntervalMs: 2_000,
	aliveWindowMs: 25_000,
	llmFirstByteMs: 120_000,
	toolStallMs: 180_000,
};

export function loadProgressGuardConfig(
	settings: Record<string, unknown>,
): ProgressGuardConfig {
	const piFlow = settings.piFlow as Record<string, unknown> | undefined;
	const raw = piFlow?.progress as Partial<ProgressGuardConfig> | undefined;
	return {
		stallAfterMs:
			typeof raw?.stallAfterMs === "number" && raw.stallAfterMs > 0
				? raw.stallAfterMs
				: DEFAULTS.stallAfterMs,
		checkIntervalMs:
			typeof raw?.checkIntervalMs === "number" && raw.checkIntervalMs > 0
				? raw.checkIntervalMs
				: DEFAULTS.checkIntervalMs,
		telemetryIntervalMs:
			typeof raw?.telemetryIntervalMs === "number" && raw.telemetryIntervalMs > 0
				? raw.telemetryIntervalMs
				: DEFAULTS.telemetryIntervalMs,
		aliveWindowMs:
			typeof raw?.aliveWindowMs === "number" && raw.aliveWindowMs > 0
				? raw.aliveWindowMs
				: DEFAULTS.aliveWindowMs,
		llmFirstByteMs:
			typeof raw?.llmFirstByteMs === "number" && raw.llmFirstByteMs > 0
				? raw.llmFirstByteMs
				: DEFAULTS.llmFirstByteMs,
		toolStallMs:
			typeof raw?.toolStallMs === "number" && raw.toolStallMs > 0
				? raw.toolStallMs
				: DEFAULTS.toolStallMs,
	};
}

export type ActivityPhase =
	| "thinking"
	| "llm_wait"
	| "streaming"
	| "thinking_stream"
	| "tool"
	| "turn"
	| "stalled";

export type LivenessVerdict = "alive" | "uncertain" | "dead";

export interface ActivitySnapshot {
	phase: ActivityPhase;
	label: string;
	/** Ms since last meaningful progress signal. */
	staleMs: number;
	/** Ms since any event (including noisy ones). */
	idleMs: number;
	liveness: LivenessVerdict;
	recentSignals: string[];
	contextTokens: number | null;
	contextWindow: number | null;
	contextPercent: number | null;
	turnInput: number | null;
	turnOutput: number | null;
	turnTotal: number | null;
	streamChars: number;
	thinkingChars: number;
	toolsThisTurn: number;
	lastHttpStatus: number | null;
	providerWaitMs: number | null;
}

interface SignalEntry {
	kind: string;
	at: number;
	detail?: string;
}

export interface ActivityTracker {
	readonly snapshot: ActivitySnapshot;
	recordContextPoll(tokens: number | null, turnOutput: number | null): void;
	touch(label: string, phase?: ActivityPhase): void;
	setPhase(phase: ActivityPhase, label?: string): void;
	onProviderRequest(): void;
	onProviderResponse(status: number): void;
	onStreamEvent(event: StreamEvent): void;
	onToolStart(name: string): void;
	onToolUpdate(name: string): void;
	onToolEnd(): void;
	onTurnStart(): void;
	reset(): void;
}

export function createActivityTracker(): ActivityTracker {
	const state = {
		phase: "thinking" as ActivityPhase,
		label: "thinking",
		lastEventAt: Date.now(),
		lastMeaningfulAt: Date.now(),
		providerRequestedAt: null as number | null,
		providerRespondedAt: null as number | null,
		toolStartedAt: null as number | null,
		lastHttpStatus: null as number | null,
		streamChars: 0,
		thinkingChars: 0,
		toolsThisTurn: 0,
		turnUsage: null as TurnUsage | null,
		signals: [] as SignalEntry[],
	};

	const MAX_SIGNALS = 40;

	function pushSignal(kind: string, detail?: string, meaningful = true): void {
		const at = Date.now();
		state.signals.push({ kind, at, detail });
		if (state.signals.length > MAX_SIGNALS) {
			state.signals.splice(0, state.signals.length - MAX_SIGNALS);
		}
		state.lastEventAt = at;
		if (meaningful) state.lastMeaningfulAt = at;
	}

	function recentSignalKinds(windowMs: number): string[] {
		const cutoff = Date.now() - windowMs;
		const kinds: string[] = [];
		for (let i = state.signals.length - 1; i >= 0; i--) {
			const s = state.signals[i]!;
			if (s.at < cutoff) break;
			const tag = s.detail ? `${s.kind}:${s.detail}` : s.kind;
			if (!kinds.includes(tag)) kinds.unshift(tag);
		}
		return kinds.slice(-6);
	}

	return {
		get snapshot() {
			const now = Date.now();
			const recent = recentSignalKinds(30_000);
			const staleMs = now - state.lastMeaningfulAt;
			const idleMs = now - state.lastEventAt;
			let liveness: LivenessVerdict = "uncertain";
			if (recent.length > 0 && staleMs < 30_000) liveness = "alive";
			if (staleMs > 120_000 && recent.length === 0) liveness = "dead";

			return {
				phase: state.phase,
				label: state.label,
				staleMs,
				idleMs,
				liveness,
				recentSignals: recent,
				contextTokens: null,
				contextWindow: null,
				contextPercent: null,
				turnInput: state.turnUsage?.input ?? null,
				turnOutput: state.turnUsage?.output ?? null,
				turnTotal: state.turnUsage?.totalTokens ?? null,
				streamChars: state.streamChars,
				thinkingChars: state.thinkingChars,
				toolsThisTurn: state.toolsThisTurn,
				lastHttpStatus: state.lastHttpStatus,
				providerWaitMs: state.providerRequestedAt
					? now - state.providerRequestedAt
					: null,
			};
		},
		recordContextPoll(tokens, turnOutput) {
			if (tokens != null) {
				let prevTok: number | null = null;
				for (let i = state.signals.length - 1; i >= 0; i--) {
					const s = state.signals[i]!;
					if (s.kind !== "ctx") continue;
					prevTok = s.detail != null ? Number.parseInt(s.detail, 10) : null;
					break;
				}
				if (prevTok == null || tokens > prevTok) {
					pushSignal("ctx", String(tokens), true);
				}
			}
			if (turnOutput != null) {
				const prev = state.turnUsage?.output ?? 0;
				if (turnOutput > prev) {
					pushSignal("tokens_out", String(turnOutput), true);
					if (!state.turnUsage) {
						state.turnUsage = { input: 0, output: turnOutput, totalTokens: turnOutput };
					} else {
						state.turnUsage = { ...state.turnUsage, output: turnOutput };
					}
				}
			}
		},
		touch(label, phase) {
			pushSignal("touch", label, false);
			state.label = label;
			if (phase) state.phase = phase;
		},
		setPhase(phase, label) {
			state.phase = phase;
			if (label) state.label = label;
			pushSignal("phase", `${phase}:${label ?? ""}`, false);
		},
		onProviderRequest() {
			state.providerRequestedAt = Date.now();
			state.providerRespondedAt = null;
			state.phase = "llm_wait";
			state.label = "llm";
			pushSignal("llm_req", undefined, false);
		},
		onProviderResponse(status) {
			state.lastHttpStatus = status;
			state.providerRespondedAt = Date.now();
			state.providerRequestedAt = null;
			pushSignal("http", String(status), true);
		},
		onStreamEvent(event) {
			switch (event.type) {
				case "start":
					state.phase = "streaming";
					state.label = "stream";
					pushSignal("stream_start", undefined, true);
					break;
				case "text_start":
					pushSignal("text_start", undefined, true);
					state.phase = "streaming";
					break;
				case "text_delta":
					state.streamChars += event.delta.length;
					state.phase = "streaming";
					state.label = "stream";
					pushSignal("text_delta", `${event.delta.length}c`, true);
					break;
				case "thinking_start":
					state.phase = "thinking_stream";
					pushSignal("think_start", undefined, true);
					break;
				case "thinking_delta":
					state.thinkingChars += event.delta.length;
					state.phase = "thinking_stream";
					state.label = "think";
					pushSignal("think_delta", `${event.delta.length}c`, true);
					break;
				case "toolcall_start":
					pushSignal("toolcall", undefined, true);
					state.label = "tools";
					break;
				case "done": {
					state.turnUsage = event.message.usage;
					const u = event.message.usage;
					pushSignal(
						"usage",
						`in${u.input}/out${u.output}`,
						true,
					);
					state.label = "done";
					break;
				}
				case "error":
					state.phase = "stalled";
					state.label = event.error.errorMessage?.slice(0, 40) || "error";
					pushSignal("error", state.label, true);
					break;
				default:
					break;
			}
		},
		onToolStart(name) {
			state.toolsThisTurn += 1;
			state.toolStartedAt = Date.now();
			state.phase = "tool";
			state.label = name;
			pushSignal("tool_start", name, true);
		},
		onToolUpdate(name) {
			state.phase = "tool";
			state.label = name;
			pushSignal("tool_update", name, true);
		},
		onToolEnd() {
			state.toolStartedAt = null;
			pushSignal("tool_end", state.label, true);
		},
		onTurnStart() {
			state.streamChars = 0;
			state.thinkingChars = 0;
			state.turnUsage = null;
			state.toolsThisTurn = 0;
			state.toolStartedAt = null;
			state.providerRequestedAt = null;
			state.providerRespondedAt = null;
			state.phase = "turn";
			state.label = "turn";
			pushSignal("turn_start", undefined, true);
		},
		reset() {
			state.phase = "thinking";
			state.label = "thinking";
			state.lastEventAt = Date.now();
			state.lastMeaningfulAt = Date.now();
			state.providerRequestedAt = null;
			state.providerRespondedAt = null;
			state.toolStartedAt = null;
			state.lastHttpStatus = null;
			state.streamChars = 0;
			state.thinkingChars = 0;
			state.toolsThisTurn = 0;
			state.turnUsage = null;
			state.signals = [];
		},
	};
}

export function enrichSnapshotFromContext(
	ctx: ExtensionContext,
	base: ActivitySnapshot,
	tracker?: ActivityTracker,
): ActivitySnapshot {
	let snap = { ...base };
	const usage = ctx.getContextUsage();
	if (usage) {
		snap = {
			...snap,
			contextTokens: usage.tokens,
			contextWindow: usage.contextWindow,
			contextPercent: usage.percent,
		};
	} else {
		try {
			const entries = ctx.sessionManager.getEntries();
			const messages = buildSessionContext(entries).messages;
			const estimate = estimateContextTokens(messages);
			const last = getLastAssistantUsage(entries);
			const window = ctx.model?.contextWindow ?? null;
			const tokens = estimate.tokens;
			const percent =
				window && tokens != null
					? Math.min(100, Math.round((tokens / window) * 100))
					: null;
			snap = {
				...snap,
				contextTokens: tokens,
				contextWindow: window,
				contextPercent: percent,
				turnInput: snap.turnInput ?? last?.input ?? null,
				turnOutput: snap.turnOutput ?? last?.output ?? null,
				turnTotal:
					snap.turnTotal ?? (last ? calculateContextTokens(last) : null),
			};
		} catch {
			// keep base
		}
	}

	tracker?.recordContextPoll(snap.contextTokens, snap.turnOutput);
	return snap;
}

function formatTokenCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1000) return `${Math.round(n / 1000)}k`;
	return String(n);
}

function formatIdle(idleMs: number): string {
	const sec = Math.round(idleMs / 1000);
	if (sec < 60) return `${sec}s`;
	return `${Math.floor(sec / 60)}m${sec % 60}s`;
}

export function formatActivityTelemetry(s: ActivitySnapshot): string {
	const parts: string[] = [];

	const liveTag =
		s.liveness === "alive"
			? "LIVE"
			: s.liveness === "dead"
				? "DEAD?"
				: "…";

	const phaseLabel =
		s.phase === "stalled"
			? "STUCK"
			: s.phase === "llm_wait"
				? "LLM"
				: s.phase === "thinking_stream"
					? "think"
					: s.phase === "streaming"
						? "out"
						: s.phase === "tool"
							? "tool"
							: s.phase;

	parts.push(`${liveTag} ${phaseLabel}:${s.label}`);

	if (s.recentSignals.length > 0) {
		parts.push(`sig ${s.recentSignals.join(",")}`);
	}

	if (s.contextTokens != null) {
		let ctx = formatTokenCount(s.contextTokens);
		if (s.contextWindow) {
			ctx += `/${formatTokenCount(s.contextWindow)}`;
			if (s.contextPercent != null) ctx += ` ${s.contextPercent}%`;
		}
		parts.push(`ctx ${ctx}`);
	}

	if (s.turnOutput != null && s.turnOutput > 0) {
		parts.push(`+${formatTokenCount(s.turnOutput)} out`);
	} else if (s.turnInput != null && s.turnInput > 0) {
		parts.push(`+${formatTokenCount(s.turnInput)} in`);
	}

	if (s.streamChars > 0) parts.push(`${formatTokenCount(s.streamChars)} ch`);
	if (s.thinkingChars > 0) parts.push(`think ${formatTokenCount(s.thinkingChars)} ch`);
	if (s.toolsThisTurn > 0) parts.push(`${s.toolsThisTurn} tools`);

	if (s.providerWaitMs != null && s.providerWaitMs > 500) {
		parts.push(`wait ${formatIdle(s.providerWaitMs)}`);
	}

	if (s.staleMs > 3000) {
		parts.push(`stale ${formatIdle(s.staleMs)}`);
	}

	return parts.join(" · ");
}

export function formatWorkingLabel(s: ActivitySnapshot): string {
	return `Working… ${formatActivityTelemetry(s)}`;
}

export function assistantMessagesHaveText(
	messages: Array<{ role?: string; content?: unknown }>,
): boolean {
	for (const message of messages) {
		if (message.role !== "assistant") continue;
		if (messageText(message).trim().length > 0) return true;
	}
	return false;
}

function messageText(message: { content?: unknown }): string {
	const { content } = message;
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) => {
			if (!part || typeof part !== "object") return "";
			const block = part as { type?: string; text?: string };
			if (block.type === "text" && typeof block.text === "string") return block.text;
			return "";
		})
		.join("");
}

/** True only when there is no sign of usage/progress — safe to auto-rescue. */
export function assessLiveness(
	s: ActivitySnapshot,
	config: ProgressGuardConfig,
): { dead: boolean; alive: boolean; reason: string } {
	const recent = s.recentSignals;
	const hasRecentMeaningful =
		s.staleMs < config.aliveWindowMs ||
		recent.some((sig) =>
			/^(text_delta|think_delta|usage|ctx|tokens_out|http|tool_update|tool_end|stream_start)/.test(
				sig,
			),
		);

	if (hasRecentMeaningful) {
		return {
			dead: false,
			alive: true,
			reason: `active (${recent.join(", ") || "progress"})`,
		};
	}

	// Still streaming counts if chars arrived recently
	if (
		(s.phase === "streaming" || s.phase === "thinking_stream") &&
		s.staleMs < config.stallAfterMs
	) {
		return {
			dead: false,
			alive: true,
			reason: `streaming (${s.streamChars + s.thinkingChars} ch)`,
		};
	}

	// LLM: requested but no bytes yet
	if (s.phase === "llm_wait" && s.providerWaitMs != null) {
		if (s.providerWaitMs < config.llmFirstByteMs) {
			return {
				dead: false,
				alive: false,
				reason: `waiting for model (${formatIdle(s.providerWaitMs)})`,
			};
		}
		return {
			dead: s.staleMs >= config.stallAfterMs,
			alive: false,
			reason: `no model bytes (${formatIdle(s.providerWaitMs)})`,
		};
	}

	// Tool without updates
	if (s.phase === "tool") {
		const toolStale = s.staleMs >= config.toolStallMs;
		if (!toolStale) {
			return {
				dead: false,
				alive: recent.some((x) => x.startsWith("tool_")),
				reason: `tool ${s.label} (${formatIdle(s.staleMs)})`,
			};
		}
		return {
			dead: true,
			alive: false,
			reason: `tool silent ${s.label} (${formatIdle(s.staleMs)})`,
		};
	}

	if (s.staleMs < config.stallAfterMs) {
		return {
			dead: false,
			alive: false,
			reason: `quiet (${formatIdle(s.staleMs)})`,
		};
	}

	return {
		dead: true,
		alive: false,
		reason: `no usage signals (${formatIdle(s.staleMs)})`,
	};
}

/** @deprecated use assessLiveness */
export function classifyStall(
	s: ActivitySnapshot,
	stallAfterMs: number,
): { stalled: boolean; reason: string } {
	const { dead, reason } = assessLiveness(s, {
		...DEFAULTS,
		stallAfterMs,
	});
	return { stalled: dead, reason };
}

export function rescueNudgeMessage(reason: string): string {
	return `Working… no usage yet · ${reason}`;
}
