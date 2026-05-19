import * as fs from "node:fs";
import * as path from "node:path";
import { ensureBrowseCli } from "./browserbase.ts";
import { installCmuxShell } from "./cmux-shell.ts";
import { commandExists, runCommand } from "./exec.ts";
import { resolvePackageRoot } from "./package-root.ts";

export interface DepInstallResult {
	name: string;
	status: "installed" | "present" | "skipped" | "failed";
	detail: string;
}

export interface EnsureDepsOptions {
	cwd?: string;
	packageRoot?: string;
	installGlobalBd?: boolean;
	initBeads?: boolean;
}

const BD_PACKAGE = "@beads/bd";

/** Resolve bd binary: PATH → pi-flow node_modules → npx fallback */
export function resolveBdCommand(packageRoot?: string): { cmd: string; argsPrefix: string[] } {
	if (commandOnPath("bd")) {
		return { cmd: "bd", argsPrefix: [] };
	}

	const root = packageRoot ?? resolvePackageRoot(import.meta.url);
	const localBd = path.join(root, "node_modules", ".bin", "bd");
	if (fs.existsSync(localBd)) {
		return { cmd: localBd, argsPrefix: [] };
	}

	const localBdJs = path.join(root, "node_modules", "@beads", "bd", "bin", "bd.js");
	if (fs.existsSync(localBdJs)) {
		return { cmd: process.execPath, argsPrefix: [localBdJs] };
	}

	return { cmd: "npx", argsPrefix: ["--yes", BD_PACKAGE] };
}

export async function ensurePiFlowDeps(
	options: EnsureDepsOptions = {},
): Promise<DepInstallResult[]> {
	const cwd = options.cwd ?? process.cwd();
	const packageRoot = options.packageRoot ?? resolvePackageRoot(import.meta.url);
	const results: DepInstallResult[] = [];

	results.push(await ensureBd(packageRoot, options.installGlobalBd !== false));
	results.push(await ensureJq());
	results.push(await ensureBrowse());
	results.push(await ensureCmuxShell(packageRoot));
	results.push(checkGit());

	if (options.initBeads !== false) {
		const beadsDir = path.join(cwd, ".beads");
		if (!fs.existsSync(beadsDir)) {
			const { cmd, argsPrefix } = resolveBdCommand(packageRoot);
			const init = await runCommand(cmd, [...argsPrefix, "init"], { cwd, timeout: 60_000 });
			results.push({
				name: "bd init (project)",
				status: init.ok ? "installed" : "failed",
				detail: init.ok ? beadsDir : init.error,
			});
		} else {
			results.push({
				name: "bd init (project)",
				status: "present",
				detail: ".beads/ exists",
			});
		}
	}

	return results;
}

async function ensureBd(
	packageRoot: string,
	allowGlobalInstall: boolean,
): Promise<DepInstallResult> {
	const resolved = resolveBdCommand(packageRoot);
	const version = await runCommand(resolved.cmd, [...resolved.argsPrefix, "--version"], {
		timeout: 15_000,
	});
	if (version.ok) {
		return {
			name: "beads (bd)",
			status: "present",
			detail: version.stdout.split("\n")[0] ?? "ok",
		};
	}

	if (!allowGlobalInstall) {
		return {
			name: "beads (bd)",
			status: "failed",
			detail: "bd not found — run: npm install -g @beads/bd",
		};
	}

	const globalInstall = await runCommand(
		"npm",
		["install", "-g", `${BD_PACKAGE}@^1`],
		{ timeout: 120_000 },
	);
	if (globalInstall.ok && commandOnPath("bd")) {
		const v2 = await runCommand("bd", ["--version"], { timeout: 10_000 });
		return {
			name: "beads (bd)",
			status: "installed",
			detail: v2.ok ? (v2.stdout.split("\n")[0] ?? "installed globally") : "installed globally",
		};
	}

	// Bundled via pi-flow npm install
	const local = path.join(packageRoot, "node_modules", ".bin", "bd");
	if (fs.existsSync(local)) {
		return {
			name: "beads (bd)",
			status: "present",
			detail: `bundled at ${local}`,
		};
	}

	return {
		name: "beads (bd)",
		status: "failed",
		detail: globalInstall.ok
			? "install finished but bd not on PATH — open a new shell or use bundled copy"
			: globalInstall.error,
	};
}

async function ensureJq(): Promise<DepInstallResult> {
	if (commandOnPath("jq")) {
		const v = await runCommand("jq", ["--version"], { timeout: 5000 });
		return {
			name: "jq",
			status: "present",
			detail: v.ok ? v.stdout.split("\n")[0] ?? "ok" : "ok",
		};
	}

	if (commandOnPath("brew")) {
		const brew = await runCommand("brew", ["install", "jq"], { timeout: 300_000 });
		if (brew.ok && commandOnPath("jq")) {
			return { name: "jq", status: "installed", detail: "via brew" };
		}
	}

	return {
		name: "jq",
		status: "failed",
		detail: "required for paperflow host — brew install jq",
	};
}

async function ensureBrowse(): Promise<DepInstallResult> {
	const result = await ensureBrowseCli();
	return {
		name: "browserbase CLI (browse)",
		status: result.ok ? (result.detail.includes("installed") ? "installed" : "present") : "failed",
		detail: result.detail,
	};
}

async function ensureCmuxShell(packageRoot: string): Promise<DepInstallResult> {
	const result = await installCmuxShell(packageRoot);
	return {
		name: "cmux shell (pf / pif)",
		status: result.ok ? "installed" : "failed",
		detail: result.detail,
	};
}

function checkGit(): DepInstallResult {
	if (commandOnPath("git")) {
		return { name: "git", status: "present", detail: "ok" };
	}
	return { name: "git", status: "failed", detail: "git required" };
}

function commandOnPath(cmd: string): boolean {
	if (cmd.includes("/")) {
		return fs.existsSync(cmd);
	}
	const pathEnv = process.env.PATH ?? "";
	for (const dir of pathEnv.split(path.delimiter)) {
		const full = path.join(dir, cmd);
		try {
			fs.accessSync(full, fs.constants.X_OK);
			return true;
		} catch {
			// continue
		}
	}
	return false;
}

export function formatDepsReport(results: DepInstallResult[]): string {
	const lines = ["pi-flow dependencies", ""];
	for (const r of results) {
		const icon =
			r.status === "present" || r.status === "installed"
				? "✓"
				: r.status === "skipped"
					? "·"
					: "✗";
		lines.push(`${icon} ${r.name}: ${r.detail}`);
	}
	return lines.join("\n");
}
