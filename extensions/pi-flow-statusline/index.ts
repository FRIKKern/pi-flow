import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	buildStatuslineParts,
	formatStatusline,
} from "../shared/statusline-context.ts";

const STATUS_KEY = "pi-flow";

export default function piFlowStatusline(pi: ExtensionAPI): void {
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	let inFlight = false;

	async function refresh(ctx: ExtensionContext): Promise<void> {
		if (inFlight) return;
		inFlight = true;
		try {
			const sessionId = ctx.sessionManager.getSessionId() ?? null;
			const parts = await buildStatuslineParts(process.cwd(), sessionId);
			const line = formatStatusline(parts);
			ctx.ui.setStatus(STATUS_KEY, line || undefined);
		} catch {
			ctx.ui.setStatus(STATUS_KEY, undefined);
		} finally {
			inFlight = false;
		}
	}

	function scheduleRefresh(ctx: ExtensionContext, delayMs = 150): void {
		if (refreshTimer) clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => {
			refreshTimer = null;
			void refresh(ctx);
		}, delayMs);
	}

	pi.on("session_start", async (_event, ctx) => {
		await refresh(ctx);
	});

	pi.on("turn_end", async (_event, ctx) => {
		scheduleRefresh(ctx);
	});

	pi.on("message_end", async (_event, ctx) => {
		scheduleRefresh(ctx);
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		const name = event.toolName ?? "";
		if (
			name.includes("paperflow") ||
			name.includes("beads") ||
			name === "bash" ||
			name.startsWith("mcp_pi_paperflow")
		) {
			scheduleRefresh(ctx, 50);
		}
	});
}
