import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { bdEnsureRepo, bdReady, bdShow } from "../shared/beads-client.ts";
import { PI_FLOW_STATE_TYPE } from "../shared/constants.ts";
import { checkPaperflowHost, ensurePaperflowHost } from "../shared/host-manager.ts";
import {
	ensureOpenCodeIntegration,
	shouldAutoEnsureOpenCodeServe,
	type OpenCodeIntegrationStatus,
} from "../shared/opencode-integration.ts";
import {
	evaluateToolCall,
	loadPolicyConfig,
	redactToolResultContent,
} from "../shared/policy.ts";
import {
	readActiveGoalContext,
	registerPiFlowSession,
	verifyPaperflowDoc,
	writeActiveGoalPointers,
	cmuxBrowserOpen,
	cmuxDetectJson,
	isInCmux,
} from "../shared/paperflow-client.ts";
import { dispatchToBossSession } from "../shared/paperflow-dispatch.ts";
import {
	ensureBrowseCli,
	loadBrowserbaseEnvFile,
	runBrowseCli,
} from "../shared/browserbase.ts";
import { resolvePackageRoot } from "../shared/package-root.ts";
import { loadMergedPiSettings } from "../shared/settings-loader.ts";
import {
	extractLastAssistantText,
	loadStreamedRules,
	StreamedRuleSession,
} from "../shared/streamed-rules.ts";

const packageRoot = resolvePackageRoot(import.meta.url);
const cmuxSkillsDir = path.join(packageRoot, "skills-cmux");
const lifecycleSkillsDir = path.join(packageRoot, "skills");

function restoreWorkflowState(
	pi: ExtensionAPI,
	sessionManager: { getEntries: () => Array<{ type: string; customType?: string; data?: unknown }> },
): void {
	for (const entry of sessionManager.getEntries()) {
		if (entry.type !== "custom" || entry.customType !== PI_FLOW_STATE_TYPE) continue;
		const data = entry.data as { goalId?: string; phaseId?: string } | undefined;
		if (data?.goalId) {
			writeActiveGoalPointers(process.cwd(), data.goalId, data.phaseId);
		}
		break;
	}
}

function countSkillDirs(dir: string): number {
	try {
		return fs
			.readdirSync(dir, { withFileTypes: true })
			.filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, "SKILL.md"))).length;
	} catch {
		return 0;
	}
}

