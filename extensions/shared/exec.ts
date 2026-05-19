import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Find an executable on PATH (or absolute path). */
export function commandExists(command: string, pathEnv = process.env.PATH): boolean {
	if (command.includes("/")) {
		try {
			fs.accessSync(command, fs.constants.X_OK);
			return true;
		} catch {
			return fs.existsSync(command) && fs.statSync(command).isFile();
		}
	}
	const dirs = (pathEnv ?? "").split(path.delimiter).filter(Boolean);
	for (const dir of dirs) {
		const full = path.join(dir, command);
		try {
			fs.accessSync(full, fs.constants.X_OK);
			return true;
		} catch {
			// continue
		}
	}
	return false;
}

export function findOnPath(command: string, pathEnv = process.env.PATH): string | null {
	if (command.includes("/")) {
		return commandExists(command) ? command : null;
	}
	for (const dir of (pathEnv ?? "").split(path.delimiter).filter(Boolean)) {
		const full = path.join(dir, command);
		try {
			fs.accessSync(full, fs.constants.X_OK);
			return full;
		} catch {
			// continue
		}
	}
	return null;
}

/**
 * PATH for child processes from Pi extensions.
 * npm/npx shell scripts use `#!/usr/bin/env node` — node dir must be on PATH.
 */
export function buildToolEnv(
	base: NodeJS.ProcessEnv = process.env,
	extraPaths: string[] = [],
): NodeJS.ProcessEnv {
	const nodeBin = path.dirname(process.execPath);
	const defaults = [
		...extraPaths,
		nodeBin,
		"/opt/homebrew/bin",
		"/usr/local/bin",
		path.join(os.homedir(), "Library", "pnpm"),
		path.join(os.homedir(), ".local", "bin"),
	];
	const existing = (base.PATH ?? "").split(path.delimiter).filter(Boolean);
	const merged = [...new Set([...defaults, ...existing])].filter(Boolean);
	return { ...base, PATH: merged.join(path.delimiter) };
}

/** npm invocation that works when Pi has a minimal PATH (cmux, sandbox). */
export function resolveNpmInvocation(
	env: NodeJS.ProcessEnv = buildToolEnv(),
): { command: string; prefixArgs: string[] } {
	const onPath = findOnPath("npm", env.PATH);
	if (onPath) {
		return { command: onPath, prefixArgs: [] };
	}

	const candidates = [
		path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
		path.join(
			path.dirname(process.execPath),
			"..",
			"lib",
			"node_modules",
			"npm",
			"bin",
			"npm-cli.js",
		),
	];
	for (const npmCli of candidates) {
		if (fs.existsSync(npmCli)) {
			return { command: process.execPath, prefixArgs: [npmCli] };
		}
	}

	return { command: "npm", prefixArgs: [] };
}

export function resolveNpxInvocation(
	env: NodeJS.ProcessEnv = buildToolEnv(),
): { command: string; prefixArgs: string[] } {
	const onPath = findOnPath("npx", env.PATH);
	if (onPath) {
		return { command: onPath, prefixArgs: [] };
	}

	const candidates = [
		path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"),
		path.join(
			path.dirname(process.execPath),
			"..",
			"lib",
			"node_modules",
			"npm",
			"bin",
			"npx-cli.js",
		),
	];
	for (const npxCli of candidates) {
		if (fs.existsSync(npxCli)) {
			return { command: process.execPath, prefixArgs: [npxCli] };
		}
	}

	return { command: "npx", prefixArgs: [] };
}

export async function runNpm(
	args: string[],
	options: { timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ ok: true; stdout: string; stderr: string } | { ok: false; error: string }> {
	const env = options.env ?? buildToolEnv();
	const { command, prefixArgs } = resolveNpmInvocation(env);
	return runCommand(command, [...prefixArgs, ...args], { ...options, env });
}

export async function runCommand(
	command: string,
	args: string[],
	options: { timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ ok: true; stdout: string; stderr: string } | { ok: false; error: string }> {
	try {
		const { stdout, stderr } = await execFileAsync(command, args, {
			env: options.env ?? buildToolEnv(),
			timeout: options.timeout ?? 30_000,
			cwd: options.cwd,
			maxBuffer: 4 * 1024 * 1024,
		});
		return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, error: message };
	}
}
