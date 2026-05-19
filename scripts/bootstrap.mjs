#!/usr/bin/env node
/**
 * Headless pi-flow bootstrap (quickstart / update). No Pi session required.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { applyPiFlowSettings } from "../extensions/pi-flow-setup/apply-settings.ts";
import { applyPiFlowSubagentConfig } from "../extensions/shared/subagent-config.ts";
import { installPiFlowAgents } from "../extensions/pi-flow-setup/install-agents.ts";
import { applyBrowserbaseMcp } from "../extensions/shared/mcp-browserbase.ts";
import {
	applyOpenCodeConfig,
	installOpenCodePaperflowPlugin,
} from "../extensions/shared/opencode-integration.ts";

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = process.cwd();

const lines = [];
const ok = (m) => lines.push(`✓ ${m}`);
const warn = (m) => lines.push(`! ${m}`);

try {
	const global = applyPiFlowSettings("global");
	ok(`Pi settings → ${global.path}`);

	const sub = applyPiFlowSubagentConfig();
	ok(`subagent config → ${sub.path}`);

	if (process.env.PI_FLOW_SKIP_BROWSERBASE === "1") {
		warn("Browserbase skipped (PI_FLOW_SKIP_BROWSERBASE=1)");
	} else {
		try {
			applyBrowserbaseMcp({ packageRoot, mode: "hosted" });
			ok("Browserbase MCP config");
		} catch {
			warn("Browserbase MCP skip");
		}
	}

	if (fs.existsSync(path.join(repoRoot, ".git")) || fs.existsSync(path.join(repoRoot, "package.json"))) {
		const agents = installPiFlowAgents({
			sourceDir: path.join(packageRoot, "agents"),
			projectDir: repoRoot,
			globalAgentsDir: path.join(process.env.HOME ?? "", ".pi", "agent", "agents"),
			namespace: "pi-flow",
		});
		if (agents.projectSymlinks.length > 0) {
			ok(`project agents (${agents.projectSymlinks.length} symlink(s))`);
		}
		applyPiFlowSettings("project", repoRoot);
		ok(`project settings → ${path.join(repoRoot, ".pi", "settings.json")}`);
	}

	const plugin = installOpenCodePaperflowPlugin(packageRoot);
	if (plugin.ok) ok(`OpenCode plugin → ${plugin.path}`);
	const cfg = applyOpenCodeConfig();
	ok(`OpenCode config → ${cfg.path}`);

	console.log(lines.join("\n"));
	process.exit(0);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`✗ bootstrap failed: ${message}`);
	process.exit(1);
}
