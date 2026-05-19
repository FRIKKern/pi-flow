import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { applyBrowserbaseMcp } from "../shared/mcp-browserbase.ts";
import { resolvePackageRoot } from "../shared/package-root.ts";

const packageRoot = resolvePackageRoot(import.meta.url);
const defaultsPath = path.join(packageRoot, "settings", "defaults.json");

function loadDefaults(): Record<string, unknown> {
	const raw = fs.readFileSync(defaultsPath, "utf8");
	return JSON.parse(raw) as Record<string, unknown>;
}

export const PI_FLOW_DEFAULTS = loadDefaults();

export interface ApplySettingsResult {
	path: string;
	merged: boolean;
	created: boolean;
}

export function applyPiFlowSettings(
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

	const merged = deepMerge(existing, PI_FLOW_DEFAULTS);
	merged.packages = mergePackageList(
		existing.packages,
		(PI_FLOW_DEFAULTS.packages as string[]) ?? ["pi-flow"],
	);
	fs.writeFileSync(settingsPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

	// Non-fatal: add Browserbase MCP if missing (hosted SHTTP)
	try {
		applyBrowserbaseMcp({ packageRoot, mode: "hosted" });
	} catch {
		// ignore
	}

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
