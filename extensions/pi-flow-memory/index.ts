import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { loadPolicyConfig } from "../shared/policy.ts";
import { loadMergedPiSettings } from "../shared/settings-loader.ts";
import {
	appendAgentJournal,
	appendSessionJournal,
	buildChroniclerTask,
	buildRecallBlock,
	formatMemoryStatus,
	loadMemoryConfig,
	messageToSummary,
	registerNamedAgent,
	resolveAgentSlug,
	loadRegistry,
	toolArgsSummary,
	redactSummary,
} from "../shared/session-memory.ts";
import { loadRoster } from "../shared/subagent-roster.ts";

const STATUS_KEY = "pi-flow-mem";

export default function piFlowMemory(pi: ExtensionAPI): void {
	const settings = loadMergedPiSettings();
	const memConfig = loadMemoryConfig(settings);
	const policy = loadPolicyConfig(settings);

	let cwd = process.cwd();
	let lastRecallQuery: string | undefined;

	function enabled(ctx?: { cwd?: string }): boolean {
		if (ctx?.cwd) cwd = ctx.cwd;
		return memConfig.enabled;
	}

	function bindCwd(ctx: ExtensionCommandContext): void {
		cwd = ctx.cwd;
	}

	pi.on("session_start", (_event, ctx) => {
		cwd = ctx.cwd;
		if (!enabled()) return;
		appendSessionJournal(cwd, {
			kind: "session.start",
			summary: `Pi session started (boss: ${safeSessionFile(ctx)})`,
		});
		if (ctx.hasUI) {
			ctx.ui.setStatus(STATUS_KEY, "mem:on");
		}
	});

	pi.on("before_agent_start", async () => {
		if (!enabled() || !memConfig.recallOnStart) return;
		const block = buildRecallBlock(cwd, lastRecallQuery, memConfig.maxRecallChars);
		if (!block.includes("Recent session") && !block.includes("Session summary")) return;
		return {
			message: {
				customType: "pi-flow-memory-recall",
				content: block,
				display: false,
			},
		};
	});

	pi.on("turn_end", (event, ctx) => {
		if (!enabled(ctx)) return;
		const preview = memConfig.journalMaxPreview;
		const assistantText = messageToSummary(event.message, preview);
		const tools = event.toolResults
			.map((tr) => {
				const name = (tr as { toolName?: string }).toolName ?? "tool";
				return name;
			})
			.join(", ");

		const summary = redactSummary(
			`turn ${event.turnIndex}: ${assistantText}${tools ? ` · tools: ${tools}` : ""}`,
			policy,
		);
		appendSessionJournal(cwd, {
			kind: "turn",
			role: event.message.role,
			summary,
			meta: { turnIndex: event.turnIndex },
		});
	});

	pi.on("tool_execution_start", (event, ctx) => {
		if (!enabled(ctx)) return;
		const summary = redactSummary(
			toolArgsSummary(event.toolName, event.args, memConfig.journalMaxPreview),
			policy,
		);
		appendSessionJournal(cwd, {
			kind: "tool",
			tool: event.toolName,
			summary: `→ ${summary}`,
			meta: { toolCallId: event.toolCallId },
		});
	});

	pi.on("tool_execution_end", (event, ctx) => {
		if (!enabled(ctx)) return;
		if (event.toolName !== "subagent") return;
		const err = event.isError ? "failed" : "done";
		appendSessionJournal(cwd, {
			kind: "subagent",
			tool: "subagent",
			summary: `subagent ${err} (${event.toolCallId})`,
		});
	});

	pi.registerCommand("pf-memory", {
		description: "Session memory status (.pi-flow/memory)",
		handler: async (_args, ctx) => {
			bindCwd(ctx);
			if (!enabled()) {
				ctx.ui.notify("Memory disabled (piFlow.memory.enabled)", "warning");
				return;
			}
			ctx.ui.notify(formatMemoryStatus(cwd), "info");
		},
	});

	pi.registerCommand("pf-name", {
		description: "Name an agent — dedicated memory under .pi-flow/memory/agents/<slug>",
		handler: async (args, ctx) => {
			bindCwd(ctx);
			if (!enabled()) return;
			const parts = args.trim().split(/\s+/).filter(Boolean);
			if (parts.length === 0) {
				ctx.ui.notify(
					"Usage: /pf-name <slug> [builtin-agent] — binds latest subagent run",
					"warning",
				);
				return;
			}

			const slug = parts[0]!;
			const builtinAgent = parts[1];
			const roster = loadRoster(cwd, null);
			const byFollow =
				roster.followRunId && roster.runs.find((r) => r.id === roster.followRunId);
			const running = roster.runs.find((r) => r.status === "running");
			const target = byFollow ?? running ?? roster.runs[0];

			const entry = registerNamedAgent(cwd, {
				slug,
				displayName: slug,
				builtinAgent: builtinAgent ?? target?.agent,
				runId: target?.runId ?? target?.id,
				sessionFile: target?.sessionFile,
			});

			appendSessionJournal(cwd, {
				kind: "command",
				slug: entry.slug,
				summary: `/pf-name ${entry.slug}`,
			});

			ctx.ui.notify(
				`Named agent **${entry.displayName}** → .pi-flow/memory/agents/${entry.slug}/`,
				"info",
			);
		},
	});

	pi.registerCommand("pf-recall", {
		description: "Print memory recall block (also injected on boss turns when enabled)",
		handler: async (args, ctx) => {
			bindCwd(ctx);
			if (!enabled()) return;
			lastRecallQuery = args.trim() || undefined;
			const block = buildRecallBlock(cwd, lastRecallQuery, memConfig.maxRecallChars);
			ctx.ui.notify(block, "info");
		},
	});

	pi.registerCommand("pf-chronicler", {
		description: "Spawn chronicler subagent to compress journal → SUMMARY.md + agent MEMORY.md",
		handler: async (args, ctx) => {
			bindCwd(ctx);
			if (!enabled()) return;
			const task = buildChroniclerTask(cwd, args.trim() || undefined);
			pi.sendMessage(
				{
					customType: "pi-flow-chronicler",
					content: [
						"[pi-flow chronicler] Dispatch **pi-flow.chronicler** now to update durable memory.",
						"",
						"```text",
						`subagent({ agent: "pi-flow.chronicler", task: ${JSON.stringify(task)}, progress: true })`,
						"```",
					].join("\n"),
					display: true,
				},
				{ deliverAs: "followUp" },
			);
			ctx.ui.notify("Chronicler dispatch queued — runs in background", "info");
		},
	});

	pi.registerCommand("pf-note", {
		description: "Append a manual note to session + optional named agent memory",
		handler: async (args, ctx) => {
			bindCwd(ctx);
			if (!enabled()) return;
			const text = args.trim();
			if (!text) {
				ctx.ui.notify("Usage: /pf-note [agent-slug] <text>", "warning");
				return;
			}
			const tokens = text.split(/\s+/);
			const reg = loadRegistry(cwd);
			let slug: string | undefined;
			let body = text;
			if (tokens[0] && resolveAgentSlug(reg, tokens[0])) {
				slug = resolveAgentSlug(reg, tokens[0])!.slug;
				body = tokens.slice(1).join(" ");
			}
			appendSessionJournal(cwd, {
				kind: "note",
				slug,
				summary: body,
			});
			if (slug) {
				appendAgentJournal(cwd, slug, { kind: "note", summary: body });
			}
			ctx.ui.notify(slug ? `Note → session + ${slug}` : "Note → session journal", "info");
		},
	});
}

function safeSessionFile(ctx: {
	sessionManager: { getSessionFile?: () => string | null };
}): string {
	try {
		return ctx.sessionManager.getSessionFile?.() ?? "unknown";
	} catch {
		return "unknown";
	}
}

