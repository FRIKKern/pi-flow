import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resolvePackageRoot } from "./package-root.ts";
import { commandExists, runCommand } from "./exec.ts";
import { checkPaperflowHost, ensurePaperflowHost } from "./host-manager.ts";
import { cmuxDetectJson, isInCmux } from "./paperflow-client.ts";

const PLUGIN_MARKER = "pi-flow-paperflow-plugin v1";
const PLUGIN_FILE = "pi-flow-paperflow.js";
const CMUX_PLUGIN = "opencode-cmux";

export interface OpenCodeIntegrationStatus {
	opencodeOnPath: boolean;
	configPath: string;
	pluginInstalled: boolean;
	cmuxPluginInConfig: boolean;
	paperflowPluginInConfig: boolean;
	cmuxHooksAttempted: boolean;
	cmuxHooksOk: boolean;
	hostRunning: boolean;
	serveRunning: boolean;
	servePort: number | null;
	detail: string;
}

function openCodeConfigDir(): string {
	return (
		process.env.OPENCODE_CONFIG_DIR ||
		path.join(os.homedir(), ".config", "opencode")
	);
}

function openCodeConfigPath(): string {
	return path.join(openCodeConfigDir(), "opencode.json");
}

function readJsonFile(filePath: string): Record<string, unknown> {
	if (!fs.existsSync(filePath)) return {};
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function mergePluginList(existing: unknown, additions: string[]): string[] {
	const list = Array.isArray(existing)
		? existing.filter((e): e is string => typeof e === "string")
		: [];
	for (const name of additions) {
		if (!list.includes(name)) list.push(name);
	}
	return list;
}

/** Merge pi-flow OpenCode defaults without clobbering user config. */
export function applyOpenCodeConfig(): { path: string; changed: boolean } {
	const configPath = openCodeConfigPath();
	const existing = readJsonFile(configPath);

	const pluginPath = path.join(openCodeConfigDir(), "plugins", PLUGIN_FILE);
	const localPluginRef = `./plugins/${PLUGIN_FILE}`;

	const plugins = mergePluginList(existing.plugin, [CMUX_PLUGIN, localPluginRef]);

	const piFlowBlock =
		existing.piFlow && typeof existing.piFlow === "object" && !Array.isArray(existing.piFlow)
			? (existing.piFlow as Record<string, unknown>)
			: {};

	const merged: Record<string, unknown> = {
		...existing,
		plugin: plugins,
		piFlow: {
			...piFlowBlock,
			paperflow: true,
			registerOnSessionCreate: true,
		},
	};

	const changed = JSON.stringify(existing) !== JSON.stringify(merged);
	if (changed) writeJsonFile(configPath, merged);
	return { path: configPath, changed };
}

export function installOpenCodePaperflowPlugin(packageRoot?: string): {
	ok: boolean;
	path: string;
	updated: boolean;
} {
	const root = packageRoot ?? resolvePackageRoot(import.meta.url);
	const source = path.join(root, "assets", "opencode-paperflow-plugin.js");
	const destDir = path.join(openCodeConfigDir(), "plugins");
	const dest = path.join(destDir, PLUGIN_FILE);

	if (!fs.existsSync(source)) {
		return { ok: false, path: dest, updated: false };
	}

	fs.mkdirSync(destDir, { recursive: true });
	const sourceText = fs.readFileSync(source, "utf8");
	let updated = true;
	if (fs.existsSync(dest)) {
		const current = fs.readFileSync(dest, "utf8");
		updated = !current.includes(PLUGIN_MARKER) || current !== sourceText;
	}
	if (updated) fs.writeFileSync(dest, sourceText, "utf8");
	return { ok: true, path: dest, updated };
}

/** Best-effort: cmux app CLI installs feed/session plugins into OpenCode config dir. */
export async function ensureCmuxOpenCodeHooks(): Promise<{ ok: boolean; detail: string }> {
	if (!commandExists("cmux") || !commandExists("opencode")) {
		return { ok: false, detail: "cmux or opencode not on PATH" };
	}

	for (const args of [
		["hooks", "opencode", "install", "-y"],
		["hooks", "opencode", "install", "--yes"],
		["hooks", "opencode", "install"],
		["hooks", "setup"],
	]) {
		const result = await runCommand("cmux", args, { timeout: 60_000 });
		if (result.ok) return { ok: true, detail: `cmux ${args.join(" ")}` };
		if (result.error.includes("Unknown command")) {
			return {
				ok: false,
				detail: "cmux hooks not available — update cmux app / CLI",
			};
		}
	}

	return { ok: false, detail: "cmux hooks install failed" };
}

export function shouldAutoEnsureOpenCodeServe(): boolean {
	if (process.env.PI_FLOW_OPENCODE_SERVE === "0") return false;
	return (
		process.env.PI_FLOW_OPENCODE_SERVE === "1" ||
		process.env.PI_FLOW_OPENCODE_SERVE === "auto" ||
		resolveServePort() !== null
	);
}

function resolveServePort(): number | null {
	const raw =
		process.env.PI_FLOW_OPENCODE_PORT ??
		process.env.OPENCODE_PORT ??
		process.env.OPENCODE_SERVE_PORT;
	if (!raw?.trim()) return null;
	const port = Number.parseInt(raw, 10);
	return Number.isFinite(port) && port > 0 ? port : null;
}

async function checkServe(port: number): Promise<boolean> {
	try {
		const response = await fetch(`http://127.0.0.1:${port}/global/config`, {
			signal: AbortSignal.timeout(1500),
		});
		if (!response.ok) return false;
		const text = await response.text();
		return text.includes("$schema") || text.includes("opencode");
	} catch {
		return false;
	}
}

/** Start headless OpenCode server when PI_FLOW_OPENCODE_SERVE=1 or port env is set. */
export async function ensureOpenCodeServe(): Promise<{
	ok: boolean;
	port: number | null;
	detail: string;
}> {
	if (process.env.PI_FLOW_OPENCODE_SERVE === "0") {
		return { ok: true, port: null, detail: "serve disabled (PI_FLOW_OPENCODE_SERVE=0)" };
	}

	const port = resolveServePort();
	const auto =
		process.env.PI_FLOW_OPENCODE_SERVE === "1" ||
		process.env.PI_FLOW_OPENCODE_SERVE === "auto";
	if (!port && !auto) {
		return { ok: true, port: null, detail: "serve not configured (set OPENCODE_PORT or PI_FLOW_OPENCODE_SERVE=1)" };
	}

	const listenPort = port ?? 4096;
	if (await checkServe(listenPort)) {
		return { ok: true, port: listenPort, detail: `already listening on :${listenPort}` };
	}

	if (!commandExists("opencode")) {
		return { ok: false, port: listenPort, detail: "opencode not on PATH" };
	}

	const logDir = path.join(os.homedir(), ".paperflow", "logs");
	fs.mkdirSync(logDir, { recursive: true });
	const logFile = path.join(logDir, "pi-flow-opencode-serve.log");

	const logFd = fs.openSync(logFile, "a");
	const child = spawn("opencode", ["serve", "--port", String(listenPort)], {
		detached: true,
		stdio: ["ignore", logFd, logFd],
		env: process.env,
	});
	child.unref();

	await sleep(1500);
	const up = await checkServe(listenPort);
	return {
		ok: up,
		port: listenPort,
		detail: up ? `started on :${listenPort}` : `failed to start (see ${logFile})`,
	};
}

export async function ensureOpenCodeIntegration(options?: {
	packageRoot?: string;
	ensureHost?: boolean;
	ensureServe?: boolean;
	ensureCmuxHooks?: boolean;
}): Promise<OpenCodeIntegrationStatus> {
	const packageRoot = options?.packageRoot ?? resolvePackageRoot(import.meta.url);
	const opencodeOnPath = commandExists("opencode");

	let hostRunning = false;
	if (options?.ensureHost !== false) {
		const host = await ensurePaperflowHost();
		hostRunning = host.running;
	} else {
		const host = await checkPaperflowHost();
		hostRunning = host.running;
	}

	let pluginInstalled = false;
	let configPath = openCodeConfigPath();
	let cmuxPluginInConfig = false;
	let paperflowPluginInConfig = false;

	if (opencodeOnPath) {
		const installed = installOpenCodePaperflowPlugin(packageRoot);
		pluginInstalled = installed.ok;
		const cfg = applyOpenCodeConfig();
		configPath = cfg.path;
		const parsed = readJsonFile(configPath);
		const plugins = Array.isArray(parsed.plugin) ? parsed.plugin : [];
		cmuxPluginInConfig = plugins.includes(CMUX_PLUGIN);
		paperflowPluginInConfig = plugins.some(
			(p) => typeof p === "string" && p.includes(PLUGIN_FILE),
		);
	}

	let cmuxHooksAttempted = false;
	let cmuxHooksOk = false;
	const cmux = await cmuxDetectJson();
	if (
		options?.ensureCmuxHooks !== false &&
		opencodeOnPath &&
		isInCmux(cmux) &&
		commandExists("cmux")
	) {
		cmuxHooksAttempted = true;
		const hooks = await ensureCmuxOpenCodeHooks();
		cmuxHooksOk = hooks.ok;
	}

	let serveRunning = false;
	let servePort: number | null = null;
	let serveDetail = "";
	if (options?.ensureServe !== false && opencodeOnPath) {
		const serve = await ensureOpenCodeServe();
		servePort = serve.port;
		serveDetail = serve.detail;
		if (serve.port) {
			serveRunning = await checkServe(serve.port);
		}
	}

	const parts = [
		opencodeOnPath ? "opencode on PATH" : "opencode not installed (optional)",
		hostRunning ? "paperflow host up" : "paperflow host down — grill needs host",
		pluginInstalled ? "paperflow plugin installed" : "paperflow plugin skip",
		cmuxHooksAttempted
			? cmuxHooksOk
				? "cmux hooks ok"
				: "cmux hooks skipped/failed"
			: null,
		servePort ? (serveRunning ? `serve :${servePort}` : `serve failed (${serveDetail})`) : null,
	].filter(Boolean);

	return {
		opencodeOnPath,
		configPath,
		pluginInstalled,
		cmuxPluginInConfig,
		paperflowPluginInConfig,
		cmuxHooksAttempted,
		cmuxHooksOk,
		hostRunning,
		serveRunning,
		servePort,
		detail: parts.join(" · "),
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
