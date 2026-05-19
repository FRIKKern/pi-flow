import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { applyPiFlowSettings } from "./apply-settings.ts";
import { syncBundledAgents } from "./sync-agents.ts";

const NAMESPACE = "pi-flow";
const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(extensionDir, "..", "..");
const agentsSource = path.join(packageRoot, "agents");
const agentsTarget = path.join(os.homedir(), ".pi", "agent", "agents");

function syncAgents(ctx: ExtensionContext): void {
	const result = syncBundledAgents({
		sourceDir: agentsSource,
		targetDir: agentsTarget,
		namespace: NAMESPACE,
		onWarn: (message) => ctx.ui.notify(message, "warning"),
	});

	if (result.written.length > 0 || result.pruned.length > 0) {
		ctx.ui.notify(
			`pi-flow: synced ${result.written.length} agent(s), pruned ${result.pruned.length}.`,
			"info",
		);
	}
}

export default function piFlowCore(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		try {
			syncAgents(ctx);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`pi-flow: agent sync failed (${message})`, "error");
		}
	});

	pi.registerCommand("pi-flow-setup", {
		description:
			"Apply pi-flow defaults (paperflow lifecycle package, optional Composer 2.5) and sync agents",
		handler: async (_args, ctx) => {
			try {
				const global = applyPiFlowSettings("global");
				syncAgents(ctx);
				ctx.ui.notify(
					[
						"pi-flow setup complete.",
						`Settings: ${global.path}`,
						"Lifecycle: /skill:goal → /skill:plan → /skill:build → /skill:review",
						"Default model: composer-2.5 (change with /model; /login cursor if using Cursor provider).",
						"Paperflow host (optional): github.com/FRIKKern/paperflow quickstart.sh",
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
		description: "Check pi-flow + paperflow host wiring",
		handler: async (_args, ctx) => {
			ctx.ui.notify(
				[
					"pi-flow doctor",
					"",
					"Pi package (install once: pi install git:github.com/FRIKKern/pi-flow):",
					"  • pi-subagents, pi-mcp-adapter",
					"  • pi-cursor-provider (optional — Cursor subscription models only)",
					"",
					"Paperflow skills in Pi (mirror FRIKKern/paperflow):",
					"  /skill:goal | plan | build | review | autopilot | resume",
					"",
					"Paperflow host (CMUX, HTML @ :8767, grill bridge):",
					"  ~/.local/bin/paperflow-doctor --fast",
					"  ~/.local/bin/paperflow-preflight",
					"",
					`Agents: ${agentsTarget} (${NAMESPACE}.*)`,
					"Thresholds: lib/paperflow-thresholds.md",
				].join("\n"),
				"info",
			);
		},
	});
}
