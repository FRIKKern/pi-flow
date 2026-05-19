/**
 * Durable pi-flow session memory — append-only journal + named agent stores.
 * Lives under <cwd>/.pi-flow/memory/ (never in Pi session JSON alone).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { redactToolResultContent } from "./policy.ts";
import type { PolicyConfig } from "./policy.ts";

export const MEMORY_DIR = "memory";
export const SESSION_DIR = "session";
export const AGENTS_DIR = "agents";

export interface MemoryConfig {
	enabled: boolean;
	recallOnStart: boolean;
	maxRecallChars: number;
	journalMaxPreview: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
	enabled: true,
	recallOnStart: true,
	maxRecallChars: 2400,
	journalMaxPreview: 400,
};

export interface MemoryRegistryEntry {
	slug: string;
	displayName: string;
	builtinAgent?: string;
	aliases: string[];
	createdAt: string;
	updatedAt: string;
	bindings: {
		runIds: string[];
		sessionFiles: string[];
	};
}

export interface MemoryRegistry {
	version: 1;
	agents: Record<string, MemoryRegistryEntry>;
}

export type JournalKind =
	| "session.start"
	| "turn"
	| "tool"
	| "subagent"
	| "command"
	| "name"
	| "note";

export interface JournalLine {
	ts: string;
	kind: JournalKind;
	role?: string;
	agent?: string;
	slug?: string;
	tool?: string;
	summary: string;
	meta?: Record<string, unknown>;
}

export function loadMemoryConfig(settings?: Record<string, unknown>): MemoryConfig {
	const piFlow = settings?.piFlow as Record<string, unknown> | undefined;
	const mem = piFlow?.memory as Partial<MemoryConfig> | undefined;
	return {
		...DEFAULT_MEMORY_CONFIG,
		...mem,
	};
}

export function memoryRoot(cwd: string): string {
	return path.join(cwd, ".pi-flow", MEMORY_DIR);
}

export function sessionJournalPath(cwd: string): string {
	return path.join(memoryRoot(cwd), SESSION_DIR, "journal.jsonl");
}

export function sessionSummaryPath(cwd: string): string {
	return path.join(memoryRoot(cwd), SESSION_DIR, "SUMMARY.md");
}

export function registryPath(cwd: string): string {
	return path.join(memoryRoot(cwd), "registry.json");
}

export function agentDir(cwd: string, slug: string): string {
	return path.join(memoryRoot(cwd), AGENTS_DIR, slug);
}

export function agentMemoryPath(cwd: string, slug: string): string {
	return path.join(agentDir(cwd, slug), "MEMORY.md");
}

export function agentJournalPath(cwd: string, slug: string): string {
	return path.join(agentDir(cwd, slug), "journal.jsonl");
}

export function slugifyName(input: string): string {
	const base = input
		.trim()
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return base.slice(0, 64) || `agent-${Date.now()}`;
}

function ensureDir(dir: string): void {
	fs.mkdirSync(dir, { recursive: true });
}

function nowIso(): string {
	return new Date().toISOString();
}

function appendJsonl(file: string, line: JournalLine): void {
	ensureDir(path.dirname(file));
	fs.appendFileSync(file, `${JSON.stringify(line)}\n`, "utf8");
}

export function appendSessionJournal(cwd: string, line: Omit<JournalLine, "ts">): void {
	appendJsonl(sessionJournalPath(cwd), { ...line, ts: nowIso() });
}

export function appendAgentJournal(
	cwd: string,
	slug: string,
	line: Omit<JournalLine, "ts">,
): void {
	appendJsonl(agentJournalPath(cwd, slug), { ...line, ts: nowIso() });
}

export function loadRegistry(cwd: string): MemoryRegistry {
	const file = registryPath(cwd);
	if (!fs.existsSync(file)) {
		return { version: 1, agents: {} };
	}
	try {
		const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as MemoryRegistry;
		return {
			version: 1,
			agents: parsed.agents ?? {},
		};
	} catch {
		return { version: 1, agents: {} };
	}
}

export function saveRegistry(cwd: string, registry: MemoryRegistry): void {
	ensureDir(path.dirname(registryPath(cwd)));
	fs.writeFileSync(registryPath(cwd), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function resolveAgentSlug(
	registry: MemoryRegistry,
	query: string,
): MemoryRegistryEntry | undefined {
	const q = query.trim().toLowerCase();
	if (!q) return undefined;
	if (registry.agents[q]) return registry.agents[q];
	for (const entry of Object.values(registry.agents)) {
		if (entry.slug === q) return entry;
		if (entry.displayName.toLowerCase() === q) return entry;
		if (entry.aliases.some((a) => a.toLowerCase() === q)) return entry;
	}
	return undefined;
}

export interface RegisterNamedAgentOptions {
	slug: string;
	displayName?: string;
	builtinAgent?: string;
	runId?: string;
	sessionFile?: string;
}

export function registerNamedAgent(
	cwd: string,
	options: RegisterNamedAgentOptions,
): MemoryRegistryEntry {
	const registry = loadRegistry(cwd);
	const slug = slugifyName(options.slug);
	const existing = registry.agents[slug];
	const now = nowIso();

	const entry: MemoryRegistryEntry = existing ?? {
		slug,
		displayName: options.displayName?.trim() || slug,
		builtinAgent: options.builtinAgent,
		aliases: [],
		createdAt: now,
		updatedAt: now,
		bindings: { runIds: [], sessionFiles: [] },
	};

	if (options.displayName?.trim()) entry.displayName = options.displayName.trim();
	if (options.builtinAgent) entry.builtinAgent = options.builtinAgent;
	if (!entry.aliases.includes(slug)) entry.aliases.push(slug);
	if (options.runId && !entry.bindings.runIds.includes(options.runId)) {
		entry.bindings.runIds.push(options.runId);
	}
	if (options.sessionFile && !entry.bindings.sessionFiles.includes(options.sessionFile)) {
		entry.bindings.sessionFiles.push(options.sessionFile);
	}
	entry.updatedAt = now;

	registry.agents[slug] = entry;
	saveRegistry(cwd, registry);

	const dir = agentDir(cwd, slug);
	ensureDir(dir);
	const memFile = agentMemoryPath(cwd, slug);
	if (!fs.existsSync(memFile)) {
		fs.writeFileSync(
			memFile,
			`# ${entry.displayName}\n\n_Created ${now}. Chronicler and /pf-name append here._\n`,
			"utf8",
		);
	}

	appendSessionJournal(cwd, {
		kind: "name",
		slug,
		agent: entry.builtinAgent,
		summary: `Registered named agent "${entry.displayName}" (${slug})`,
		meta: { runId: options.runId, sessionFile: options.sessionFile },
	});
	appendAgentJournal(cwd, slug, {
		kind: "name",
		summary: `Named identity registered`,
		meta: { displayName: entry.displayName, builtinAgent: entry.builtinAgent },
	});

	return entry;
}

export function tailJsonl(file: string, maxLines: number): JournalLine[] {
	if (!fs.existsSync(file)) return [];
	try {
		const lines = fs
			.readFileSync(file, "utf8")
			.split("\n")
			.filter((l) => l.trim());
		const out: JournalLine[] = [];
		for (const line of lines.slice(-maxLines)) {
			try {
				out.push(JSON.parse(line) as JournalLine);
			} catch {
				// skip corrupt line
			}
		}
		return out;
	} catch {
		return [];
	}
}

export function truncate(text: string, max: number): string {
	const t = text.replace(/\s+/g, " ").trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

export function messageToSummary(message: {
	role?: string;
	content?: unknown;
}, maxChars: number): string {
	const role = message.role ?? "unknown";
	if (typeof message.content === "string") {
		return truncate(`[${role}] ${message.content}`, maxChars);
	}
	if (!Array.isArray(message.content)) return `[${role}] (empty)`;
	const parts: string[] = [];
	for (const block of message.content) {
		if (!block || typeof block !== "object") continue;
		const b = block as { type?: string; text?: string };
		if (b.type === "text" && b.text) parts.push(b.text);
	}
	return truncate(`[${role}] ${parts.join(" ")}`, maxChars);
}

export function toolArgsSummary(toolName: string, args: unknown, maxChars: number): string {
	if (!args || typeof args !== "object") return toolName;
	const a = args as Record<string, unknown>;
	if (toolName === "subagent") {
		const agent = a.agent ?? a.tasks?.[0]?.agent ?? "subagent";
		const task =
			typeof a.task === "string"
				? a.task
				: typeof a.tasks?.[0]?.task === "string"
					? a.tasks[0].task
					: "";
		return truncate(`subagent(${agent}): ${task}`, maxChars);
	}
	if (typeof a.command === "string") return truncate(`${toolName}: ${a.command}`, maxChars);
	if (typeof a.path === "string") return truncate(`${toolName}: ${a.path}`, maxChars);
	return truncate(`${toolName}(${JSON.stringify(a).slice(0, 120)})`, maxChars);
}

export function redactSummary(text: string, policy: PolicyConfig): string {
	const redacted = redactToolResultContent([{ type: "text", text }], policy);
	if (!redacted) return text;
	const block = redacted[0];
	return block?.type === "text" && block.text ? block.text : text;
}

export function formatMemoryStatus(cwd: string): string {
	const journal = sessionJournalPath(cwd);
	const reg = loadRegistry(cwd);
	const lines = tailJsonl(journal, 5000);
	const today = new Date().toISOString().slice(0, 10);
	const todayCount = lines.filter((l) => l.ts.startsWith(today)).length;
	const named = Object.keys(reg.agents);
	const summaryExists = fs.existsSync(sessionSummaryPath(cwd));

	return [
		`Memory: ${memoryRoot(cwd)}`,
		`Session journal: ${lines.length} entries (${todayCount} today)`,
		`SUMMARY.md: ${summaryExists ? "yes" : "not yet — run /pf-chronicler"}`,
		`Named agents (${named.length}): ${named.slice(0, 8).join(", ") || "(none — /pf-name <slug>)"}`,
	].join("\n");
}

export function buildRecallBlock(cwd: string, query?: string, maxChars = 2400): string {
	const parts: string[] = ["[pi-flow memory recall]"];

	const summaryPath = sessionSummaryPath(cwd);
	if (fs.existsSync(summaryPath)) {
		const summary = fs.readFileSync(summaryPath, "utf8").trim();
		if (summary) {
			parts.push("", "## Session summary", truncate(summary, Math.floor(maxChars * 0.4)));
		}
	}

	const recent = tailJsonl(sessionJournalPath(cwd), 12);
	if (recent.length > 0) {
		parts.push("", "## Recent session");
		for (const line of recent.slice(-8)) {
			parts.push(`- ${line.ts.slice(0, 19)} · ${line.kind}: ${line.summary}`);
		}
	}

	if (query?.trim()) {
		const reg = loadRegistry(cwd);
		const entry = resolveAgentSlug(reg, query);
		if (entry) {
			const memPath = agentMemoryPath(cwd, entry.slug);
			if (fs.existsSync(memPath)) {
				parts.push("", `## Named agent: ${entry.displayName} (${entry.slug})`);
				parts.push(truncate(fs.readFileSync(memPath, "utf8"), Math.floor(maxChars * 0.35)));
			}
			const agentJournal = tailJsonl(agentJournalPath(cwd, entry.slug), 6);
			if (agentJournal.length > 0) {
				parts.push("", "### Agent journal (latest)");
				for (const line of agentJournal.slice(-4)) {
					parts.push(`- ${line.summary}`);
				}
			}
		}
	}

	let block = parts.join("\n");
	if (block.length > maxChars) block = `${block.slice(0, maxChars - 1)}…`;
	return block;
}

export function buildChroniclerTask(cwd: string, focus?: string): string {
	const journal = tailJsonl(sessionJournalPath(cwd), 80);
	const reg = loadRegistry(cwd);
	const slugs = Object.keys(reg.agents);
	const journalExcerpt = journal
		.slice(-40)
		.map((l) => `${l.ts} [${l.kind}] ${l.summary}`)
		.join("\n");

	return [
		"You are pi-flow.chronicler. Compress recent activity into durable markdown memory.",
		"",
		`Workspace memory root: ${memoryRoot(cwd)}`,
		"",
		"## Write / update",
		`1. ${sessionSummaryPath(cwd)} — rolling session narrative (decisions, blockers, next steps)`,
		slugs.length
			? `2. Per-agent MEMORY.md under ${path.join(memoryRoot(cwd), AGENTS_DIR)}/<slug>/ for: ${slugs.join(", ")}`
			: "2. (no named agents yet)",
		"",
		"## Rules",
		"- Read-only on source code; only write under .pi-flow/memory/",
		"- Preserve facts, URLs, run IDs, file paths; drop tool noise",
		"- Append `# YYYY-MM-DD` dated sections; merge duplicates",
		"- Do not delete journal.jsonl files",
		"",
		focus?.trim() ? `## Focus\n${focus.trim()}\n` : "",
		"## Recent journal (raw)",
		journalExcerpt || "(empty)",
	].join("\n");
}
