import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export function loadMergedPiSettings(cwd = process.cwd()): Record<string, unknown> {
	const globalPath = path.join(os.homedir(), ".pi", "agent", "settings.json");
	const projectPath = path.join(cwd, ".pi", "settings.json");

	let merged: Record<string, unknown> = {};
	for (const filePath of [globalPath, projectPath]) {
		if (!fs.existsSync(filePath)) continue;
		try {
			const chunk = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
			merged = deepMerge(merged, chunk);
		} catch {
			// ignore corrupt file
		}
	}
	return merged;
}

export function getPiFlowModelRoleHints(settings: Record<string, unknown>): Record<string, string> {
	const piFlow = settings.piFlow as Record<string, unknown> | undefined;
	const roles = piFlow?.modelRoles as Record<string, { model?: string; thinking?: string }> | undefined;
	if (!roles) {
		return {
			goal: "composer-2.5 (high thinking)",
			plan: "composer-2.5 (high thinking)",
			build: "composer-2.5",
			review: "composer-2.5 (reviewer: high)",
		};
	}

	const out: Record<string, string> = {};
	for (const [phase, cfg] of Object.entries(roles)) {
		const parts = [cfg.model, cfg.thinking ? `thinking=${cfg.thinking}` : null].filter(Boolean);
		out[phase] = parts.join(" · ") || "default";
	}
	return out;
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
