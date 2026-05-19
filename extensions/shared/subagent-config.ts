import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface SubagentExtensionConfig {
	asyncByDefault?: boolean;
	forceTopLevelAsync?: boolean;
	maxSubagentDepth?: number;
	intercomBridge?: { mode?: string; instructionFile?: string };
	control?: Record<string, unknown>;
}

const PI_FLOW_SUBAGENT_DEFAULTS: SubagentExtensionConfig = {
	asyncByDefault: false,
	forceTopLevelAsync: false,
	maxSubagentDepth: 1,
	intercomBridge: { mode: "always" },
	control: {
		enabled: true,
		notifyOn: ["active_long_running", "needs_attention"],
		notifyChannels: ["event", "async", "intercom"],
		activeNoticeAfterMs: 120_000,
	},
};

export function subagentConfigPath(): string {
	return path.join(os.homedir(), ".pi", "agent", "extensions", "subagent", "config.json");
}

export function applyPiFlowSubagentConfig(): { path: string; merged: boolean } {
	const configPath = subagentConfigPath();
	fs.mkdirSync(path.dirname(configPath), { recursive: true });

	let existing: SubagentExtensionConfig = {};
	if (fs.existsSync(configPath)) {
		try {
			existing = JSON.parse(fs.readFileSync(configPath, "utf8")) as SubagentExtensionConfig;
		} catch {
			existing = {};
		}
	}

	const merged = deepMerge(
		existing as Record<string, unknown>,
		PI_FLOW_SUBAGENT_DEFAULTS as Record<string, unknown>,
	) as SubagentExtensionConfig;

	fs.writeFileSync(configPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
	return { path: configPath, merged: true };
}

function deepMerge(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...target };
	for (const [key, value] of Object.entries(source)) {
		const current = out[key];
		if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			current &&
			typeof current === "object" &&
			!Array.isArray(current)
		) {
			out[key] = deepMerge(
				current as Record<string, unknown>,
				value as Record<string, unknown>,
			);
		} else if (current === undefined) {
			out[key] = value;
		}
	}
	return out;
}
