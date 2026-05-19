import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

type SwitchSession = ExtensionCommandContext["switchSession"];

let switchSessionFn: SwitchSession | null = null;

/** Capture switchSession from a slash-command context (valid until reload / stale ctx). */
export function bindSessionActions(ctx: ExtensionCommandContext): void {
	switchSessionFn = (sessionPath, options) => ctx.switchSession(sessionPath, options);
}

export function hasSessionActions(): boolean {
	return switchSessionFn !== null;
}

export async function switchToSessionFile(
	sessionPath: string,
	options?: Parameters<SwitchSession>[1],
): Promise<{ ok: boolean; cancelled: boolean }> {
	if (!switchSessionFn) {
		return { ok: false, cancelled: true };
	}
	const result = await switchSessionFn(sessionPath, options);
	return { ok: !result.cancelled, cancelled: result.cancelled };
}

export function clearSessionActions(): void {
	switchSessionFn = null;
}
