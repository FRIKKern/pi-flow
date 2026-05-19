import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

/** Set by pi-subagents on child Pi processes (`runs/shared/pi-args.ts`). */
export const PI_SUBAGENT_CHILD_ENV = "PI_SUBAGENT_CHILD";

/** Boss-only extensions (statusline, progress rescue) must not run in child sessions. */
export function isPiSubagentChildSession(): boolean {
	return process.env[PI_SUBAGENT_CHILD_ENV] === "1";
}

export function isStaleExtensionCtx(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.includes("extension ctx is stale");
}

/** Never let a stale captured ctx crash the Pi process (parallel subagents fork sessions). */
export function safeExtensionUi(
	ctx: ExtensionContext,
	fn: (ui: ExtensionContext["ui"]) => void,
): void {
	try {
		fn(ctx.ui);
	} catch (err) {
		if (!isStaleExtensionCtx(err)) throw err;
	}
}
