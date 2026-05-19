import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { bdReady } from "../shared/beads-client.ts";
import { formatDoctorReport, runPiFlowDoctor } from "../shared/doctor.ts";
import { ensurePiFlowDeps, formatDepsReport } from "../shared/deps.ts";
import { buildHandoffPrompt } from "../shared/handoff.ts";
import { ensurePaperflowHost } from "../shared/host-manager.ts";
import { readActiveGoalContext } from "../shared/paperflow-client.ts";
import { DEFAULT_POLICY } from "../shared/policy.ts";
import { resolvePackageRoot } from "../shared/package-root.ts";
import {
	getPiFlowModelRoleHints,
	loadMergedPiSettings,
} from "../shared/settings-loader.ts";
import { formatPiFlowStatus } from "../shared/status.ts";
import {
	formatBrowserbaseSetupReport,
	loadBrowserbaseEnvFile,
	runBrowserbaseSetup,
} from "../shared/browserbase.ts";
import { updatePiFlowPackage } from "../shared/update-package.ts";
import { applyPiFlowSettings } from "./apply-settings.ts";
import { applyPiFlowSubagentConfig } from "../shared/subagent-config.ts";
import { installPiFlowAgents } from "./install-agents.ts";
import { ensureOpenCodeIntegration } from "../shared/opencode-integration.ts";

const NAMESPACE = "pi-flow";
const packageRoot = resolvePackageRoot(import.meta.url);
const agentsSource = path.join(packageRoot, "agents");
const globalAgentsDir = path.join(os.homedir(), ".pi", "agent", "agents");
const lifecycleSkillsDir = path.join(packageRoot, "skills");
const cmuxSkillsDir = path.join(packageRoot, "skills-cmux");

