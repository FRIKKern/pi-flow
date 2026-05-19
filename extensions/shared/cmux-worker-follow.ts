import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Mirror a child session into a cmux worker terminal (boss layout: surfaces after boss). */
export async function mirrorSessionToCmuxWorker(
	sessionFile: string,
	workerIndex = 0,
): Promise<{ ok: boolean; detail: string }> {
	const workspace = process.env.CMUX_WORKSPACE_ID?.trim();
	if (!workspace) {
		return { ok: false, detail: "not in cmux (CMUX_WORKSPACE_ID unset)" };
	}

	const partial = sessionFile.replace(/\.jsonl$/, "").split("/").pop() ?? sessionFile;
	const cmd = `pi --resume -r ${partial}\n`;

	try {
		const { stdout } = await execFileAsync(
			"cmux",
			["list-panels", "--workspace", workspace],
			{ timeout: 5000, env: process.env },
		);
		const surfaces: string[] = [];
		for (const line of stdout.split("\n")) {
			const m = line.match(/surface:(\S+)/);
			if (m?.[1]) surfaces.push(`surface:${m[1]}`);
		}
		const bossSurface =
			process.env.CMUX_SURFACE_REF ?? process.env.CMUX_SURFACE_ID ?? "";
		const workers = surfaces.filter((s) => s !== bossSurface && !s.includes(bossSurface));
		const target = workers[workerIndex];
		if (!target) {
			return {
				ok: false,
				detail: `no worker surface at index ${workerIndex} (found ${workers.length} workers)`,
			};
		}

		await execFileAsync(
			"cmux",
			["send", "--workspace", workspace, "--surface", target, cmd],
			{ timeout: 5000, env: process.env },
		);
		return { ok: true, detail: `mirrored to ${target}` };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, detail: message.slice(0, 200) };
	}
}
