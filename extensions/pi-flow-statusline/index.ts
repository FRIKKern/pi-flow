import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	isPiSubagentChildSession,
	safeExtensionUi,
} from "../shared/extension-context.ts";
import {
	buildStatuslineParts,
	formatStatusline,
} from "../shared/statusline-context.ts";

const STATUS_KEY = "pi-flow";

export default function piFlowStatusline(pi: ExtensionAPI): void {
	// Subagent children fork/replace sessions; deferred status refresh has crashed storms.
	if (isPiSubagentChildSession()) return;
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	let inFlight = false;
	/** Latest ctx from lifecycle hooks — never capture ctx in timers. */
	let activeCtx: ExtensionContext | null = null;

	function clearScheduledRefresh(): void {
		if (refreshTimer) clearTimeout(refreshTimer);
		refreshTimer = null;
	}

	async function refresh(ctx: ExtensionContext): Promise<void> {
		if (inFlight) return;
		inFlight = true;
		try {
			const sessionId = ctx.sessionManager.getSessionId() ?? null;
			const parts = await buildStatuslineParts(process.cwd(), sessionId);
			const line = formatStatusline(parts);
			safeExtensionUi(ctx, (ui) => ui.setStatus(STATUS_KEY, line || undefined));
		} catch {
			safeExtensionUi(ctx, (ui) => ui.setStatus(STATUS_KEY, undefined));
		} finally {
			inFlight = false;
		}
	}

	function scheduleRefresh(delayMs = 150): void {
		clearScheduledRefresh();
		refreshTimer = setTimeout(() => {
			refreshTimer = null;
			const ctx = activeCtx;
			if (!ctx) return;
			void refresh(ctx);
		}, delayMs);
	}

	pi.on("session_start", async (_event, ctx) => {
		clearScheduledRefresh();
		activeCtx = ctx;
		await refresh(ctx);
	});

	pi.on("agent_start", async (_event, ctx) => {
		clearScheduledRefresh();
		activeCtx = ctx;
	});

	pi.on("agent_end", async () => {
		clearScheduledRefresh();
	});

	pi.on("turn_end", async (_event, ctx) => {
		activeCtx = ctx;
		scheduleRefresh();
	});

	pi.on("message_end", async (_event, ctx) => {
		activeCtx = ctx;
		scheduleRefresh();
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		activeCtx = ctx;
		const name = event.toolName ?? "";
		if (
			name.includes("paperflow") ||
			name.includes("beads") ||
			name === "bash" ||
			name.startsWith("mcp_pi_paperflow")
		) {
			scheduleRefresh(50);
		}
	});
}
