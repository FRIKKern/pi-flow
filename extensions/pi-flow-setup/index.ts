import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { formatDoctorReport, runPiFlowDoctor } from "../shared/doctor.ts";
import { ensurePaperflowHost } from "../shared/host-manager.ts";
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
		description: "Apply settings, install agents, ensure paperflow host",
		handler: async (_args, ctx) => {
			try {
				const global = applyPiFlowSettings("global");
				const project = applyPiFlowSettings("project", process.cwd());
				installAgents(ctx);

				const host = await ensurePaperflowHost();

				ctx.ui.notify(
					[
						"pi-flow setup complete.",
						"",
						`Settings: ${global.path}`,
						`Project: ${project.path}`,
						`Host: ${host.running ? "running" : "not running"} — ${host.detail}`,
						"",
						"Start: /skill:autopilot \"…\"  or  /skill:goal",
						"Doctor: /pi-flow-doctor",
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
