import type { ActiveGoalContext } from "./paperflow-client.ts";

export function buildHandoffPrompt(options: {
	goal: ActiveGoalContext | null;
	readyStdout: string | null;
	focus?: string;
	cwd: string;
}): string {
	const lines = [
		"# pi-flow session handoff",
		"",
		`cwd: ${options.cwd}`,
		"",
	];

	if (options.goal) {
		lines.push(options.goal.summary, "");
	} else {
		lines.push("No active goal pointers (.paperflow/active-goal). Run /skill:goal or /skill:resume.", "");
	}

	if (options.readyStdout?.trim()) {
		lines.push("## bd ready", "", "```json", options.readyStdout.trim(), "```", "");
	}

	if (options.focus?.trim()) {
		lines.push("## Focus for this session", "", options.focus.trim(), "");
	}

	lines.push(
		"## Resume checklist",
		"",
		"1. `/pi-flow-doctor` if install or host is uncertain",
		"2. `paperflow_host` ensure",
		"3. Continue lifecycle: `/skill:plan` · `/skill:build` · `/skill:review` as appropriate",
		"4. Read `lib/orchestrator.md` before coordinating subagents",
		"",
	);

	return lines.join("\n");
}
