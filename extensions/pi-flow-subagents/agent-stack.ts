import type { SubagentRosterState, SubagentRunEntry } from "../shared/subagent-roster.ts";

export interface AgentStackItem {
	id: string;
	label: string;
	kind: "boss" | "subagent";
	sessionFile: string | null;
	run?: SubagentRunEntry;
	status?: string;
}

export function buildAgentStack(roster: SubagentRosterState): AgentStackItem[] {
	const stack: AgentStackItem[] = [];
	if (roster.bossSessionFile) {
		stack.push({
			id: "boss",
			label: "boss (orchestrator)",
			kind: "boss",
			sessionFile: roster.bossSessionFile,
		});
	}
	for (const run of roster.runs) {
		// Skip completed ghosts and placeholders with no session — they aren't followable.
		if (run.status !== "running" && run.status !== "detached") continue;
		if (!run.sessionFile) continue;
		stack.push({
			id: run.id,
			label: run.agent,
			kind: "subagent",
			sessionFile: run.sessionFile ?? null,
			run,
			status: run.status,
		});
	}
	return stack;
}

export function currentStackIndex(
	roster: SubagentRosterState,
	stack: AgentStackItem[],
): number {
	if (roster.viewing === "boss" || !roster.followRunId) {
		return 0;
	}
	const idx = stack.findIndex((s) => s.id === roster.followRunId);
	return idx >= 0 ? idx : 0;
}

export function nextStackIndex(
	roster: SubagentRosterState,
	stack: AgentStackItem[],
	delta: 1 | -1,
): number {
	if (stack.length === 0) return 0;
	const cur = currentStackIndex(roster, stack);
	let next = cur + delta;
	while (next < 0) next += stack.length;
	while (next >= stack.length) next -= stack.length;
	return next;
}

export function formatStackLabel(item: AgentStackItem, selected: boolean): string {
	const mark = selected ? "▸" : " ";
	const st =
		item.kind === "boss"
			? "★"
			: item.status === "running"
				? "●"
				: "○";
	const sess = item.sessionFile ? "" : " (no session yet)";
	return `${mark} ${st} ${item.label}${sess}`;
}
