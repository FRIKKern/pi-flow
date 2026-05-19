import { readActiveGoalContext } from "./paperflow-client.ts";
import { runCommand } from "./exec.ts";

export async function runBd(
	args: string[],
	cwd = process.cwd(),
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
	const result = await runCommand("bd", args, { cwd, timeout: 60_000 });
	if (!result.ok) {
		return {
			ok: false,
			error: result.error.includes("ENOENT")
				? "bd not found — install beads: brew install beads"
				: result.error,
		};
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
