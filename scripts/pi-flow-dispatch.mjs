#!/usr/bin/env node
import { dispatchToBossSession } from "../extensions/shared/paperflow-dispatch.ts";

const args = process.argv.slice(2);
let workspace = process.env.CMUX_WORKSPACE_ID ?? "";
let sessionId = "";
const messageParts = [];

for (let i = 0; i < args.length; i++) {
	if (args[i] === "--workspace" && args[i + 1]) {
		workspace = args[++i];
		continue;
	}
	if (args[i] === "--session" && args[i + 1]) {
		sessionId = args[++i];
		continue;
	}
	messageParts.push(args[i]);
}

const message = messageParts.join(" ").trim();
if (!message) {
	console.error(
		"usage: pi-flow-dispatch.mjs [--workspace UUID] [--session id] \"<message>\"",
	);
	process.exit(1);
}

const result = await dispatchToBossSession({
	message,
	workspace: workspace || null,
	sessionId: sessionId || null,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
