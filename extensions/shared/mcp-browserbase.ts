import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resolvePackageRoot } from "./package-root.ts";

export type BrowserbaseMcpMode = "hosted" | "stdio";

export interface ApplyBrowserbaseMcpResult {
	path: string;
	created: boolean;
	merged: boolean;
	mode: BrowserbaseMcpMode;
	detail: string;
}

function agentMcpPath(): string {
	const base = process.env.PI_CODING_AGENT_DIR?.trim() || path.join(os.homedir(), ".pi", "agent");
	return path.join(base, "mcp.json");
}

function loadJson(filePath: string): Record<string, unknown> {
	if (!fs.existsSync(filePath)) return {};
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function deepMergeMcpServers(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> {
	const out = { ...target };
	const targetServers =
		target.mcpServers && typeof target.mcpServers === "object" && !Array.isArray(target.mcpServers)
			? { ...(target.mcpServers as Record<string, unknown>) }
			: {};
	const sourceServers =
		source.mcpServers && typeof source.mcpServers === "object" && !Array.isArray(source.mcpServers)
			? (source.mcpServers as Record<string, unknown>)
			: {};

	for (const [name, def] of Object.entries(sourceServers)) {
		if (!(name in targetServers)) {
			targetServers[name] = def;
		}
	}

	out.mcpServers = targetServers;
	return out;
}

export function applyBrowserbaseMcp(
	options: { mode?: BrowserbaseMcpMode; packageRoot?: string; force?: boolean } = {},
): ApplyBrowserbaseMcpResult {
	const packageRoot = options.packageRoot ?? resolvePackageRoot(import.meta.url);
	const mode = options.mode ?? "hosted";
	const templateName =
		mode === "stdio" ? "mcp.browserbase.stdio.json" : "mcp.browserbase.json";
	const templatePath = path.join(packageRoot, "settings", templateName);
	const mcpPath = agentMcpPath();

	if (!fs.existsSync(templatePath)) {
		return {
			path: mcpPath,
			created: false,
			merged: false,
			mode,
			detail: `template missing: ${templatePath}`,
		};
	}

	const template = loadJson(templatePath);
	const existing = loadJson(mcpPath);
	const created = !fs.existsSync(mcpPath);

	let merged: Record<string, unknown>;
	if (options.force) {
		const servers = {
			...(existing.mcpServers &&
			typeof existing.mcpServers === "object" &&
			!Array.isArray(existing.mcpServers)
				? (existing.mcpServers as Record<string, unknown>)
				: {}),
			...(template.mcpServers as Record<string, unknown>),
		};
		merged = { ...existing, mcpServers: servers };
	} else {
		merged = deepMergeMcpServers(existing, template);
	}

	fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
	fs.writeFileSync(mcpPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

	const hasBrowserbase =
		merged.mcpServers &&
		typeof merged.mcpServers === "object" &&
		!Array.isArray(merged.mcpServers) &&
		"browserbase" in (merged.mcpServers as Record<string, unknown>);

	return {
		path: mcpPath,
		created,
		merged: Boolean(hasBrowserbase),
		mode,
		detail: hasBrowserbase
			? `browserbase MCP (${mode}) in ${mcpPath}`
			: "merge did not add browserbase server",
	};
}
