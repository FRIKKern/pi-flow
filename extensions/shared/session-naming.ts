/**
 * Session display names — auto-title from first user prompt (Claude Code /rename UX).
 */

import { readActiveGoalContext } from "./paperflow-client.ts";

export interface SessionNamingConfig {
	/** Set session title after the first user message (default true). */
	autoNameFromFirstPrompt: boolean;
	/** Prefix with active goal id when set (default true). */
	prefixGoal: boolean;
	maxTitleLength: number;
}

export const DEFAULT_SESSION_NAMING_CONFIG: SessionNamingConfig = {
	autoNameFromFirstPrompt: true,
	prefixGoal: true,
	maxTitleLength: 56,
};

export function loadSessionNamingConfig(settings?: Record<string, unknown>): SessionNamingConfig {
	const piFlow = settings?.piFlow as Record<string, unknown> | undefined;
	const raw = piFlow?.sessionNaming as Partial<SessionNamingConfig> | undefined;
	return { ...DEFAULT_SESSION_NAMING_CONFIG, ...raw };
}

/** Skip auto-naming for meta / command-only first lines. */
export function shouldSkipAutoName(firstUserText: string): boolean {
	const t = firstUserText.trim();
	if (!t) return true;
	if (/^\/(name|pf-rename)\b/i.test(t)) return true;
	if (/^\/pi-flow-handoff\b/i.test(t)) return true;
	return false;
}

/**
 * Build a short session title from the user's first prompt.
 * Not LLM — fast heuristic like Claude Code's auto-titles.
 */
export function deriveSessionNameFromPrompt(
	prompt: string,
	options: SessionNamingConfig & { goalId?: string },
): string {
	const maxLen = options.maxTitleLength;
	let text = prompt.trim();

	// Drop leading skill slash, keep the task text after it.
	text = text.replace(/^\/skill:\S+\s*/i, "");
	// Single-line command invocations — use remainder or next line
	if (/^\/\S+(\s|$)/.test(text) && !text.includes("\n")) {
		const after = text.replace(/^\/\S+\s*/, "").trim();
		if (!after) return fallbackTitle(options.goalId, maxLen);
		text = after;
	}

	text = text.replace(/\s+/g, " ").trim();

	if (!text) return fallbackTitle(options.goalId, maxLen);

	let title = text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;

	if (
		options.prefixGoal &&
		options.goalId &&
		!title.toLowerCase().includes(options.goalId.toLowerCase())
	) {
		const prefix = `${options.goalId} · `;
		const room = maxLen - prefix.length;
		if (room > 12) {
			const slice =
				text.length > room ? `${text.slice(0, room - 1)}…` : text.slice(0, room);
			title = `${prefix}${slice}`;
		} else {
			title = options.goalId.slice(0, maxLen);
		}
	}

	return title.trim() || fallbackTitle(options.goalId, maxLen);
}

function fallbackTitle(goalId: string | undefined, maxLen: number): string {
	if (goalId) return goalId.slice(0, maxLen);
	return "pi-flow";
}

export function extractFirstUserText(
	entries: Array<{ type?: string; role?: string; content?: unknown }>,
): string | undefined {
	for (const entry of entries) {
		if (entry.type !== "message" && entry.type !== "user") continue;
		if (entry.role && entry.role !== "user") continue;
		const text = contentToPlainText(entry.content);
		if (text.trim()) return text;
	}
	return undefined;
}

export function contentToPlainText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const block of content) {
		if (!block || typeof block !== "object") continue;
		const b = block as { type?: string; text?: string };
		if (b.type === "text" && b.text) parts.push(b.text);
	}
	return parts.join("\n");
}

export function readGoalId(cwd: string): string | undefined {
	const goal = readActiveGoalContext(cwd);
	if (!goal?.goalId) return undefined;
	return goal.goalId;
}
