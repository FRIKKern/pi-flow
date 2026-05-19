import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { applyPiCursorSettings } from "./apply-settings.ts";
import { syncBundledAgents } from "./sync-agents.ts";

const NAMESPACE = "pi-cursor";
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
			`pi-cursor: synced ${result.written.length} agent(s), pruned ${result.pruned.length}.`,
			"info",
		);
	}
}

export default function piCursorCore(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		try {
			syncAgents(ctx);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`pi-cursor: agent sync failed (${message})`, "error");
		}
	});

	pi.registerCommand("pi-cursor-setup", {
		description:
			"Apply pi-cursor defaults (Composer 2.5, bundled packages) and sync agents",
		handler: async (_args, ctx) => {
			try {
				const global = applyPiCursorSettings("global");
				syncAgents(ctx);
				ctx.ui.notify(
					[
						"pi-cursor setup complete.",
						`Settings: ${global.path}`,
						"Next: run `/login cursor`, then `/model` → composer-2.5",
						"Copy .mcp.json.example → .mcp.json and add your MCP servers.",
					].join("\n"),
					"info",
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`pi-cursor setup failed: ${message}`, "error");
			}
		},
	});

	pi.registerCommand("pi-cursor-doctor", {
		description: "Check pi-cursor dependencies and MCP/subagent wiring",
		handler: async (_args, ctx) => {
			const checks = [
				"pi-cursor-provider (Cursor OAuth → Composer 2.5)",
				"pi-mcp-adapter (MCP proxy + direct tools)",
				"pi-subagents (child agents with mcp: in frontmatter)",
			];
			ctx.ui.notify(
				[
					"pi-cursor doctor",
					"",
					"Bundled extensions (install once: pi install npm:pi-cursor):",
					...checks.map((c) => `  • ${c}`),
					"",
					`Agents dir: ${agentsTarget}`,
					`Synced prefix: ${NAMESPACE}.*`,
					"",
					"If subagent lacks MCP: add mcp:server to that agent's tools: frontmatter.",
					"Run /mcp setup after first install.",
				].join("\n"),
				"info",
			);
		},
	});
}
