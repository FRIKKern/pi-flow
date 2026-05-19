import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { isPiSubagentChildSession, safeExtensionUi } from "../shared/extension-context.ts";
import { loadMergedPiSettings } from "../shared/settings-loader.ts";
import {
	assistantMessagesHaveText,
	assessLiveness,
	createActivityTracker,
	enrichSnapshotFromContext,
	formatActivityTelemetry,
	formatWorkingLabel,
	loadProgressGuardConfig,
	rescueNudgeMessage,
} from "../shared/progress-guard.ts";
import {
	buildRescueUserMessage,
	canRescue,
	loadRescueConfig,
	shouldCompactBeforeRetry,
	type PendingRescue,
	type RescueBudget,
} from "../shared/progress-rescue.ts";

const STATUS_KEY = "pi-flow:activity";

export default function piFlowProgress(pi: ExtensionAPI): void {
	// Rescue + activity timers are boss-only; child sessions must not touch stale ctx.ui.
	if (isPiSubagentChildSession()) return;

	const settings = loadMergedPiSettings();
	const config = loadProgressGuardConfig(settings);
	const rescueConfig = loadRescueConfig(settings);
	const tracker = createActivityTracker();

	let stallTimer: ReturnType<typeof setInterval> | null = null;
	let telemetryTimer: ReturnType<typeof setInterval> | null = null;
	let agentActive = false;
	let nudgeShown = false;
	let rescueInFlight = false;
	let activeCtx: ExtensionContext | null = null;
	let pendingRescue: PendingRescue | null = null;
	let lastUserPrompt = "";
	const budget: RescueBudget = {
		turnAttempts: 0,
		sessionAttempts: 0,
		lastRescueAt: 0,
	};

	function liveSnapshot(ctx: ExtensionContext) {
		const base = tracker.snapshot;
		return enrichSnapshotFromContext(ctx, base, tracker);
	}

	function paint(ctx: ExtensionContext): void {
		const snap = liveSnapshot(ctx);
		const { alive } = assessLiveness(snap, config);
		const enriched = { ...snap, liveness: alive ? ("alive" as const) : snap.liveness };
		safeExtensionUi(ctx, (ui) => {
			ui.setWorkingMessage(formatWorkingLabel(enriched));
			ui.setStatus(STATUS_KEY, formatActivityTelemetry(enriched));
		});
	}

	function stopTimers(): void {
		if (stallTimer) clearInterval(stallTimer);
		if (telemetryTimer) clearInterval(telemetryTimer);
		stallTimer = null;
		telemetryTimer = null;
	}

	function scheduleRescue(
		ctx: ExtensionContext,
		trigger: PendingRescue["trigger"],
		reason: string,
	): boolean {
		if (!rescueConfig.enabled) return false;

		const gate = canRescue(budget, rescueConfig);
		if (!gate.ok) {
			ctx.ui.notify(
				`[pi-flow] Dead (${reason}) — auto-rescue off (${gate.why}). Esc to abort.`,
				"warning",
			);
			return false;
		}

		rescueInFlight = true;
		budget.turnAttempts += 1;
		budget.sessionAttempts += 1;
		budget.lastRescueAt = Date.now();

		const snap = liveSnapshot(ctx);
		pendingRescue = {
			trigger,
			reason,
			attempt: budget.turnAttempts,
			snapshot: snap,
			userPromptExcerpt: lastUserPrompt,
		};

		tracker.setPhase("stalled", "rescue");
		ctx.ui.notify(
			`[pi-flow] Auto-rescue ${budget.turnAttempts}/${rescueConfig.maxAttemptsPerTurn}: ${reason}`,
			"info",
		);
		paint(ctx);
		return true;
	}

	function beginRescue(
		ctx: ExtensionContext,
		trigger: PendingRescue["trigger"],
		reason: string,
	): void {
		if (!scheduleRescue(ctx, trigger, reason)) return;

		if (!ctx.isIdle()) {
			ctx.abort();
			return;
		}

		void finishRescue(ctx);
	}

	async function finishRescue(ctx: ExtensionContext): Promise<void> {
		const pending = pendingRescue;
		if (!pending) {
			rescueInFlight = false;
			return;
		}
		pendingRescue = null;

		const message = buildRescueUserMessage(pending);
		const compact = shouldCompactBeforeRetry(
			enrichSnapshotFromContext(ctx, pending.snapshot, tracker),
			rescueConfig,
		);

		const sendResume = () => {
			try {
				if (ctx.isIdle()) {
					pi.sendUserMessage(message);
				} else {
					pi.sendUserMessage(message, { deliverAs: "followUp" });
				}
				ctx.ui.notify("[pi-flow] Rescue: resuming automatically", "info");
			} catch (err) {
				ctx.ui.notify(
					`[pi-flow] Rescue failed: ${err instanceof Error ? err.message : String(err)}`,
					"error",
				);
			} finally {
				rescueInFlight = false;
			}
		};

		if (compact) {
			ctx.ui.notify("[pi-flow] Rescue: compacting (ctx full) then resume", "info");
			ctx.compact({
				customInstructions:
					"Preserve goal, decisions, file paths, and next steps for an in-progress task.",
				onComplete: sendResume,
				onError: sendResume,
			});
			return;
		}

		sendResume();
	}

	function evaluateAndRescue(ctx: ExtensionContext): void {
		const snap = liveSnapshot(ctx);
		const { dead, alive, reason } = assessLiveness(snap, config);

		if (alive || !dead) {
			nudgeShown = false;
			return;
		}

		const nudgeMs = Math.floor(config.stallAfterMs * rescueConfig.nudgeAtFraction);
		if (!nudgeShown && snap.staleMs >= nudgeMs && snap.staleMs < config.stallAfterMs) {
			nudgeShown = true;
			ctx.ui.setWorkingMessage(rescueNudgeMessage(reason));
			return;
		}

		if (snap.staleMs < config.stallAfterMs) return;

		beginRescue(ctx, "stall", reason);
	}

	function startTimers(ctx: ExtensionContext): void {
		stopTimers();
		activeCtx = ctx;

		telemetryTimer = setInterval(() => {
			if (!agentActive || !activeCtx) return;
			paint(activeCtx);
		}, config.telemetryIntervalMs);

		stallTimer = setInterval(() => {
			if (!agentActive || !activeCtx || rescueInFlight) return;
			evaluateAndRescue(activeCtx);
		}, config.checkIntervalMs);
	}

	pi.on("session_start", async () => {
		tracker.reset();
		budget.sessionAttempts = 0;
		budget.lastRescueAt = 0;
	});

	pi.on("before_agent_start", async (event) => {
		lastUserPrompt = event.prompt?.trim() ?? "";
	});

	pi.on("agent_start", async (_event, ctx) => {
		agentActive = true;
		nudgeShown = false;
		rescueInFlight = false;
		pendingRescue = null;
		budget.turnAttempts = 0;
		tracker.reset();
		paint(ctx);
		startTimers(ctx);
	});

	pi.on("agent_end", async (event, ctx) => {
		if (pendingRescue) {
			await finishRescue(ctx);
			return;
		}

		const hadText = assistantMessagesHaveText(event.messages);
		if (!hadText && agentActive && rescueConfig.enabled && !rescueInFlight) {
			const snap = liveSnapshot(ctx);
			const { dead, reason } = assessLiveness(snap, config);
			if (dead || snap.staleMs > 5000) {
				if (scheduleRescue(ctx, "empty_turn", reason || "no assistant output")) {
					await finishRescue(ctx);
				}
			}
			return;
		}

		agentActive = false;
		rescueInFlight = false;
		stopTimers();
		activeCtx = null;
		ctx.ui.setWorkingMessage();
		ctx.ui.setStatus(STATUS_KEY, undefined);
	});

	pi.on("turn_start", async (_event, ctx) => {
		if (!agentActive) return;
		tracker.onTurnStart();
		paint(ctx);
	});

	pi.on("before_provider_request", async (_event, ctx) => {
		if (!agentActive) return;
		tracker.onProviderRequest();
		paint(ctx);
	});

	pi.on("after_provider_response", async (event, ctx) => {
		if (!agentActive) return;
		tracker.onProviderResponse(event.status);
		paint(ctx);
	});

	pi.on("message_update", async (event, ctx) => {
		if (!agentActive) return;
		tracker.onStreamEvent(event.assistantMessageEvent);
		nudgeShown = false;
		paint(ctx);
	});

	pi.on("tool_execution_start", async (event, ctx) => {
		if (!agentActive) return;
		tracker.onToolStart(event.toolName || "tool");
		nudgeShown = false;
		paint(ctx);
	});

	pi.on("tool_execution_update", async (event, ctx) => {
		if (!agentActive) return;
		tracker.onToolUpdate(event.toolName || "tool");
		nudgeShown = false;
	});

	pi.on("tool_execution_end", async (_event, ctx) => {
		if (!agentActive) return;
		tracker.onToolEnd();
		paint(ctx);
	});

	pi.registerCommand("pf-activity", {
		description: "Liveness: signals, tokens, stall vs live",
		handler: async (_args, ctx) => {
			const snap = liveSnapshot(ctx);
			const { dead, alive, reason } = assessLiveness(snap, config);
			const gate = canRescue(budget, rescueConfig);
			ctx.ui.notify(
				[
					formatActivityTelemetry(snap),
					alive ? `ALIVE — ${reason}` : dead ? `DEAD — ${reason}` : `QUIET — ${reason}`,
					`Rescue: ${rescueConfig.enabled ? (gate.ok ? "armed" : gate.why) : "disabled"}`,
					ctx.isIdle() ? "idle" : "running",
				].join("\n"),
				dead ? "warning" : "info",
			);
		},
	});

	pi.registerCommand("pf-rescue", {
		description: "Force auto-rescue now",
		handler: async (_args, ctx) => {
			if (ctx.isIdle()) {
				ctx.ui.notify("Nothing running", "info");
				return;
			}
			beginRescue(ctx, "stall", "manual");
		},
	});
}
