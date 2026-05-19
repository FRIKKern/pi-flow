import { spawn } from "node:child_process";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { loadMergedPiSettings } from "../shared/settings-loader.ts";
import { appendSessionJournal } from "../shared/session-memory.ts";
import {
	bindSessionActions,
	hasSessionActions,
	switchToSessionFile,
} from "../shared/session-actions.ts";
import {
	formatContinueBasename,
	isFreshSession,
	loadSessionContinueConfig,
	resolveContinueTarget,
	shouldAutoContinueOnStartup,
} from "../shared/session-continue.ts";
import {
	contentToPlainText,
	deriveSessionNameFromPrompt,
	loadSessionNamingConfig,
	readGoalId,
	shouldSkipAutoName,
} from "../shared/session-naming.ts";

const STATUS_KEY = "pi-flow-sess";

export default function piFlowSessions(pi: ExtensionAPI): void {
	const settings = loadMergedPiSettings();
	const namingConfig = loadSessionNamingConfig(settings);
	const continueConfig = loadSessionContinueConfig(settings);

	let cwd = process.cwd();
	let autoNameDone = false;
	/** User set a name via /pf-rename or session already had a title on load. */
	let userLockedName = false;

	function bindCwd(ctx: ExtensionCommandContext): void {
		cwd = ctx.cwd;
	}

	function refreshStatus(ctx: { hasUI: boolean; ui: ExtensionCommandContext["ui"] }): void {
		if (!ctx.hasUI) return;
		const name = pi.getSessionName();
		ctx.ui.setStatus(STATUS_KEY, name ? `sess:${truncateStatus(name)}` : undefined);
	}

	function applyRename(title: string, ctx: ExtensionCommandContext): void {
		pi.setSessionName(title);
		userLockedName = true;
		autoNameDone = true;
		try {
			appendSessionJournal(cwd, {
				kind: "command",
				summary: `User renamed session: ${title}`,
			});
		} catch {
			// memory optional
		}
		ctx.ui.notify(`Session renamed: ${title}`, "info");
		refreshStatus(ctx);
	}

	pi.on("session_start", async (event, ctx) => {
		cwd = ctx.cwd;
		autoNameDone = false;
		userLockedName = Boolean(pi.getSessionName()?.trim());
		refreshStatus(ctx);

		if (!shouldAutoContinueOnStartup(settings)) return;
		if (event.reason !== "startup" && event.reason !== "new") return;

		const entries = ctx.sessionManager.getEntries();
		if (!isFreshSession(entries)) return;

		const target = resolveContinueTarget(ctx.cwd, {
			preferBossSession: continueConfig.preferBossSession,
		});
		if (!target) return;

		const currentFile = ctx.sessionManager.getSessionFile();
		if (currentFile && target === currentFile) return;

		if (hasSessionActions()) {
			const result = await switchToSessionFile(target);
			if (!result.cancelled && ctx.hasUI) {
				ctx.ui.notify(`Resumed ${formatContinueBasename(target)}`, "info");
			}
			return;
		}

		if (process.env.PI_FLOW_CONTINUE_REEXEC === "1") return;
		const bin = process.env.PI_FLOW_PI_BIN?.trim() || "pi";
		const childArgs = ["-c", ...process.argv.slice(2)];
		if (ctx.hasUI) {
			ctx.ui.notify(`Resuming ${formatContinueBasename(target)}…`, "info");
		}
		const child = spawn(bin, childArgs, {
			stdio: "inherit",
			cwd: ctx.cwd,
			env: { ...process.env, PI_FLOW_CONTINUE_REEXEC: "1" },
		});
		child.on("exit", (code, signal) => {
			if (signal) process.kill(process.pid, signal);
			else process.exit(code ?? 0);
		});
		child.on("error", (err) => {
			if (ctx.hasUI) {
				ctx.ui.notify(
					`Could not re-launch pi -c (${err.message}). Run: pi -c`,
					"warning",
				);
			}
		});
		ctx.shutdown();
	});

	pi.on("message_end", (event, ctx) => {
		if (!namingConfig.autoNameFromFirstPrompt) return;
		if (autoNameDone || userLockedName) return;

		const msg = event.message as { role?: string; content?: unknown };
		if (msg.role !== "user") return;

		const text = contentToPlainText(msg.content);
		if (!text.trim() || shouldSkipAutoName(text)) return;

		const goalId = readGoalId(cwd);
		const title = deriveSessionNameFromPrompt(text, { ...namingConfig, goalId });
		pi.setSessionName(title);
		autoNameDone = true;

		try {
			appendSessionJournal(cwd, {
				kind: "session.start",
				summary: `Auto-named session: ${title}`,
			});
		} catch {
			// memory optional
		}

		if (ctx.hasUI) {
			ctx.ui.notify(`Session: ${title} — /pf-rename to change`, "info");
			refreshStatus(ctx);
		}
	});

	pi.registerCommand("pf-continue", {
		description: "Resume the last session for this project (boss session preferred)",
		handler: async (_args, ctx) => {
			bindCwd(ctx);
			bindSessionActions(ctx);
			const target = resolveContinueTarget(ctx.cwd, {
				preferBossSession: continueConfig.preferBossSession,
			});
			if (!target) {
				ctx.ui.notify("No prior session to resume in this project", "warning");
				return;
			}
			const result = await switchToSessionFile(target);
			if (result.cancelled) {
				ctx.ui.notify("Resume cancelled", "warning");
				return;
			}
			ctx.ui.notify(`Resumed ${formatContinueBasename(target)}`, "info");
			refreshStatus(ctx);
		},
	});

	pi.registerCommand("pf-rename", {
		description: "Rename this Pi session (alias for /name; shown in session picker)",
		handler: async (args, ctx) => {
			bindCwd(ctx);
			const raw = args.trim();
			if (!raw) {
				const current = pi.getSessionName();
				ctx.ui.notify(
					current ? `Session name: ${current}` : "Usage: /pf-rename <title>",
					current ? "info" : "warning",
				);
				return;
			}
			applyRename(raw, ctx);
		},
	});
}

function truncateStatus(name: string, max = 24): string {
	return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
