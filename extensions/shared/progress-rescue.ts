import type { ActivitySnapshot } from "./progress-guard.ts";
import { formatActivityTelemetry } from "./progress-guard.ts";

export interface RescueConfig {
	enabled: boolean;
	/** First rescue step after stallAfterMs * nudgeAtFraction (working-line hint only). */
	nudgeAtFraction: number;
	maxAttemptsPerTurn: number;
	maxAttemptsPerSession: number;
	/** Min time between auto-rescues. */
	cooldownMs: number;
	/** Auto-compact before retry when context at or above this percent. */
	compactAbovePercent: number;
}

export const DEFAULT_RESCUE: RescueConfig = {
	enabled: true,
	nudgeAtFraction: 0.7,
	maxAttemptsPerTurn: 2,
	maxAttemptsPerSession: 8,
	cooldownMs: 120_000,
	compactAbovePercent: 85,
};

export function loadRescueConfig(
	settings: Record<string, unknown>,
): RescueConfig {
	const piFlow = settings.piFlow as Record<string, unknown> | undefined;
	const progress = piFlow?.progress as Record<string, unknown> | undefined;
	const raw = progress?.rescue as Partial<RescueConfig> | undefined;
	return {
		enabled: raw?.enabled !== false,
		nudgeAtFraction:
			typeof raw?.nudgeAtFraction === "number" &&
			raw.nudgeAtFraction > 0 &&
			raw.nudgeAtFraction < 1
				? raw.nudgeAtFraction
				: DEFAULT_RESCUE.nudgeAtFraction,
		maxAttemptsPerTurn:
			typeof raw?.maxAttemptsPerTurn === "number" && raw.maxAttemptsPerTurn > 0
				? raw.maxAttemptsPerTurn
				: DEFAULT_RESCUE.maxAttemptsPerTurn,
		maxAttemptsPerSession:
			typeof raw?.maxAttemptsPerSession === "number" && raw.maxAttemptsPerSession > 0
				? raw.maxAttemptsPerSession
				: DEFAULT_RESCUE.maxAttemptsPerSession,
		cooldownMs:
			typeof raw?.cooldownMs === "number" && raw.cooldownMs >= 0
				? raw.cooldownMs
				: DEFAULT_RESCUE.cooldownMs,
		compactAbovePercent:
			typeof raw?.compactAbovePercent === "number" && raw.compactAbovePercent > 0
				? raw.compactAbovePercent
				: DEFAULT_RESCUE.compactAbovePercent,
	};
}

export type RescueTrigger = "stall" | "empty_turn";

export interface PendingRescue {
	trigger: RescueTrigger;
	reason: string;
	attempt: number;
	snapshot: ActivitySnapshot;
	userPromptExcerpt: string;
}

export interface RescueBudget {
	turnAttempts: number;
	sessionAttempts: number;
	lastRescueAt: number;
}

export function canRescue(
	budget: RescueBudget,
	rescue: RescueConfig,
): { ok: boolean; why?: string } {
	if (!rescue.enabled) return { ok: false, why: "disabled" };
	if (budget.turnAttempts >= rescue.maxAttemptsPerTurn) {
		return { ok: false, why: "turn limit" };
	}
	if (budget.sessionAttempts >= rescue.maxAttemptsPerSession) {
		return { ok: false, why: "session limit" };
	}
	const since = Date.now() - budget.lastRescueAt;
	if (budget.lastRescueAt > 0 && since < rescue.cooldownMs) {
		return { ok: false, why: "cooldown" };
	}
	return { ok: true };
}

export function shouldCompactBeforeRetry(
	snap: ActivitySnapshot,
	rescue: RescueConfig,
): boolean {
	return (
		snap.contextPercent != null &&
		snap.contextPercent >= rescue.compactAbovePercent
	);
}

export function buildRescueUserMessage(
	pending: PendingRescue,
): string {
	const excerpt = pending.userPromptExcerpt.trim();
	const taskLine = excerpt
		? `Original request (excerpt): ${excerpt.slice(0, 400)}`
		: "Continue the user's last request.";

	return [
		"[pi-flow auto-rescue]",
		`The previous turn stopped without finishing (${pending.reason}).`,
		taskLine,
		"Resume from current repo state. Do not re-run tools that already succeeded.",
		"Give a short status line, then continue with the smallest next step.",
		`Telemetry: ${formatActivityTelemetry(pending.snapshot)}`,
	].join("\n");
}