export default function piFlowHost(pi: ExtensionAPI): void {
	const settings = loadMergedPiSettings();
	const policyConfig = loadPolicyConfig(settings);
	const streamedRules = new StreamedRuleSession(loadStreamedRules(process.cwd()));

	pi.on("session_start", async (_event, ctx) => {
		try {
			restoreWorkflowState(pi, ctx.sessionManager);
			await Promise.all([
				ensurePaperflowHost(),
				registerPiFlowSession(),
				ensureOpenCodeIntegration({
					packageRoot,
					ensureServe: shouldAutoEnsureOpenCodeServe(),
				}),
			]);
			const host = await checkPaperflowHost();
			const cmux = await cmuxDetectJson();

			if (isInCmux(cmux)) {
				ctx.ui.notify(
					`pi-flow: cmux ready · host ${host.running ? "up" : "down"} — ${host.running ? "grill bridge active" : "run paperflow_host ensure"}`,
					host.running ? "info" : "warning",
				);
			} else if (!process.env.CMUX_WORKSPACE_ID) {
				ctx.ui.notify(
					`pi-flow: ${host.running ? "host up, no cmux" : "degraded mode"} — see docs/HOST.md`,
					host.running ? "info" : "warning",
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`pi-flow host: ${message}`, "error");
		}
	});

	pi.on("resources_discover", async () => {
		const cmux = await cmuxDetectJson();
		if (!isInCmux(cmux)) return {};
		return { skillPaths: [cmuxSkillsDir] };
	});

	pi.on("before_agent_start", async (_event, _ctx) => {
		const goal = readActiveGoalContext(process.cwd());
		if (!goal) return;
		return {
			message: {
				customType: "pi-flow-active-goal",
				content: `[pi-flow]\n${goal.summary}\n[/pi-flow]`,
				display: false,
			},
		};
	});

	// Policy layer (oh-my-pi tool_call / tool_result pattern)
	pi.on("tool_call", async (event) => {
		if (process.env.PI_FLOW_ALLOW_DESTRUCTIVE === "1") return;
		const block = evaluateToolCall(
			{ toolName: event.toolName, input: event.input as Record<string, unknown> },
			policyConfig,
		);
		if (block) return block;
	});

	pi.on("tool_result", async (event) => {
		if (event.isError || !policyConfig.redactSecrets) return;
		const content = event.content as Array<{ type: string; text?: string }>;
		const redacted = redactToolResultContent(content, policyConfig);
		if (redacted) return { content: redacted };
	});

	// Streamed lifecycle rules (TTSR-inspired, one-shot per session)
	pi.on("agent_end", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries() as Array<{
			type: string;
			role?: string;
			content?: unknown;
		}>;
		const text = extractLastAssistantText(entries);
		if (!text) return;

		const rule = streamedRules.matchAssistantText(text);
		if (!rule) return;

		try {
			pi.sendMessage(
				{
					customType: "pi-flow-streamed-rule",
					content: rule.message,
					display: true,
				},
				{ deliverAs: "followUp" },
			);
		} catch {
			ctx.ui.notify(rule.message, "warning");
		}
	});

	pi.registerTool({
		name: "paperflow_host",
		label: "Paperflow host",
		description:
			"Check or start the external paperflow-daemon on :8767 (not embedded in Pi). action=status|ensure.",
		parameters: Type.Object({
			action: Type.Union([Type.Literal("status"), Type.Literal("ensure")]),
		}),
		async execute(_id, params) {
			const result =
				params.action === "ensure"
					? await ensurePaperflowHost()
					: await checkPaperflowHost();
			const text = JSON.stringify(result, null, 2);
			return {
				content: [{ type: "text", text }],
				details: result,
			};
		},
	});

	pi.registerTool({
		name: "paperflow_verify",
		label: "Verify paperflow HTML",
		description:
			"Run paperflow-doc-verify. Returns PASS|WARN|FAIL|SKIP. Prefer over manual browser checks.",
		parameters: Type.Object({
			url: Type.String(),
			kind: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			const { line, verdict } = await verifyPaperflowDoc(params.url, params.kind);
			return {
				content: [{ type: "text", text: line }],
				details: { verdict },
			};
		},
	});

	pi.registerTool({
		name: "paperflow_dispatch",
		label: "Dispatch to boss Pi",
		description:
			"Send a message to the registered boss Pi session via cmux send (grill bridge). Does not spawn a workspace.",
		parameters: Type.Object({
			message: Type.String(),
			workspace: Type.Optional(Type.String()),
			session_id: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			const result = await dispatchToBossSession({
				message: params.message,
				workspace: params.workspace ?? process.env.CMUX_WORKSPACE_ID ?? null,
				sessionId: params.session_id ?? null,
			});
			const text = JSON.stringify(result, null, 2);
			return {
				content: [{ type: "text", text }],
				isError: !result.ok,
				details: result,
			};
		},
	});

	pi.registerTool({
		name: "paperflow_cmux",
		label: "CMUX",
		description: "action=detect|open (open requires url).",
		parameters: Type.Object({
			action: Type.Union([Type.Literal("detect"), Type.Literal("open")]),
			url: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			if (params.action === "detect") {
				const detect = await cmuxDetectJson();
				const text = JSON.stringify(
					{
						cmux: isInCmux(detect),
						workspace: detect?.workspace ?? process.env.CMUX_WORKSPACE_ID ?? null,
					},
					null,
					2,
				);
				return { content: [{ type: "text", text }], details: { detect } };
			}
			if (!params.url) {
				return {
					content: [{ type: "text", text: "FAIL: url required" }],
					isError: true,
					details: {},
				};
			}
			try {
				const out = await cmuxBrowserOpen(params.url);
				return { content: [{ type: "text", text: out || `Opened ${params.url}` }], details: {} };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `FAIL: ${message}` }],
					isError: true,
					details: {},
				};
			}
		},
	});

	pi.registerTool({
		name: "paperflow_active_goal",
		label: "Active goal pointers",
		description:
			"Read or set .paperflow/active-goal and active-phase. action=read|set (set requires goalId).",
		parameters: Type.Object({
			action: Type.Optional(Type.Union([Type.Literal("read"), Type.Literal("set")])),
			goalId: Type.Optional(Type.String()),
			phaseId: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			const cwd = process.cwd();
			const action = params.action ?? "read";

			if (action === "set") {
				if (!params.goalId?.trim()) {
					return {
						content: [{ type: "text", text: "FAIL: goalId required for set" }],
						isError: true,
						details: {},
					};
				}
				writeActiveGoalPointers(cwd, params.goalId, params.phaseId);
				pi.appendEntry(PI_FLOW_STATE_TYPE, {
					goalId: params.goalId,
					phaseId: params.phaseId ?? null,
				});
				const goal = readActiveGoalContext(cwd);
				return {
					content: [{ type: "text", text: goal?.summary ?? "Pointers updated." }],
					details: goal ?? {},
				};
			}

			const goal = readActiveGoalContext(cwd);
			if (!goal) {
				return {
					content: [
						{
							type: "text",
							text: "No active goal. Run /skill:goal or paperflow_active_goal set.",
						},
					],
					details: {},
				};
			}
			return {
				content: [{ type: "text", text: goal.summary }],
				details: goal,
			};
		},
	});

	pi.registerTool({
		name: "paperflow_beads",
		label: "Beads (bd)",
		description:
			"Thin bd wrapper. action=ready|show|ensure_repo|sync_todo. Mutations stay with pi-flow.bd-keeper.",
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("ready"),
				Type.Literal("show"),
				Type.Literal("ensure_repo"),
				Type.Literal("sync_todo"),
			]),
			id: Type.Optional(Type.String({ description: "Required for show" })),
		}),
		async execute(_id, params) {
			const cwd = process.cwd();
			if (params.action === "ready" || params.action === "sync_todo") {
				const r = await bdReady(cwd);
				if (r.ok && params.action === "sync_todo") {
					pi.appendEntry(PI_FLOW_STATE_TYPE, {
						goalId: readActiveGoalContext(cwd)?.goalId,
						phaseId: readActiveGoalContext(cwd)?.phaseId,
						lastReadySnapshot: r.stdout.slice(0, 4000),
						syncedAt: Date.now(),
					});
				}
				return {
					content: [{ type: "text", text: r.ok ? r.stdout : r.error }],
					details: {},
					isError: !r.ok,
				};
			}
			if (params.action === "ensure_repo") {
				const r = await bdEnsureRepo(cwd);
				return {
					content: [{ type: "text", text: r.ok ? r.stdout || "bd init ok" : r.error }],
					details: {},
					isError: !r.ok,
				};
			}
			if (!params.id) {
				return {
					content: [{ type: "text", text: "FAIL: id required for show" }],
					isError: true,
					details: {},
				};
			}
			const r = await bdShow(params.id, cwd);
			if (r.ok && params.action === "show") {
				try {
					const parsed = JSON.parse(r.stdout) as { id?: string; title?: string };
					pi.appendEntry(PI_FLOW_STATE_TYPE, {
						goalId: readActiveGoalContext(cwd)?.goalId,
						phaseId: readActiveGoalContext(cwd)?.phaseId,
						lastShown: parsed.id,
					});
				} catch {
					// optional persistence
				}
			}
			return {
				content: [{ type: "text", text: r.ok ? r.stdout : r.error }],
				details: {},
				isError: !r.ok,
			};
		},
	});

	pi.registerTool({
		name: "paperflow_opencode",
		label: "OpenCode + paperflow",
		description:
			"Auto-configure OpenCode for paperflow/cmux (plugin, hooks, optional serve). action=status|ensure.",
		parameters: Type.Object({
			action: Type.Union([Type.Literal("status"), Type.Literal("ensure")]),
		}),
		async execute(_id, params) {
			const result: OpenCodeIntegrationStatus = await ensureOpenCodeIntegration({
				packageRoot,
				ensureHost: params.action === "ensure",
				ensureServe: params.action === "ensure",
			});
			const text = JSON.stringify(result, null, 2);
			return {
				content: [{ type: "text", text }],
				details: result,
			};
		},
	});

	pi.registerTool({
		name: "paperflow_browse",
		label: "Browserbase CLI (browse)",
		description:
			"Install or run the browse CLI from Pi. action=install|version|cloud_projects|sessions_list.",
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("install"),
				Type.Literal("version"),
				Type.Literal("cloud_projects"),
				Type.Literal("sessions_list"),
			]),
		}),
		async execute(_id, params) {
			loadBrowserbaseEnvFile();
			if (params.action === "install") {
				const result = await ensureBrowseCli();
				const text = JSON.stringify(result, null, 2);
				return {
					content: [{ type: "text", text }],
					details: result,
					isError: !result.ok,
				};
			}
			const args =
				params.action === "version"
					? ["--version"]
					: params.action === "cloud_projects"
						? ["cloud", "projects", "list"]
						: ["cloud", "sessions", "list"];
			const run = await runBrowseCli(args, 60_000);
			return {
				content: [
					{
						type: "text",
						text: run.ok ? run.stdout : `FAIL: ${run.error} (tried ${run.source})`,
					},
				],
				details: { source: run.source },
				isError: !run.ok,
			};
		},
	});
}
