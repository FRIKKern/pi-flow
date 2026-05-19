import { execFile } from "node:child_process";
import * as fs from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function commandExists(command: string): boolean {
	if (command.includes("/")) {
		return fs.existsSync(command) && fs.statSync(command).isFile();
	}
	return false;
}

export async function runCommand(
	command: string,
	args: string[],
	options: { timeout?: number; cwd?: string } = {},
): Promise<{ ok: true; stdout: string; stderr: string } | { ok: false; error: string }> {
	try {
		const { stdout, stderr } = await execFileAsync(command, args, {
			env: process.env,
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
