import { execFile } from "node:child_process";
import * as fs from "node:fs";
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

export function resolveNpmCommand(): string {
	const onPath = findOnPath("npm");
	if (onPath) return onPath;
	const nextToNode = path.join(path.dirname(process.execPath), "npm");
	if (fs.existsSync(nextToNode)) return nextToNode;
	return "npm";
}

export async function runCommand(
	command: string,
	args: string[],
	options: { timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<{ ok: true; stdout: string; stderr: string } | { ok: false; error: string }> {
	try {
		const { stdout, stderr } = await execFileAsync(command, args, {
			env: options.env ?? process.env,
			timeout: options.timeout ?? 30_000,
			cwd: options.cwd,
			maxBuffer: 2 * 1024 * 1024,
		});
		return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, error: message };
	}
}