function countSkillDirs(dir: string): number {
	try {
		return fs
			.readdirSync(dir, { withFileTypes: true })
			.filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, "SKILL.md"))).length;
	} catch {
		return 0;
	}
}

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
		loadBrowserbaseEnvFile();
		// Lightweight: ensure MCP + env file exist; defer browse install to /pi-flow-setup
		try {
			const { applyBrowserbaseMcp } = await import("../shared/mcp-browserbase.ts");
			applyBrowserbaseMcp({ packageRoot, mode: "hosted" });
		} catch {
			// ignore
		}
		try {
			installAgents(ctx);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`pi-flow: agent install failed (${message})`, "error");
		}
		// OpenCode config + paperflow session plugin (no-op if opencode not installed)
		void ensureOpenCodeIntegration({ packageRoot, ensureHost: false, ensureServe: false });
	});

	pi.registerCommand("pi-flow-setup", {
		description: "Re-apply settings, agents, host, OpenCode (optional — quickstart already ran)",
		handler: async (_args, ctx) => {
			try {
				const global = applyPiFlowSettings("global");
				const project = applyPiFlowSettings("project", process.cwd());
				const subCfg = applyPiFlowSubagentConfig();
				installAgents(ctx);

				const deps = await ensurePiFlowDeps({
					cwd: process.cwd(),
					packageRoot,
					initBeads: true,
				});
				const host = await ensurePaperflowHost();
				const opencode = await ensureOpenCodeIntegration({
					packageRoot,
					ensureServe: true,
				});
				const browserbase = await runBrowserbaseSetup({ packageRoot });

				ctx.ui.notify(
					[
						"pi-flow setup complete.",
						"",
						formatDepsReport(deps),
						"",
						`Settings: ${global.path}`,
						`Subagents: ${subCfg.path}`,
						"Follow UX: /pf-agents · /pf-follow · /pf-boss · /pf-watch",
						`Project: ${project.path}`,
						`Host: ${host.running ? "running" : "not running"} — ${host.detail}`,
						"",
						formatBrowserbaseSetupReport(browserbase),
						"",
						"Start: /skill:autopilot \"…\"  or  /skill:goal",
						"Status: /pi-flow-status · Doctor: /pi-flow-doctor",
						"Handoff: /pi-flow-handoff [focus]",
						"",
						"Docs: README.md · docs/BEST-PRACTICES.md",
					].join("\n"),
					host.running ? "info" : "warning",
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`pi-flow setup failed: ${message}`, "error");
			}
		},
	});

	pi.registerCommand("pi-flow-doctor", {
		description: "Run live pi-flow + paperflow + cmux checks",
		handler: async (_args, ctx) => {
			const checks = await runPiFlowDoctor(process.cwd(), packageRoot);
			ctx.ui.notify(formatDoctorReport(checks), "info");
		},
	});

	pi.registerCommand("pi-flow-status", {
		description: "Unified status: doctor, policy, skills, model roles, extensions",
		handler: async (_args, ctx) => {
			const cwd = process.cwd();
			const settings = loadMergedPiSettings(cwd);
			const policy = { ...DEFAULT_POLICY, ...(settings.piFlow as { policy?: typeof DEFAULT_POLICY })?.policy };
			const checks = await runPiFlowDoctor(cwd, packageRoot);
			const cmuxSkillCount = countSkillDirs(cmuxSkillsDir);

			const report = formatPiFlowStatus({
				doctor: checks,
				policy,
				skills: {
					lifecycle: countSkillDirs(lifecycleSkillsDir),
					cmux: cmuxSkillCount > 0,
				},
				modelRoles: getPiFlowModelRoleHints(settings),
				extensions: [
					"pi-flow-setup",
					"pi-flow-host",
					"pi-mcp-adapter",
					"pi-subagents",
					"browserbase MCP (hosted)",
					"pi-cursor-provider (optional)",
				],
			});
			ctx.ui.notify(report, "info");
		},
	});

	pi.registerCommand("pi-flow-handoff", {
		description: "New session with active goal + bd ready context (optional focus text)",
		handler: async (args, ctx) => {
			const cwd = process.cwd();
			const goal = readActiveGoalContext(cwd);
			const ready = await bdReady(cwd);
			const prompt = buildHandoffPrompt({
				cwd,
				goal,
				readyStdout: ready.ok ? ready.stdout : null,
				focus: args.trim() || undefined,
			});

			await ctx.waitForIdle();

			const parentSession =
				typeof ctx.sessionManager.getSessionFile === "function"
					? ctx.sessionManager.getSessionFile()
					: undefined;

			try {
				await ctx.newSession({
					parentSession,
					setup: async (sessionManager) => {
						sessionManager.appendMessage({
							role: "user",
							content: [{ type: "text", text: prompt }],
							timestamp: Date.now(),
						});
					},
				});
				ctx.ui.notify("pi-flow: handoff session started with goal context.", "info");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(
					[
						"pi-flow handoff: could not open a new session automatically.",
						message,
						"",
						"Copy this into a fresh Pi session:",
						"",
						prompt.slice(0, 2000),
						prompt.length > 2000 ? "\n…(truncated)" : "",
					].join("\n"),
					"warning",
				);
			}
		},
	});

	pi.registerCommand("pi-flow-dispatch", {
		description: "Send a line to the boss Pi session in this cmux workspace (grill bridge)",
		handler: async (args, ctx) => {
			const message = args.trim();
			if (!message) {
				ctx.ui.notify("Usage: /pi-flow-dispatch /skill:review", "warning");
				return;
			}
			const { dispatchToBossSession } = await import("../shared/paperflow-dispatch.ts");
			const result = await dispatchToBossSession({
				message,
				workspace: process.env.CMUX_WORKSPACE_ID ?? null,
			});
			ctx.ui.notify(
				result.ok
					? `dispatched → ${result.session_id} (${result.result})`
					: `dispatch failed: ${result.reason}`,
				result.ok ? "info" : "error",
			);
		},
	});

	pi.registerCommand("pi-flow-browserbase-setup", {
		description:
			"Install browse CLI, merge Browserbase MCP config, verify cloud API (optional: stdio)",
		handler: async (args, ctx) => {
			const mode = args.trim().toLowerCase() === "stdio" ? "stdio" : "hosted";
			const result = await runBrowserbaseSetup({
				packageRoot,
				mode,
				forceMcp: mode === "stdio",
			});
			const allOk = result.browse.ok && result.mcp.ok && result.cloud.ok;
			ctx.ui.notify(formatBrowserbaseSetupReport(result), allOk ? "info" : "warning");
		},
	});

	pi.registerCommand("pi-flow-install-deps", {
		description: "Install/update beads (bd), jq, and bd init in this repo",
		handler: async (_args, ctx) => {
			const deps = await ensurePiFlowDeps({
				cwd: process.cwd(),
				packageRoot,
				initBeads: true,
			});
			ctx.ui.notify(formatDepsReport(deps), "info");
		},
	});

	pi.registerCommand("pi-flow-update", {
		description: "Update pi-flow package, refresh deps, re-sync agents",
		handler: async (_args, ctx) => {
			try {
				ctx.ui.notify("pi-flow: updating package…", "info");
				const pkg = await updatePiFlowPackage();
				applyPiFlowSettings("global");
				applyPiFlowSettings("project", process.cwd());
				installAgents(ctx);
				const deps = await ensurePiFlowDeps({
					cwd: process.cwd(),
					packageRoot,
					initBeads: true,
				});
				const host = await ensurePaperflowHost();
				const browserbase = await runBrowserbaseSetup({ packageRoot });

				ctx.ui.notify(
					[
						pkg.ok ? "pi-flow package updated." : "pi-flow package update had issues.",
						pkg.detail,
						"",
						formatDepsReport(deps),
						"",
						`Host: ${host.running ? "running" : host.detail}`,
						"",
						formatBrowserbaseSetupReport(browserbase),
						"",
						"Tip: /reload if extensions feel stale",
						"/pi-flow-status for full dashboard",
					].join("\n"),
					pkg.ok && host.running ? "info" : "warning",
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`pi-flow update failed: ${message}`, "error");
			}
		},
	});

	pi.registerCommand("pi-flow-cmux-layout", {
		description: "Print cmux workspace command for this repo",
		handler: async (_args, ctx) => {
			const script = path.join(packageRoot, "scripts", "cmux-layout.sh");
			ctx.ui.notify(
				[
					"Run in shell (outside Pi):",
					`curl -fsSL https://raw.githubusercontent.com/FRIKKern/pi-flow/main/scripts/cmux-layout.sh | bash -s -- "${process.cwd()}" my-goal`,
					"",
					`Or locally: ${script} "${process.cwd()}" my-goal`,
					"",
					"Browser pane → http://localhost:8767/",
				].join("\n"),
				"info",
			);
		},
	});
}
