import * as fs from "node:fs";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Key, matchesKey } from "@earendil-works/pi-tui";
import { mirrorSessionToCmuxWorker } from "../shared/cmux-worker-follow.ts";
import {
	bindSessionActions,
	hasSessionActions,
	switchToSessionFile,
} from "../shared/session-actions.ts";
import {
	createRosterState,
	finalizeToolCallRuns,
	formatRosterLine,
	ingestSubagentToolResult,
	loadRoster,
	pickFollowTarget,
	reconcileRoster,
	saveRoster,
	summarizeRunningForWidget,
	type SubagentRosterState,
	upsertRun,
} from "../shared/subagent-roster.ts";
import {
	AgentStackSelector,
	type AgentStackPick,
} from "./agent-stack-selector.ts";
import {
	buildAgentStack,
	nextStackIndex,
	type AgentStackItem,
} from "./agent-stack.ts";
import {
	agentstormBossInstruction,
	buildAgentstormPayload,
	getAgentstormConfig,
	parseAgentstormArgs,
} from "../shared/agentstorm.ts";
import {
	loadStormRecoveryConfig,
	StormRecoveryController,
	SUBAGENT_CONTROL_EVENT,
} from "../shared/storm-recovery.ts";

const STATUS_KEY = "pi-flow-sub";
const WIDGET_KEY = "pi-flow-subagents";
const SUBAGENT_ASYNC_STARTED = "subagent:async-started";
const SUBAGENT_ASYNC_COMPLETE = "subagent:async-complete";

type CommandCtx = ExtensionCommandContext;

interface AsyncStartedPayload {
	id?: string;
	agent?: string;
	agents?: string[];
	task?: string;
	asyncDir?: string;
}

interface AsyncCompletePayload {
	id?: string;
	agent?: string;
}

function editorIsEmpty(ctx: ExtensionContext): boolean {
	if (!ctx.hasUI) return false;
	try {
		return (ctx.ui.getEditorText?.() ?? "").trim().length === 0;
	} catch {
		return false;
	}
}

function fsExists(filePath: string): boolean {
	try {
		return fs.existsSync(filePath);
	} catch {
		return false;
	}
}

