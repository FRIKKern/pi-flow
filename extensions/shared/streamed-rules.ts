/**
 * TTSR-inspired lifecycle rules: inject a one-shot reminder when assistant output matches a pattern.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePackageRoot } from "./package-root.ts";

export interface StreamedRule {
	id: string;
	pattern: string;
	flags?: string;
	message: string;
	oncePerSession?: boolean;
}

const packageRoot = resolvePackageRoot(import.meta.url);
const bundledRulesPath = path.join(packageRoot, "rules", "streamed-rules.json");

export function loadStreamedRules(cwd: string): StreamedRule[] {
	const paths = [
		path.join(cwd, ".pi-flow", "streamed-rules.json"),
		path.join(cwd, ".paperflow", "streamed-rules.json"),
		bundledRulesPath,
	];

	for (const filePath of paths) {
		if (!fs.existsSync(filePath)) continue;
		try {
			const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
				rules?: StreamedRule[];
			};
			if (Array.isArray(raw.rules) && raw.rules.length > 0) {
				return raw.rules;
			}
		} catch {
			// try next path
		}
	}

	return [];
}

export class StreamedRuleSession {
	private readonly fired = new Set<string>();

	constructor(private readonly rules: StreamedRule[]) {}

	matchAssistantText(text: string): StreamedRule | undefined {
		for (const rule of this.rules) {
			if (rule.oncePerSession !== false && this.fired.has(rule.id)) continue;
			try {
				const re = new RegExp(rule.pattern, rule.flags ?? "i");
				if (!re.test(text)) continue;
				if (rule.oncePerSession !== false) this.fired.add(rule.id);
				return rule;
			} catch {
				// invalid regex — skip
			}
		}
		return undefined;
	}
}

export function extractLastAssistantText(
	entries: Array<{ type: string; role?: string; content?: unknown }>,
): string {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "message" && entry.type !== "assistant") continue;
		if (entry.role && entry.role !== "assistant") continue;
		const text = contentToText(entry.content);
		if (text.trim()) return text;
	}
	return "";
}

function contentToText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((chunk) => {
			if (typeof chunk === "string") return chunk;
			if (chunk && typeof chunk === "object" && "text" in chunk) {
				return String((chunk as { text?: string }).text ?? "");
			}
			return "";
		})
		.join("\n");
}
