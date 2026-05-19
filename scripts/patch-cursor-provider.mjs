import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const providerRoot = join(root, "node_modules", "pi-cursor-provider");

const composer25Models = [
	{
		id: "composer-2.5",
		name: "Composer 2.5",
		reasoning: false,
		contextWindow: 200000,
		maxTokens: 64000,
	},
	{
		id: "composer-2.5-fast",
		name: "Composer 2.5 Fast",
		reasoning: false,
		contextWindow: 200000,
		maxTokens: 64000,
	},
];

function patchFallbackModels() {
	const path = join(providerRoot, "cursor-models-raw.json");
	if (!existsSync(path)) return false;

	const models = JSON.parse(readFileSync(path, "utf8"));
	const existingIds = new Set(models.map((model) => model.id));
	const missing = composer25Models.filter((model) => !existingIds.has(model.id));
	if (missing.length === 0) return false;

	const insertAfter = models.findIndex((model) => model.id === "composer-2-fast");
	if (insertAfter >= 0) {
		models.splice(insertAfter + 1, 0, ...missing);
	} else {
		models.push(...missing);
	}

	writeFileSync(path, `${JSON.stringify(models, null, 2)}\n`, "utf8");
	return true;
}

function patchCostTable() {
	const path = join(providerRoot, "index.ts");
	if (!existsSync(path)) return false;

	const source = readFileSync(path, "utf8");
	if (source.includes('"composer-2.5"')) return false;

	const needle = '  "composer-2":              { input: 0.5, output: 2.5, cacheRead: 0.2, cacheWrite: 0 },';
	if (!source.includes(needle)) return false;

	const replacement = `${needle}\n  "composer-2.5":            { input: 0.5, output: 2.5, cacheRead: 0.2, cacheWrite: 0 },`;
	writeFileSync(path, source.replace(needle, replacement), "utf8");
	return true;
}

if (!existsSync(providerRoot)) {
	process.exit(0);
}

const patched = [patchFallbackModels(), patchCostTable()].some(Boolean);
if (patched) {
	console.warn("pi-flow: patched pi-cursor-provider with Composer 2.5 fallback models");
}