export default function piFlowSubagents(pi: ExtensionAPI): void {
	const stormRecovery = new StormRecoveryController(loadStormRecoveryConfig());
	let roster: SubagentRosterState = createRosterState(null);
	let bossCtx: ExtensionContext | null = null;
	let commandCtx: CommandCtx | null = null;
	let pendingAutoFollow: string | null = null;
	let workerSlot = 0;
	let terminalUnsub: (() => void) | null = null;
	let stackHintShown = false;

	function bossSessionFile(ctx: ExtensionContext): string | null {
		try {
			return ctx.sessionManager.getSessionFile() ?? null;
		} catch {
			return null;
		}
	}

	function bindCommand(ctx: ExtensionCommandContext): CommandCtx {
		bindSessionActions(ctx);
		commandCtx = ctx;
		bindBoss(ctx);
		return ctx;
	}

	function refreshStatus(ctx: ExtensionContext): void {
		ctx.ui.setStatus(STATUS_KEY, formatRosterLine(roster));
	}

	function refreshWidget(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;
		reconcileRoster(roster);
		const { followable, pendingCount } = summarizeRunningForWidget(roster);
		if (followable.length === 0 && pendingCount === 0 && !roster.autoFollow) {
			ctx.ui.setWidget(WIDGET_KEY, undefined);
			return;
		}
		const lines: string[] = [];
		const mode =
			roster.viewing === "follow"
				? `Following ${roster.runs.find((r) => r.id === roster.followRunId)?.agent ?? "?"}`
				: "Boss (orchestrator)";
		lines.push(`${mode} · ↓↑ stack · /pf-stack · /pf-boss`);
		if (roster.autoFollow) lines.push("watch ON");
		if (followable.length === 0 && pendingCount === 0) {
			lines.push("no active subagents");
		} else {
			for (const r of followable.slice(0, 4)) {
				lines.push(`▸ ${r.agent}${r.taskPreview ? ` — ${r.taskPreview.slice(0, 40)}` : ""}`);
			}
			if (pendingCount > 0) {
				lines.push(`⏳ ${pendingCount} starting (no session yet — not in stack)`);
			}
			const extra = followable.length > 4 ? followable.length - 4 : 0;
			if (extra > 0) lines.push(`… +${extra} more with sessions`);
		}
		ctx.ui.setWidget(WIDGET_KEY, lines);
	}

	function bindBoss(ctx: ExtensionContext): void {
		bossCtx = ctx;
		const boss = bossSessionFile(ctx);
		if (boss && roster.bossSessionFile !== boss) {
			roster.bossSessionFile = boss;
		}
		refreshStatus(ctx);
		refreshWidget(ctx);
	}

	async function activateStackItem(ctx: CommandCtx, item: AgentStackItem): Promise<void> {
		if (item.kind === "boss") {
			await returnToBoss(ctx);
			return;
		}
		if (!item.sessionFile) {
			ctx.ui.notify(
				`${item.label} has no session file yet — wait for the subagent run to persist a session.`,
				"warning",
			);
			return;
		}
		const run = item.run ?? pickFollowTarget(roster, item.label);
		if (!run) {
			ctx.ui.notify(`Unknown agent: ${item.label}`, "warning");
			return;
		}
		await followRun(ctx, { ...run, sessionFile: item.sessionFile });
	}

	async function followRun(
		ctx: CommandCtx,
		target: ReturnType<typeof pickFollowTarget>,
		opts?: { mirror?: boolean },
	): Promise<void> {
		if (!target?.sessionFile) {
			ctx.ui.notify(
				`No session file yet for ${target?.agent ?? "subagent"} — wait for the run to persist (Ctrl+O on subagent tool).`,
				"warning",
			);
			return;
		}
		if (!fsExists(target.sessionFile)) {
			ctx.ui.notify(`Session not found: ${target.sessionFile}`, "error");
			return;
		}

		roster.viewing = "follow";
		roster.followRunId = target.id;
		saveRoster(ctx.cwd, roster);

		const result = await switchToSessionFile(target.sessionFile);
		if (result.cancelled) {
			roster.viewing = "boss";
			roster.followRunId = null;
			ctx.ui.notify("Follow cancelled", "warning");
			return;
		}

		ctx.ui.notify(`Following ${target.agent} — ↓↑ stack · /pf-boss`, "info");
		refreshStatus(ctx);
		refreshWidget(ctx);

		if (opts?.mirror ?? false) {
			const slot = target.workerSlot ?? workerSlot++ % 4;
			target.workerSlot = slot;
			const mirror = await mirrorSessionToCmuxWorker(target.sessionFile, slot);
			if (mirror.ok) ctx.ui.notify(`cmux worker ${slot + 1}: ${mirror.detail}`, "info");
		}
	}

	async function returnToBoss(ctx: CommandCtx): Promise<void> {
		if (!roster.bossSessionFile) {
			ctx.ui.notify("Boss session unknown", "warning");
			roster.viewing = "boss";
			roster.followRunId = null;
			return;
		}
		roster.viewing = "boss";
		roster.followRunId = null;
		saveRoster(ctx.cwd, roster);
		const result = await switchToSessionFile(roster.bossSessionFile);
		if (!result.cancelled) {
			ctx.ui.notify("Boss (orchestrator)", "info");
		}
		refreshStatus(ctx);
		refreshWidget(ctx);
	}

	async function cycleStack(ctx: CommandCtx, delta: 1 | -1): Promise<void> {
		const stack = buildAgentStack(roster);
		if (stack.length === 0) {
			ctx.ui.notify("No agents in stack — dispatch a subagent first", "warning");
			return;
		}
		const idx = nextStackIndex(roster, stack, delta);
		const item = stack[idx];
		if (!item) return;
		await activateStackItem(ctx, item);
	}

	async function showStackPicker(ctx: CommandCtx): Promise<void> {
		if (!ctx.hasUI) {
			ctx.ui.notify("Stack picker requires interactive UI", "warning");
			return;
		}
		const stack = buildAgentStack(roster);
		if (stack.length === 0) {
			ctx.ui.notify("No agents in stack", "warning");
			return;
		}

		const pick = await ctx.ui.custom<AgentStackPick | null>(
			(_tui, theme, _kb, done) =>
				new AgentStackSelector(
					theme,
					stack,
					(p) => done(p),
					() => done(null),
				),
			{ overlay: true },
		);

		if (!pick?.item) return;
		await activateStackItem(ctx, pick.item);
	}

	function handleTerminalInput(ctx: ExtensionContext, data: string): { consume?: boolean } | undefined {
		if (!editorIsEmpty(ctx)) return undefined;

		const isDown = matchesKey(data, Key.down) || matchesKey(data, "down");
		const isUp = matchesKey(data, Key.up) || matchesKey(data, "up");
		if (!isDown && !isUp) return undefined;

		if (!hasSessionActions()) {
			if (!stackHintShown) {
				stackHintShown = true;
				ctx.ui.notify(
					"Agent stack: run /pf-stack once, then ↓↑ at empty prompt cycles views",
					"info",
				);
			}
			return { consume: true };
		}

		const cmd = commandCtx;
		if (!cmd) {
			ctx.ui.notify("Run /pf-stack once to enable ↓↑ navigation", "warning");
			return { consume: true };
		}

		void cycleStack(cmd, isDown ? 1 : -1);
		return { consume: true };
	}

	function attachTerminalInput(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;
		terminalUnsub?.();
		terminalUnsub = ctx.ui.onTerminalInput((data) => handleTerminalInput(ctx, data));
	}

	pi.on("session_start", (_event, ctx) => {
		const boss = bossSessionFile(ctx);
		roster = loadRoster(ctx.cwd, boss);
		if (boss) roster.bossSessionFile = boss;
		reconcileRoster(roster);
		stackHintShown = false;
		bindBoss(ctx);
		attachTerminalInput(ctx);
	});

	pi.on("session_shutdown", () => {
		terminalUnsub?.();
		terminalUnsub = null;
	});

	pi.on("tool_execution_start", (event, ctx) => {
		if (event.toolName !== "subagent") return;
		stormRecovery.captureStormDispatch(event.args, event.toolCallId);
		const args = event.args as {
			agent?: string;
			tasks?: Array<{ agent?: string; task?: string }>;
			chain?: Array<{ agent?: string; task?: string }>;
		};
		const agents: Array<{ agent: string; task?: string }> = [];
		if (args.agent) agents.push({ agent: args.agent });
		if (args.tasks) {
			for (const t of args.tasks) {
				if (t.agent) agents.push({ agent: t.agent, task: t.task });
			}
		}
		if (args.chain) {
			for (const step of args.chain) {
				if (step.agent) agents.push({ agent: step.agent, task: step.task });
			}
		}
		const now = Date.now();
		for (const a of agents) {
			upsertRun(roster, {
				id: `${event.toolCallId}:${a.agent}`,
				toolCallId: event.toolCallId,
				agent: a.agent,
				status: "running",
				taskPreview: a.task?.slice(0, 80),
				startedAt: now,
			});
		}
		saveRoster(ctx.cwd, roster);
		refreshStatus(ctx);
		refreshWidget(ctx);
		if (roster.autoFollow && agents.length > 0) {
			ctx.ui.notify(
				`▸ ${agents.map((a) => a.agent).join(", ")} — ↓ to cycle · /pf-follow`,
				"info",
			);
		}
	});

	pi.on("tool_execution_end", (event, ctx) => {
		if (event.toolName !== "subagent") return;
		const entries = ingestSubagentToolResult(roster, event.toolCallId, event.result);
		if (entries.length === 0) {
			const failed = (event.result as { isError?: boolean })?.isError === true;
			finalizeToolCallRuns(roster, event.toolCallId, failed ? "failed" : "completed");
		}
		reconcileRoster(roster);
		saveRoster(ctx.cwd, roster);
		refreshStatus(ctx);
		refreshWidget(ctx);
		if (roster.autoFollow) {
			const withSession = entries.find((e) => e.sessionFile && e.status === "running");
			if (withSession) {
				pendingAutoFollow = withSession.id;
				ctx.ui.notify(`▸ ${withSession.agent} — ↓ or /pf-follow ${withSession.agent}`, "info");
			}
		}
	});

	pi.events.on(SUBAGENT_ASYNC_STARTED, (payload: AsyncStartedPayload) => {
		const ctx = bossCtx;
		if (!ctx) return;
		const id = payload.id ?? `async-${Date.now()}`;
		if (payload.id) stormRecovery.onAsyncStarted(ctx.cwd, payload.id, payload.asyncDir);
		const agents = payload.agents?.length
			? payload.agents
			: payload.agent
				? [payload.agent]
				: ["subagent"];
		const now = Date.now();
		for (const agent of agents) {
			upsertRun(roster, {
				id: `${id}:${agent}`,
				runId: id,
				agent,
				status: "running",
				taskPreview: payload.task,
				startedAt: now,
			});
		}
		saveRoster(ctx.cwd, roster);
		refreshStatus(ctx);
		refreshWidget(ctx);
	});

	pi.events.on(SUBAGENT_ASYNC_COMPLETE, (payload: AsyncCompletePayload) => {
		const ctx = bossCtx;
		if (!ctx) return;
		const id = payload.id;
		if (!id) return;
		stormRecovery.onAsyncComplete(pi, ctx, id);
		for (const run of roster.runs) {
			if (run.runId === id || run.id.startsWith(`${id}:`)) {
				if (run.status === "running") run.status = "completed";
				run.updatedAt = Date.now();
			}
		}
		saveRoster(ctx.cwd, roster);
		refreshStatus(ctx);
		refreshWidget(ctx);
		if (roster.viewing === "follow" && roster.followRunId?.startsWith(`${id}:`) && commandCtx) {
			void returnToBoss(commandCtx);
		}
	});

	pi.events.on(SUBAGENT_CONTROL_EVENT, (event: unknown) => {
		const ctx = bossCtx;
		if (!ctx) return;
		stormRecovery.onControlEvent(
			pi,
			ctx,
			event as {
				type?: string;
				reason?: string;
				runId?: string;
				agent?: string;
				index?: number;
				message?: string;
				recentFailureSummary?: string;
			},
		);
	});

	pi.registerCommand("pf-stack", {
		description: "Interactive agent stack picker (↑↓ Enter)",
		handler: async (_args, ctx) => {
			const cmd = bindCommand(ctx);
			await showStackPicker(cmd);
		},
	});

	pi.registerCommand("pf-agents", {
		description: "Pick a subagent run to follow (view its chat)",
		handler: async (_args, ctx) => {
			const cmd = bindCommand(ctx);
			if (roster.runs.length === 0) {
				ctx.ui.notify("No subagent runs yet", "warning");
				return;
			}
			const labels = roster.runs.map((r, i) => {
				const st = r.status === "running" ? "●" : "○";
				const sess = r.sessionFile ? " · session" : "";
				return `${i + 1}. ${st} ${r.agent}${sess}${r.taskPreview ? ` — ${r.taskPreview.slice(0, 36)}` : ""}`;
			});
			const pick = await ctx.ui.select("Follow subagent", labels, {
				placeholder: "↑↓ · Enter · Esc",
			});
			if (!pick) return;
			const idx = labels.indexOf(pick);
			const run = roster.runs[idx];
			if (!run) return;
			await followRun(cmd, run);
		},
	});

	pi.registerCommand("pf-follow", {
		description: "Follow a subagent chat (agent name, index, or latest running)",
		handler: async (args, ctx) => {
			const cmd = bindCommand(ctx);
			let query = args.trim();
			if (!query && pendingAutoFollow) {
				query = roster.runs.find((r) => r.id === pendingAutoFollow)?.agent ?? "";
				pendingAutoFollow = null;
			}
			const target = pickFollowTarget(roster, query || undefined);
			if (!target) {
				ctx.ui.notify("Usage: /pf-follow [agent] — or /pf-stack", "warning");
				return;
			}
			await followRun(cmd, target);
		},
	});

	pi.registerCommand("pf-boss", {
		description: "Return to the boss orchestrator session",
		handler: async (_args, ctx) => {
			const cmd = bindCommand(ctx);
			await returnToBoss(cmd);
		},
	});

	pi.registerCommand("pf-watch", {
		description: "Toggle nudges when subagents start",
		handler: async (_args, ctx) => {
			bindCommand(ctx);
			roster.autoFollow = !roster.autoFollow;
			saveRoster(ctx.cwd, roster);
			ctx.ui.notify(`watch: ${roster.autoFollow ? "ON" : "OFF"}`, "info");
			refreshWidget(ctx);
		},
	});

	pi.registerCommand("pf-storm", {
		description: "Agentstorm — parallel subagents (default 20; pass count to override)",
		handler: async (args, ctx) => {
			bindCommand(ctx);
			const config = getAgentstormConfig();
			const parsed = parseAgentstormArgs(args, config);
			if (!parsed.task) {
				ctx.ui.notify(
					`Usage: /pf-storm [count] [agent] <task> — default ${config.defaultCount}× ${config.defaultAgent}`,
					"warning",
				);
				return;
			}
			const payload = buildAgentstormPayload(parsed, config, { cwd: ctx.cwd });
			roster.autoFollow = true;
			saveRoster(ctx.cwd, roster);
			refreshWidget(ctx);
			pi.sendMessage(
				{
					customType: "pi-flow-agentstorm",
					content: agentstormBossInstruction(parsed, payload),
					display: true,
				},
				{ deliverAs: "followUp" },
			);
			ctx.ui.notify(
				`Agentstorm: ${parsed.count}× ${parsed.agent} — dispatching via subagent()`,
				"info",
			);
		},
	});

	pi.registerCommand("pf-mirror", {
		description: "Mirror subagent session to cmux worker pane (pif layout)",
		handler: async (args, ctx) => {
			bindCommand(ctx);
			const parts = args.trim().split(/\s+/);
			const slotRaw = parts.find((p) => /^\d+$/.test(p));
			const slot = slotRaw ? Number.parseInt(slotRaw, 10) : 0;
			const query = parts.filter((p) => p !== slotRaw).join(" ");
			const target = pickFollowTarget(roster, query || undefined);
			if (!target?.sessionFile) {
				ctx.ui.notify("No session to mirror", "warning");
				return;
			}
			const mirror = await mirrorSessionToCmuxWorker(target.sessionFile, slot);
			ctx.ui.notify(mirror.detail, mirror.ok ? "info" : "warning");
		},
	});

	pi.registerShortcut(Key.ctrlShift("]"), {
		description: "Next agent in stack",
		handler: async (ctx) => {
			if (!commandCtx) {
				ctx.ui.notify("Run /pf-stack first", "warning");
				return;
			}
			await cycleStack(commandCtx, 1);
		},
	});

	pi.registerShortcut(Key.ctrlShift("["), {
		description: "Previous agent in stack",
		handler: async (ctx) => {
			if (!commandCtx) {
				ctx.ui.notify("Run /pf-stack first", "warning");
				return;
			}
			await cycleStack(commandCtx, -1);
		},
	});
}
