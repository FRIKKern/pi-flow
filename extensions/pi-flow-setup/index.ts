import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { resolvePackageRoot } from "../shared/package-root.ts";
import { applyPiFlowSettings } from "./apply-settings.ts";
import { installPiFlowAgents } from "./install-agents.ts";

const NAMESPACE = "pi-flow";
const packageRoot = resolvePackageRoot(import.meta.url);
const agentsSource = path.join(packageRoot, "agents");
const globalAgentsDir = path.join(os.homedir(), ".pi", "agent", "agents");

function installAgents(ctx: ExtensionContext, cwd = process.cwd()): void {
	const result = installPiFlowAgents({
		sourceDir: agentsSource,
		projectDir: cwd,
		globalAgentsDir,
		namespace: NAMESPACE,
		onWarn: (message) => ctx.ui.notify(message, "warning"),
	});

	const parts: string[] = [];
	if (result.projectSymlinks.length > 0) {
		parts.push(`${result.projectSymlinks.length} project symlink(s)`);
	}
	if (result.globalWritten.length > 0 || result.globalPruned.length > 0) {
		parts.push(
			`global ${result.globalWritten.length} updated, ${result.globalPruned.length} pruned`,
		);
	}
	if (parts.length > 0) {
		ctx.ui.notify(`pi-flow: agents — ${parts.join("; ")}.`, "info");
	}
}

export default function piFlowSetup(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		try {
			installAgents(ctx);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`pi-flow: agent install failed (${message})`, "error");
		}
	});

	pi.registerCommand("pi-flow-setup", {
		description: "Apply pi-flow defaults, install agents, print next steps",
		handler: async (_args, ctx) => {
			try {
				const global = applyPiFlowSettings("global");
				const project = applyPiFlowSettings("project", process.cwd());
				installAgents(ctx);

				ctx.ui.notify(
					[
						"pi-flow setup complete.",
						"",
						`Global settings: ${global.path}`,
						`Project settings: ${project.path}`,
						`Agents: .pi/agents/${NAMESPACE}/ (project) + ~/.pi/agent/agents/${NAMESPACE}.*`,
						"",
						"Next:",
						"  1. paperflow host — curl -fsSL …/paperflow/…/quickstart.sh | bash",
						"  2. cmux workspace — scripts/cmux-layout.sh <repo> <goal>",
						"  3. In Pi: /login cursor (optional) · /skill:autopilot \"…\"",
						"",
						"Docs: README.md · docs/CMUX.md",
					].join("\n"),
					"info",
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`pi-flow setup failed: ${message}`, "error");
			}
		},
	});

	pi.registerCommand("pi-flow-doctor", {
		description: "pi-flow + cmux + paperflow host checklist",
		handler: async (_args, ctx) => {
			const cmuxEnv = process.env.CMUX_WORKSPACE_ID
				? `cmux env: workspace ${String(process.env.CMUX_WORKSPACE_ID).slice(0, 8)}…`
				: "cmux env: CMUX_WORKSPACE_ID not set";

			ctx.ui.notify(
				[
					"pi-flow doctor",
					"",
					cmuxEnv,
					"Host tools: paperflow_verify · paperflow_cmux · paperflow_active_goal",
					"",
					"Shell checks:",
					"  paperflow-preflight · paperflow-doctor --fast",
					"  paperflow-doc-verify <url>",
					"",
					"Pi package:",
					"  pi-subagents · pi-mcp-adapter · pi-cursor-provider (optional)",
					"",
					`Agents: ${globalAgentsDir} (${NAMESPACE}.*)`,
					`Project: ${path.join(process.cwd(), ".pi", "agents", NAMESPACE)}`,
					"",
					"Skills: /skill:goal … /skill:cmux (in cmux)",
					"Docs: docs/CMUX.md · docs/EXTENSIONS.md",
				].join("\n"),
				"info",
			);
		},
	});

	pi.registerCommand("pi-flow-cmux-layout", {
		description: "Print recommended cmux new-workspace command for this repo",
		handler: async (_args, ctx) => {
			const repo = process.cwd();
			const script = path.join(packageRoot, "scripts", "cmux-layout.sh");
			ctx.ui.notify(
				[
					"Run in a shell (outside Pi):",
					`${script} "${repo}" my-goal`,
					"",
					"Then split browser right → http://localhost:8767/",
					"See docs/CMUX.md",
				].join("\n"),
				"info",
			);
		},
	});
}
