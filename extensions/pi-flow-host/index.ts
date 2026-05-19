import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { resolvePackageRoot } from "../shared/package-root.ts";
import {
	cmuxBrowserOpen,
	cmuxDetectJson,
	isInCmux,
	readActiveGoalContext,
	registerPiFlowSession,
	verifyPaperflowDoc,
} from "./paperflow-client.ts";

const packageRoot = resolvePackageRoot(import.meta.url);
const cmuxSkillsDir = path.join(packageRoot, "skills-cmux");

export default function piFlowHost(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		try {
			await registerPiFlowSession();
			const cmux = await cmuxDetectJson();
			if (isInCmux(cmux)) {
				ctx.ui.notify(
					`pi-flow: cmux ready (workspace ${String(cmux?.workspace ?? process.env.CMUX_WORKSPACE_ID ?? "?").slice(0, 8)}…). Grill Submit routes here.`,
					"info",
				);
			} else if (!process.env.CMUX_WORKSPACE_ID) {
				ctx.ui.notify(
					"pi-flow: degraded mode (no cmux). Install cmux + paperflow host for full HTML/grill bridge. See docs/CMUX.md",
					"warning",
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`pi-flow host: session start (${message})`, "error");
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
				content: `[pi-flow context]\n${goal.summary}\n[/pi-flow context]`,
				display: false,
			},
		};
	});

	pi.registerTool({
		name: "paperflow_verify",
		label: "Verify paperflow HTML",
		description:
			"Run paperflow-doc-verify on a plan/grill/goal URL. Returns one line: PASS|WARN|FAIL|SKIP.",
		parameters: Type.Object({
			url: Type.String({ description: "Full http://localhost:8767/paperflow/… URL" }),
			kind: Type.Optional(
				Type.String({
					description: "Optional doc kind: plan, grill, goal, spec, …",
				}),
			),
		}),
		async execute(_toolCallId, params) {
			const { verdict, line } = await verifyPaperflowDoc(params.url, params.kind);
			return {
				content: [{ type: "text", text: line }],
				details: { verdict },
			};
		},
	});

	pi.registerTool({
		name: "paperflow_cmux",
		label: "CMUX status & browser",
		description:
			"Detect cmux workspace or open a URL in the cmux browser surface. action=detect|open.",
		parameters: Type.Object({
			action: Type.Union([
				Type.Literal("detect"),
				Type.Literal("open"),
			]),
			url: Type.Optional(
				Type.String({ description: "Required when action=open" }),
			),
		}),
		async execute(_toolCallId, params) {
			if (params.action === "detect") {
				const detect = await cmuxDetectJson();
				const text = JSON.stringify(
					{
						cmux: isInCmux(detect),
						workspace: detect?.workspace ?? process.env.CMUX_WORKSPACE_ID ?? null,
						version: detect?.version ?? null,
					},
					null,
					2,
				);
				return {
					content: [{ type: "text", text }],
					details: { detect },
				};
			}

			if (!params.url) {
				return {
					content: [{ type: "text", text: "FAIL: url required for action=open" }],
					details: { error: "missing url" },
					isError: true,
				};
			}

			try {
				const out = await cmuxBrowserOpen(params.url);
				return {
					content: [{ type: "text", text: out || `Opened ${params.url}` }],
					details: { url: params.url },
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					content: [{ type: "text", text: `FAIL: ${message}` }],
					details: { error: message },
					isError: true,
				};
			}
		},
	});

	pi.registerTool({
		name: "paperflow_active_goal",
		label: "Read active paperflow goal",
		description:
			"Read .paperflow/active-goal and active-phase pointers for the current repo.",
		parameters: Type.Object({}),
		async execute() {
			const goal = readActiveGoalContext(process.cwd());
			if (!goal) {
				return {
					content: [
						{
							type: "text",
							text: "No active goal (.paperflow/active-goal missing or empty). Run /skill:goal first.",
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
}
