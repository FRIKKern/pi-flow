import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { applyBrowserbaseMcp } from "./mcp-browserbase.ts";
import { resolvePackageRoot } from "./package-root.ts";
import {
	buildToolEnv,
	findOnPath,
	runCommand,
	runNpm,
	resolveNpxInvocation,
} from "./exec.ts";
import type { DoctorCheck } from "./doctor.ts";

export const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
export const PI_AGENT_BIN = path.join(PI_AGENT_DIR, "bin");
export const BROWSERBASE_ENV_FILE = path.join(PI_AGENT_DIR, "browserbase.env");

const BROWSE_PACKAGE = "browse";

export interface BrowseCommand {
	cmd: string;
	argsPrefix: string[];
	env: NodeJS.ProcessEnv;
	source: string;
}

export interface BrowserbaseSetupResult {
	browse: { ok: boolean; detail: string; source?: string };
	mcp: { ok: boolean; detail: string };
	cloud: { ok: boolean; detail: string };
	envFile: { ok: boolean; detail: string };
}

/** Prepend ~/.pi/agent/bin so Pi sessions always find user-local CLIs. */
export function envWithPiAgentBin(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
	fs.mkdirSync(PI_AGENT_BIN, { recursive: true });
	return buildToolEnv(base, [PI_AGENT_BIN]);
}

