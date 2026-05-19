import { loadMergedPiSettings } from "./settings-loader.ts";

export interface AgentstormConfig {
	/** Default parallel agents when user says "agentstorm" without a number. */
	defaultCount: number;
	/** Default subagent name for `/pf-storm` and bare agentstorms. */
	defaultAgent: string;
	/** Hard cap (safety); user can request up to this many. */
	maxCount: number;
	/** pi-subagents parallel.concurrency baseline (setup merges into config.json). */
	defaultConcurrency: number;
}

const KNOWN_AGENTS = new Set([
	"scout",
	"researcher",
	"planner",
	"worker",
	"reviewer",
	"oracle",
	"delegate",
	"context-builder",
]);

export function getAgentstormConfig(settings = loadMergedPiSettings()): AgentstormConfig {
	const piFlow = settings.piFlow as Record<string, unknown> | undefined;
	const storm = piFlow?.agentstorm as Record<string, unknown> | undefined;

	const defaultCount =
		typeof storm?.defaultCount === "number" && storm.defaultCount >= 1
			? Math.floor(storm.defaultCount)
			: 20;
	const defaultConcurrency =
		typeof storm?.defaultConcurrency === "number" && storm.defaultConcurrency >= 1
			? Math.floor(storm.defaultConcurrency)
			: 4;
	const maxCount =
		typeof storm?.maxCount === "number" && storm.maxCount >= defaultCount
			? Math.floor(storm.maxCount)
			: Math.max(defaultCount, 128);
	const defaultAgent =
		typeof storm?.defaultAgent === "string" && storm.defaultAgent.trim()
			? storm.defaultAgent.trim()
			: "researcher";

	return { defaultCount, defaultAgent, maxCount, defaultConcurrency };
}

export interface ParsedAgentstormArgs {
	count: number;
	agent: string;
	task: string;
}

export function parseAgentstormArgs(
	raw: string,
	config: AgentstormConfig = getAgentstormConfig(),
): ParsedAgentstormArgs {
	const tokens = raw.trim().split(/\s+/).filter(Boolean);
	let count = config.defaultCount;
	let agent = config.defaultAgent;
	let start = 0;

	if (tokens[0] && /^\d+$/.test(tokens[0])) {
		count = Number.parseInt(tokens[0], 10);
		start = 1;
	}
	if (tokens[start] && KNOWN_AGENTS.has(tokens[start]!)) {
		agent = tokens[start]!;
		start += 1;
	}

	const task = tokens.slice(start).join(" ").trim();
	return {
		count: clampStormCount(count, config),
		agent,
		task,
	};
}

export function clampStormCount(count: number, config: AgentstormConfig): number {
	if (!Number.isFinite(count) || count < 1) return config.defaultCount;
	return Math.min(Math.floor(count), config.maxCount);
}

export interface AgentstormSubagentPayload {
	tasks: Array<{
		agent: string;
		count: number;
		task: string;
		progress: boolean;
	}>;
	concurrency: number;
}

/** Build a single-task `count` expansion for subagent({ tasks, concurrency }). */
export function buildAgentstormPayload(
	parsed: ParsedAgentstormArgs,
	config: AgentstormConfig = getAgentstormConfig(),
): AgentstormSubagentPayload {
	const { count, agent, task } = parsed;
	const concurrency = Math.min(count, config.defaultConcurrency);
	return {
		tasks: [
			{
				agent,
				count,
				task: task.trim()
					? `Agentstorm (${count}× ${agent}): ${task.trim()}`
					: `Agentstorm (${count}× ${agent}): divide the orchestrator brief across slots; each slot covers a distinct slice and returns concise findings.`,
				progress: true,
			},
		],
		concurrency,
	};
}

export function formatAgentstormSubagentCall(payload: AgentstormSubagentPayload): string {
	return `subagent(${JSON.stringify(payload, null, 2)})`;
}

export function agentstormBossInstruction(
	parsed: ParsedAgentstormArgs,
	payload: AgentstormSubagentPayload,
): string {
	const call = formatAgentstormSubagentCall(payload);
	const lines = [
		`[pi-flow agentstorm] Dispatch **${parsed.count}** \`${parsed.agent}\` subagents (concurrency **${payload.concurrency}** — queued slots, not all at once).`,
		`Invoke exactly one tool call (do not summarize instead):`,
		"```text",
		call,
		"```",
		`Then enable watch: \`/pf-watch\` and tell the user \`/pf-agents\` · \`/pf-follow ${parsed.agent}\`.`,
		`Keep \`count\`: ${parsed.count} and \`concurrency\`: ${payload.concurrency} as in the payload (do not raise concurrency above ${payload.concurrency}).`,
	];
	if (!parsed.task) {
		lines.splice(
			2,
			0,
			"The user did not provide a task string — infer a sensible split from the active goal / last user message.",
		);
	}
	return lines.join("\n");
}
