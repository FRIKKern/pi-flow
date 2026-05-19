import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { bdEnsureRepo, bdReady, bdShow } from "../shared/beads-client.ts";
import { PI_FLOW_STATE_TYPE } from "../shared/constants.ts";
import { checkPaperflowHost, ensurePaperflowHost } from "../shared/host-manager.ts";
import {
	cmuxBrowserOpen,
	cmuxDetectJson,
	isInCmux,
	readActiveGoalContext,
	registerPiFlowSession,
	verifyPaperflowDoc,
	writeActiveGoalPointers,
} from "../shared/paperflow-client.ts";
import { resolvePackageRoot } from "../shared/package-root.ts";

const packageRoot = resolvePackageRoot(import.meta.url);
const cmuxSkillsDir = path.join(packageRoot, "skills-cmux");

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

export default function piFlowHost(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		try {
			restoreWorkflowState(pi, ctx.sessionManager);
			await registerPiFlowSession();
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
		description: "Read .paperflow/active-goal and active-phase.",
		parameters: Type.Object({}),
		async execute() {
			const goal = readActiveGoalContext(process.cwd());
			if (!goal) {
				return {
					content: [
						{
							type: "text",
							text: "No active goal. Run /skill:goal or paperflow_active_goal with set.",
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
			"Thin bd wrapper. action=ready|show|ensure_repo. Mutations stay with pi-flow.bd-keeper subagent.",
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("ready"),
				Type.Literal("show"),
				Type.Literal("ensure_repo"),
			]),
			id: Type.Optional(Type.String({ description: "Required for show" })),
		}),
		async execute(_id, params) {
			const cwd = process.cwd();
			if (params.action === "ready") {
				const r = await bdReady(cwd);
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
}
