import * as fs from "node:fs";
import * as path from "node:path";

export interface SyncAgentsOptions {
	sourceDir: string;
	targetDir: string;
	namespace: string;
	onWarn?: (message: string) => void;
}

export interface SyncAgentsResult {
	written: string[];
	pruned: string[];
	skipped: string[];
}

export function syncBundledAgents(options: SyncAgentsOptions): SyncAgentsResult {
	const { sourceDir, targetDir, namespace, onWarn } = options;
	const prefix = `${namespace}.`;
	const written: string[] = [];
	const pruned: string[] = [];
	const skipped: string[] = [];

	fs.mkdirSync(targetDir, { recursive: true });

	const sourceFiles = listMarkdownFiles(sourceDir);
	const intendedTargets = new Set<string>();

	for (const sourcePath of sourceFiles) {
		const targetName = `${prefix}${path.basename(sourcePath)}`;
		const targetPath = path.join(targetDir, targetName);
		intendedTargets.add(targetName);

		const sourceContent = fs.readFileSync(sourcePath, "utf8");
		const stats = lstatOrNull(targetPath);

		if (stats !== null && !stats.isFile() && !stats.isSymbolicLink()) {
			onWarn?.(`pi-cursor: ${targetPath} exists and is not a file; skipping.`);
			skipped.push(targetName);
			continue;
		}

		if (stats?.isFile() && fs.readFileSync(targetPath, "utf8") === sourceContent) {
			continue;
		}

		fs.writeFileSync(targetPath, sourceContent, "utf8");
		written.push(targetName);
	}

	for (const entry of safeReaddir(targetDir)) {
		if (!entry.startsWith(prefix)) continue;
		if (intendedTargets.has(entry)) continue;
		fs.unlinkSync(path.join(targetDir, entry));
		pruned.push(entry);
	}

	return { written, pruned, skipped };
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
