import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { DoctorCheck } from "./doctor.ts";
import { buildToolEnv, commandExists, findOnPath, runCommand } from "./exec.ts";
import { resolvePackageRoot } from "./package-root.ts";

export const CMUX_BOSS_LAYOUT = path.join(os.homedir(), ".local", "bin", "cmux-boss-layout");
const ZSH_MARKER = "# pi-flow cmux shell (pf / pif)";

export async function installCmuxShell(packageRoot?: string): Promise<{
	ok: boolean;
	detail: string;
}> {
	const root = packageRoot ?? resolvePackageRoot(import.meta.url);
	const script = path.join(root, "scripts", "install-cmux-shell.sh");
	if (!fs.existsSync(script)) {
		return { ok: false, detail: `missing ${script}` };
	}

	const env = buildToolEnv();
	const result = await runCommand("bash", [script], {
		timeout: 60_000,
		env,
		cwd: root,
	});

	if (result.ok) {
		const lastLine =
			result.stdout.split("\n").filter(Boolean).pop() ?? "installed";
		return { ok: true, detail: lastLine };
	}
	return { ok: false, detail: result.error.slice(0, 300) };
}

export function checkCmuxBossLayout(): DoctorCheck {
	if (fs.existsSync(CMUX_BOSS_LAYOUT)) {
		return {
			name: "cmux-boss-layout (pf / pif)",
			status: "pass",
			detail: CMUX_BOSS_LAYOUT,
		};
	}
	const onPath = findOnPath("cmux-boss-layout");
	if (onPath) {
		return {
			name: "cmux-boss-layout (pf / pif)",
			status: "pass",
			detail: onPath,
		};
	}
	return {
		name: "cmux-boss-layout (pf / pif)",
		status: "warn",
		detail: "not installed — run /pi-flow-setup or scripts/install-cmux-shell.sh",
	};
}

export function checkPfPifAliases(): DoctorCheck {
	const zshrc = path.join(os.homedir(), ".zshrc");
	if (!fs.existsSync(zshrc)) {
		return {
			name: "zsh aliases pf / pif",
			status: "warn",
			detail: "no ~/.zshrc — run install-cmux-shell.sh",
		};
	}
	const content = fs.readFileSync(zshrc, "utf8");
	const hasPf = /^alias pf=/m.test(content);
	const hasPif = /^alias pif=/m.test(content);
	if (hasPf && hasPif) {
		return {
			name: "zsh aliases pf / pif",
			status: "pass",
			detail: hasPif && content.includes("--pi")
				? "pf → cc layout · pif → pi layout"
				: "pf and pif defined in ~/.zshrc",
		};
	}
	if (content.includes(ZSH_MARKER)) {
		return {
			name: "zsh aliases pf / pif",
			status: "warn",
			detail: "pi-flow block present but aliases incomplete — re-run /pi-flow-setup",
		};
	}
	return {
		name: "zsh aliases pf / pif",
		status: "warn",
		detail: "missing — /pi-flow-setup installs pf and pif",
	};
}

export function checkCmuxCli(): DoctorCheck {
	const env = buildToolEnv();
	if (commandExists("cmux", env.PATH)) {
		return {
			name: "cmux CLI",
			status: "pass",
			detail: findOnPath("cmux", env.PATH) ?? "cmux",
		};
	}
	return {
		name: "cmux CLI",
		status: "warn",
		detail: "not on PATH — brew tap manaflow-ai/cmux && brew install --cask cmux",
	};
}