/** Symlink browse into ~/.pi/agent/bin after npm --prefix install. */
export function linkBrowseIntoAgentBin(): string | null {
	fs.mkdirSync(PI_AGENT_BIN, { recursive: true });
	const dest = path.join(PI_AGENT_BIN, "browse");
	const candidates = [
		path.join(PI_AGENT_DIR, "bin", "browse"),
		path.join(PI_AGENT_DIR, "node_modules", ".bin", "browse"),
	];
	for (const src of candidates) {
		if (!fs.existsSync(src)) continue;
		try {
			if (fs.existsSync(dest)) fs.unlinkSync(dest);
		} catch {
			// ignore
		}
		try {
			fs.symlinkSync(src, dest);
			return dest;
		} catch {
			// copy fallback
			try {
				fs.copyFileSync(src, dest);
				fs.chmodSync(dest, 0o755);
				return dest;
			} catch {
				// continue
			}
		}
	}
	return null;
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

export function browserbaseEnvConfigured(): boolean {
	loadBrowserbaseEnvFile();
	return Boolean(process.env.BROWSERBASE_API_KEY?.trim());
}

export function ensureBrowserbaseEnvFile(packageRoot?: string): { ok: boolean; detail: string } {
	if (fs.existsSync(BROWSERBASE_ENV_FILE)) {
		return { ok: true, detail: BROWSERBASE_ENV_FILE };
	}
	const root = packageRoot ?? resolvePackageRoot(import.meta.url);
	const example = path.join(root, "settings", "browserbase.env.example");
	if (!fs.existsSync(example)) {
		return {
			ok: false,
			detail: `missing ${BROWSERBASE_ENV_FILE} (no template)`,
		};
	}
	fs.mkdirSync(path.dirname(BROWSERBASE_ENV_FILE), { recursive: true });
	fs.copyFileSync(example, BROWSERBASE_ENV_FILE);
	try {
		fs.chmodSync(BROWSERBASE_ENV_FILE, 0o600);
	} catch {
		// ignore
	}
	return {
		ok: true,
		detail: `created ${BROWSERBASE_ENV_FILE} from template — add your API key`,
	};
}

/** Resolve browse: agent bin → PATH → common prefixes → npx. */
export function resolveBrowseCommand(
	env: NodeJS.ProcessEnv = envWithPiAgentBin(),
): BrowseCommand {
	const agentBrowse = path.join(PI_AGENT_BIN, "browse");
	if (fs.existsSync(agentBrowse)) {
		return { cmd: agentBrowse, argsPrefix: [], env, source: agentBrowse };
	}

	const modulesBin = path.join(PI_AGENT_DIR, "node_modules", ".bin", "browse");
	if (fs.existsSync(modulesBin)) {
		return { cmd: modulesBin, argsPrefix: [], env, source: modulesBin };
	}

	const onPath = findOnPath("browse", env.PATH);
	if (onPath) {
		return { cmd: onPath, argsPrefix: [], env, source: onPath };
	}

	for (const candidate of [
		"/usr/local/bin/browse",
		"/opt/homebrew/bin/browse",
		path.join(os.homedir(), ".npm-global", "bin", "browse"),
	]) {
		if (fs.existsSync(candidate)) {
			return { cmd: candidate, argsPrefix: [], env, source: candidate };
		}
	}

	const npx = resolveNpxInvocation(env);
	return {
		cmd: npx.command,
		argsPrefix: [...npx.prefixArgs, "--yes", BROWSE_PACKAGE],
		env,
		source: "npx --yes browse",
	};
}

export async function runBrowseCli(
	args: string[],
	timeout = 30_000,
): Promise<{ ok: true; stdout: string } | { ok: false; error: string; source: string }> {
	const resolved = resolveBrowseCommand();
	const result = await runCommand(resolved.cmd, [...resolved.argsPrefix, ...args], {
		timeout,
		env: resolved.env,
	});
	if (result.ok) {
		return { ok: true, stdout: result.stdout };
	}
	return { ok: false, error: result.error, source: resolved.source };
}

export async function ensureBrowseCli(): Promise<{
	ok: boolean;
	detail: string;
	source?: string;
}> {
	const env = envWithPiAgentBin();
	process.env.PATH = env.PATH;

	const existing = await runBrowseCli(["--version"], 15_000);
	if (existing.ok) {
		return {
			ok: true,
			detail: existing.stdout.split("\n")[0] ?? "ok",
			source: resolveBrowseCommand().source,
		};
	}

	fs.mkdirSync(PI_AGENT_DIR, { recursive: true });

	// Prefer user-writable prefix (Pi often has no node on PATH for npm scripts)
	const localInstall = await runNpm(
		["install", BROWSE_PACKAGE, "--prefix", PI_AGENT_DIR, "--no-fund", "--no-audit"],
		{ timeout: 180_000, env },
	);
	if (localInstall.ok) {
		const linked = linkBrowseIntoAgentBin();
		const afterLocal = await runBrowseCli(["--version"], 15_000);
		if (afterLocal.ok) {
			return {
				ok: true,
				detail: `${afterLocal.stdout.split("\n")[0] ?? "installed"} (${linked ?? PI_AGENT_BIN})`,
				source: linked ?? resolveBrowseCommand().source,
			};
		}
	}

	const globalInstall = await runNpm(
		["install", "-g", BROWSE_PACKAGE, "--no-fund", "--no-audit"],
		{ timeout: 180_000, env },
	);
	if (globalInstall.ok) {
		const afterGlobal = await runBrowseCli(["--version"], 15_000);
		if (afterGlobal.ok) {
			return {
				ok: true,
				detail: afterGlobal.stdout.split("\n")[0] ?? "installed globally",
				source: resolveBrowseCommand().source,
			};
		}
	}

	// npx always works if npm registry is reachable
	const viaNpx = await runBrowseCli(["--version"], 60_000);
	if (viaNpx.ok) {
		return {
			ok: true,
			detail: `${viaNpx.stdout.split("\n")[0] ?? "ok"} (via npx — no global install)`,
			source: "npx --yes browse",
		};
	}

	const hints = [
		localInstall.ok ? "" : `local: ${localInstall.error}`,
		globalInstall.ok ? "" : `global: ${globalInstall.error}`,
		`npx: ${viaNpx.error}`,
	]
		.filter(Boolean)
		.join("; ");

	return {
		ok: false,
		detail: hints.slice(0, 400) || "browse CLI install failed",
	};
}

export async function checkBrowseCli(): Promise<DoctorCheck> {
	loadBrowserbaseEnvFile();
	const env = envWithPiAgentBin();
	const ver = await runCommand(
		resolveBrowseCommand(env).cmd,
		[...resolveBrowseCommand(env).argsPrefix, "--version"],
		{ timeout: 15_000, env },
	);
	if (ver.ok) {
		const src = resolveBrowseCommand(env).source;
		return {
			name: "browserbase CLI (browse)",
			status: "pass",
			detail: `${ver.stdout.split("\n")[0] ?? "ok"} (${src})`,
		};
	}
	return {
		name: "browserbase CLI (browse)",
		status: "warn",
		detail: "not available — /pi-flow-browserbase-setup",
	};
}

export async function checkBrowserbaseCloud(): Promise<DoctorCheck> {
	loadBrowserbaseEnvFile();
	if (!process.env.BROWSERBASE_API_KEY?.trim()) {
		return {
			name: "browserbase API",
			status: "warn",
			detail: `BROWSERBASE_API_KEY unset — edit ${BROWSERBASE_ENV_FILE}`,
		};
	}
	const list = await runBrowseCli(["cloud", "projects", "list"], 30_000);
	return {
		name: "browserbase API",
		status: list.ok ? "pass" : "fail",
		detail: list.ok
			? "browse cloud projects list ok"
			: list.error.slice(0, 200) || "browse cloud projects list failed",
	};
}

export function checkBrowserbaseMcpConfig(): DoctorCheck {
	const mcpPath = path.join(PI_AGENT_DIR, "mcp.json");
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
				detail: "browserbase server missing — /pi-flow-browserbase-setup",
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
			detail: `configured — ${mode}`,
		};
	} catch {
		return {
			name: "browserbase MCP",
			status: "fail",
			detail: "invalid mcp.json",
		};
	}
}

