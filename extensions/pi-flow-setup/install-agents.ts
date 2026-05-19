import * as fs from "node:fs";
import * as path from "node:path";

export interface InstallAgentsOptions {
	sourceDir: string;
	projectDir: string;
	globalAgentsDir: string;
	namespace: string;
	onWarn?: (message: string) => void;
}

export interface InstallAgentsResult {
	projectSymlinks: string[];
	globalWritten: string[];
	globalPruned: string[];
	skipped: string[];
}

/**
 * Prefer project-local agents (`.pi/agents/pi-flow/`) via symlinks.
 * Fall back to copying into `~/.pi/agent/agents/pi-flow.*.md` for global discovery.
 */
export function installPiFlowAgents(
	options: InstallAgentsOptions,
): InstallAgentsResult {
	const { sourceDir, projectDir, globalAgentsDir, namespace, onWarn } = options;
	const prefix = `${namespace}.`;
	const result: InstallAgentsResult = {
		projectSymlinks: [],
		globalWritten: [],
		globalPruned: [],
		skipped: [],
	};

	const sourceFiles = listMarkdownFiles(sourceDir);
	if (sourceFiles.length === 0) return result;

	const projectAgentsDir = path.join(projectDir, ".pi", "agents", namespace);
	const piDir = path.join(projectDir, ".pi");
	if (fs.existsSync(piDir) || looksLikeProject(projectDir)) {
		fs.mkdirSync(projectAgentsDir, { recursive: true });
		for (const sourcePath of sourceFiles) {
			const base = path.basename(sourcePath);
			const linkPath = path.join(projectAgentsDir, base);
			installSymlink(sourcePath, linkPath, onWarn, result, "projectSymlinks");
		}
	}

	fs.mkdirSync(globalAgentsDir, { recursive: true });
	const intendedGlobal = new Set<string>();

	for (const sourcePath of sourceFiles) {
		const targetName = `${prefix}${path.basename(sourcePath)}`;
		const targetPath = path.join(globalAgentsDir, targetName);
		intendedGlobal.add(targetName);

		const sourceContent = fs.readFileSync(sourcePath, "utf8");
		const stats = lstatOrNull(targetPath);

		if (stats !== null && !stats.isFile() && !stats.isSymbolicLink()) {
			onWarn?.(`pi-flow: ${targetPath} exists and is not a file; skipping.`);
			result.skipped.push(targetName);
			continue;
		}

		if (stats?.isFile() && fs.readFileSync(targetPath, "utf8") === sourceContent) {
			continue;
		}

		fs.writeFileSync(targetPath, sourceContent, "utf8");
		result.globalWritten.push(targetName);
	}

	for (const entry of safeReaddir(globalAgentsDir)) {
		if (!entry.startsWith(prefix)) continue;
		if (intendedGlobal.has(entry)) continue;
		fs.unlinkSync(path.join(globalAgentsDir, entry));
		result.globalPruned.push(entry);
	}

	return result;
}

function installSymlink(
	sourcePath: string,
	linkPath: string,
	onWarn: ((message: string) => void) | undefined,
	result: InstallAgentsResult,
	key: "projectSymlinks",
): void {
	const stats = lstatOrNull(linkPath);
	if (stats?.isSymbolicLink()) {
		try {
			if (fs.realpathSync(linkPath) === fs.realpathSync(sourcePath)) return;
		} catch {
			// replace broken symlink
		}
		fs.unlinkSync(linkPath);
	} else if (stats?.isFile()) {
		onWarn?.(`pi-flow: ${linkPath} is a regular file; not overwriting.`);
		result.skipped.push(path.basename(linkPath));
		return;
	} else if (stats !== null) {
		onWarn?.(`pi-flow: ${linkPath} exists; skipping symlink.`);
		result.skipped.push(path.basename(linkPath));
		return;
	}

	fs.symlinkSync(sourcePath, linkPath);
	result[key].push(path.basename(linkPath));
}

function looksLikeProject(dir: string): boolean {
	return (
		fs.existsSync(path.join(dir, ".git")) ||
		fs.existsSync(path.join(dir, "package.json")) ||
		fs.existsSync(path.join(dir, ".paperflow"))
	);
}

function listMarkdownFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
		.map((entry) => path.join(dir, entry.name))
		.sort();
}

function safeReaddir(dir: string): string[] {
	try {
		return fs.readdirSync(dir);
	} catch {
		return [];
	}
}

function lstatOrNull(p: string): fs.Stats | null {
	try {
		return fs.lstatSync(p);
	} catch {
		return null;
	}
}
