import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** Settings merged by /pi-cursor-setup (global ~/.pi/agent/settings.json). */
export const PI_CURSOR_DEFAULTS = {
	defaultProvider: "cursor",
	defaultModel: "composer-2.5",
	defaultThinkingLevel: "medium",
	enabledModels: ["composer-2.5", "composer-2.5-fast"],
	packages: ["pi-cursor"],
	subagents: {
		agentOverrides: {
			scout: { model: "composer-2.5" },
			researcher: { model: "composer-2.5" },
			worker: { model: "composer-2.5" },
			reviewer: { model: "composer-2.5" },
			oracle: { model: "composer-2.5" },
			planner: { model: "composer-2.5" },
		},
	},
} as const;

export interface ApplySettingsResult {
	path: string;
	merged: boolean;
	created: boolean;
}

export function applyPiCursorSettings(
	scope: "global" | "project" = "global",
	cwd = process.cwd(),
): ApplySettingsResult {
	const settingsPath =
		scope === "project"
			? path.join(cwd, ".pi", "settings.json")
			: path.join(os.homedir(), ".pi", "agent", "settings.json");

	fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

	let existing: Record<string, unknown> = {};
	let created = false;

	if (fs.existsSync(settingsPath)) {
		try {
			existing = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
				string,
				unknown
			>;
		} catch {
			existing = {};
		}
	} else {
		created = true;
	}

	const merged = deepMerge(existing, PI_CURSOR_DEFAULTS as Record<string, unknown>);
	merged.packages = mergePackageList(
		existing.packages,
		PI_CURSOR_DEFAULTS.packages,
	);
	fs.writeFileSync(settingsPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

	return { path: settingsPath, merged: true, created };
}

function mergePackageList(existing: unknown, additions: readonly string[]): string[] {
	const list = Array.isArray(existing)
		? existing.filter((entry): entry is string => typeof entry === "string")
		: [];
	for (const pkg of additions) {
		if (!list.includes(pkg)) list.push(pkg);
	}
	return list;
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
		} else {
			out[key] = value;
		}
	}

	return out;
}
