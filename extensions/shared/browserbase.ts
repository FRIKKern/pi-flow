import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { commandExists, runCommand } from "./exec.ts";
import type { DoctorCheck } from "./doctor.ts";

export const BROWSERBASE_ENV_FILE = path.join(
	os.homedir(),
	".pi",
	"agent",
	"browserbase.env",
);

export function browserbaseEnvConfigured(): boolean {
	return Boolean(
		process.env.BROWSERBASE_API_KEY?.trim() ||
			process.env.BROWSERBASE_PROJECT_ID?.trim(),
	);
}

export function loadBrowserbaseEnvFile(): void {
	if (!fs.existsSync(BROWSERBASE_ENV_FILE)) return;
	const raw = fs.readFileSync(BROWSERBASE_ENV_FILE, "utf8");
	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq <= 0) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (key && process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

export async function checkBrowseCli(): Promise<DoctorCheck> {
	if (!commandExists("browse")) {
		return {
			name: "browserbase CLI (browse)",
			status: "warn",
			detail: "not on PATH — npm install -g browse (or /pi-flow-browserbase-setup)",
		};
	}
	const ver = await runCommand("browse", ["--version"], { timeout: 15_000 });
	return {
		name: "browserbase CLI (browse)",
		status: ver.ok ? "pass" : "warn",
		detail: ver.ok ? (ver.stdout.split("\n")[0] ?? "ok") : ver.error,
	};
}

export async function checkBrowserbaseCloud(): Promise<DoctorCheck> {
	loadBrowserbaseEnvFile();
	if (!process.env.BROWSERBASE_API_KEY?.trim()) {
		return {
			name: "browserbase API",
			status: "warn",
			detail: `BROWSERBASE_API_KEY unset — add to shell or ${BROWSERBASE_ENV_FILE}`,
		};
	}
	if (!commandExists("browse")) {
		return {
			name: "browserbase API",
			status: "skip",
			detail: "API key set; install browse CLI to verify (browse cloud projects list)",
		};
	}
	const list = await runCommand("browse", ["cloud", "projects", "list"], {
		timeout: 30_000,
	});
	return {
		name: "browserbase API",
		status: list.ok ? "pass" : "fail",
		detail: list.ok
			? "browse cloud projects list ok"
			: list.error.slice(0, 200) || "browse cloud projects list failed",
	};
}

export function checkBrowserbaseMcpConfig(): DoctorCheck {
	const base =
		process.env.PI_CODING_AGENT_DIR?.trim() || path.join(os.homedir(), ".pi", "agent");
	const mcpPath = path.join(base, "mcp.json");
	if (!fs.existsSync(mcpPath)) {
		return {
			name: "browserbase MCP",
			status: "warn",
			detail: "no ~/.pi/agent/mcp.json — run /pi-flow-browserbase-setup",
		};
	}
	try {
		const parsed = JSON.parse(fs.readFileSync(mcpPath, "utf8")) as {
			mcpServers?: Record<string, unknown>;
		};
		const bb = parsed.mcpServers?.browserbase;
		if (!bb || typeof bb !== "object") {
			return {
				name: "browserbase MCP",
				status: "warn",
				detail: "browserbase server missing in mcp.json — run /pi-flow-browserbase-setup",
			};
		}
		const def = bb as Record<string, unknown>;
		const mode =
			typeof def.url === "string"
				? "hosted (SHTTP)"
				: def.command
					? "stdio (npx)"
					: "unknown";
		return {
			name: "browserbase MCP",
			status: "pass",
			detail: `configured — ${mode}; use mcp({ server: "browserbase" }) in Pi`,
		};
	} catch {
		return {
			name: "browserbase MCP",
			status: "fail",
			detail: "invalid mcp.json",
		};
	}
}

export async function ensureBrowseCli(): Promise<{
	ok: boolean;
	detail: string;
}> {
	if (commandExists("browse")) {
		const ver = await runCommand("browse", ["--version"], { timeout: 15_000 });
		return {
			ok: true,
			detail: ver.ok ? (ver.stdout.split("\n")[0] ?? "present") : "present",
		};
	}
	const install = await runCommand("npm", ["install", "-g", "browse"], {
		timeout: 180_000,
	});
	if (install.ok && commandExists("browse")) {
		return { ok: true, detail: "installed globally via npm" };
	}
	return {
		ok: false,
		detail: install.error || "npm install -g browse failed",
	};
}