export async function runBrowserbaseSetup(options: {
	mode?: "hosted" | "stdio";
	packageRoot?: string;
	forceMcp?: boolean;
}): Promise<BrowserbaseSetupResult> {
	const packageRoot = options.packageRoot ?? resolvePackageRoot(import.meta.url);
	const mode = options.mode ?? "hosted";

	process.env.PATH = envWithPiAgentBin().PATH;
	loadBrowserbaseEnvFile();

	const envFile = ensureBrowserbaseEnvFile(packageRoot);
	loadBrowserbaseEnvFile();

	const browse = await ensureBrowseCli();
	const mcp = applyBrowserbaseMcp({
		mode,
		packageRoot,
		force: options.forceMcp ?? mode === "stdio",
	});

	let cloudDetail = "skipped — add BROWSERBASE_API_KEY to browserbase.env";
	let cloudOk = false;
	if (browserbaseEnvConfigured()) {
		const cloud = await checkBrowserbaseCloud();
		cloudOk = cloud.status === "pass";
		cloudDetail = cloud.detail;
	} else if (envFile.ok && envFile.detail.includes("created")) {
		cloudDetail = "skipped — new env file needs API key";
	}

	return {
		browse: { ok: browse.ok, detail: browse.detail, source: browse.source },
		mcp: { ok: mcp.merged, detail: mcp.detail },
		cloud: { ok: cloudOk, detail: cloudDetail },
		envFile: { ok: envFile.ok, detail: envFile.detail },
	};
}

export function formatBrowserbaseSetupReport(result: BrowserbaseSetupResult): string {
	const icon = (ok: boolean) => (ok ? "✓" : "!");
	return [
		"pi-flow Browserbase setup",
		"",
		`${icon(result.browse.ok)} CLI (browse): ${result.browse.detail}${
			result.browse.source ? ` · ${result.browse.source}` : ""
		}`,
		`${icon(result.mcp.ok)} MCP: ${result.mcp.detail}`,
		`${icon(result.cloud.ok)} Cloud: ${result.cloud.detail}`,
		`${icon(result.envFile.ok)} Env: ${result.envFile.detail}`,
		"",
		"Pi: mcp({ server: \"browserbase\" }) · /skill:browserbase",
		"/reload after first MCP setup",
	].join("\n");
}
