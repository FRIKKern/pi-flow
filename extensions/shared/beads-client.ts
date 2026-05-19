import { resolveBdCommand } from "./deps.ts";
import { runCommand } from "./exec.ts";
import { readActiveGoalContext } from "./paperflow-client.ts";
import { resolvePackageRoot } from "./package-root.ts";

const packageRoot = resolvePackageRoot(import.meta.url);

async function runBd(
	args: string[],
	cwd = process.cwd(),
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
	const { cmd, argsPrefix } = resolveBdCommand(packageRoot);
	const result = await runCommand(cmd, [...argsPrefix, ...args], { cwd, timeout: 60_000 });
	if (!result.ok) {
		const hint = result.error.includes("ENOENT")
			? "bd not found — run /pi-flow-setup or: npm install -g @beads/bd"
			: result.error;
		return { ok: false, error: hint };
	}
	return { ok: true, stdout: result.stdout };
}

export async function bdReady(
	cwd = process.cwd(),
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
	const ctx = readActiveGoalContext(cwd);
	const args = ["ready", "--json"];
	if (ctx?.goalId) args.push("--label", `goal-${ctx.goalId}`);
	return runBd(args, cwd);
}

export async function bdShow(
	id: string,
	cwd = process.cwd(),
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
	return runBd(["show", id, "--json"], cwd);
}

export async function bdEnsureRepo(
	cwd = process.cwd(),
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
	return runBd(["init"], cwd);
}
