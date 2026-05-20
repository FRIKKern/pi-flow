import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 19)) {
	console.warn(
		`pi-flow: Node ${process.versions.node} detected — @earendil-works/pi-coding-agent 0.75.x requires >=22.19.0`,
	);
}

const required = [
	"node_modules/pi-subagents/src/extension/index.ts",
	"node_modules/pi-mcp-adapter/index.ts",
	"node_modules/@beads/bd/bin/bd.js",
];

const optional = ["node_modules/pi-cursor-provider/index.ts"];

const missing = required.filter((rel) => !existsSync(join(root, rel)));

if (missing.length > 0) {
	console.warn(
		`pi-flow: missing required deps (run npm install):\n${missing.map((m) => `  - ${m}`).join("\n")}`,
	);
}

for (const rel of optional) {
	if (!existsSync(join(root, rel))) {
		console.warn(
			`pi-flow: optional ${rel.replace("node_modules/", "")} not installed — use /login with another provider or npm install pi-cursor-provider`,
		);
	}
}
