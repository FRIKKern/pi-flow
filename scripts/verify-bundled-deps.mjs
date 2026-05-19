import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const required = [
	"node_modules/pi-subagents/src/extension/index.ts",
	"node_modules/pi-mcp-adapter/index.ts",
	"node_modules/pi-cursor-provider/index.ts",
];

const missing = required.filter((rel) => !existsSync(join(root, rel)));

if (missing.length > 0) {
	console.warn(
		`pi-flow: missing bundled deps (run npm install):\n${missing.map((m) => `  - ${m}`).join("\n")}`,
	);
}
