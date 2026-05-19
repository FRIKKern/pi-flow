import * as fs from "node:fs";
import * as path from "node:path";
import { bdList, bdShow } from "./beads-client.ts";
import { cmuxIdentifyJson, readScopedGoalIds } from "./paperflow-client.ts";

export interface StatuslineParts {
	goalSlug?: string;
	epicId?: string;
	phaseName?: string;
	phaseIndex?: number;
	phaseTotal?: number;
	taskId?: string;
	taskTitle?: string;
	subtaskId?: string;
	subtaskTitle?: string;
	sessionId?: string;
	sessionShort?: string;
	cmuxWorkspace?: string;
	cmuxPane?: string;
	cmuxSurface?: string;
	cmuxSurfaceType?: string;
}

interface BdRecord {
	id?: string;
	title?: string;
	status?: string;
	labels?: string[];
	type?: string;
	parent?: string;
}

function findBeadsRepoRoot(startDir: string): string | null {
	let dir = path.resolve(startDir);
	while (true) {
		if (fs.existsSync(path.join(dir, ".beads"))) {
			return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	// Repo-local .paperflow without .beads (walk again)
	dir = path.resolve(startDir);
	while (true) {
		if (fs.existsSync(path.join(dir, ".paperflow"))) {
			return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function parseBdJson(stdout: string): BdRecord | null {
	try {
		const parsed = JSON.parse(stdout) as BdRecord | BdRecord[];
		if (Array.isArray(parsed)) return parsed[0] ?? null;
		return parsed;
	} catch {
		return null;
	}
}

function parseBdList(stdout: string): BdRecord[] {
	try {
		const parsed = JSON.parse(stdout) as BdRecord[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function labelAfter(labels: string[] | undefined, prefix: string): string | null {
	if (!labels) return null;
	for (const label of labels) {
		if (label.startsWith(prefix)) return label.slice(prefix.length);
	}
	return null;
}

function idDepth(id: string): number {
	return id.split(".").length - 1;
}

function shortSessionId(sessionId: string): string {
	return sessionId.replace(/-/g, "").slice(0, 8);
}

function shortRef(ref: string | undefined): string | undefined {
	if (!ref) return undefined;
	const idx = ref.indexOf(":");
	return idx >= 0 ? ref.slice(idx + 1) : ref;
}

function sanitizeTitle(title: string, max = 22): string {
	const clean = title.replace(/[\u0000-\u001f\u007f]/g, "").trim();
	return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

async function resolveGoalEpic(
	repoRoot: string,
	goalId: string,
): Promise<Pick<StatuslineParts, "goalSlug" | "epicId">> {
	const goalShow = await bdShow(goalId, repoRoot);
	if (!goalShow.ok) return { epicId: goalId };
	const goal = parseBdJson(goalShow.stdout);
	const goalSlug = labelAfter(goal?.labels, "goal-");
	return goalSlug ? { goalSlug, epicId: goalId } : { epicId: goalId };
}

async function resolveBeadsScope(
	repoRoot: string,
	goalId: string,
	phaseId: string,
): Promise<Pick<
	StatuslineParts,
	| "goalSlug"
	| "epicId"
	| "phaseName"
	| "phaseIndex"
	| "phaseTotal"
	| "taskId"
	| "taskTitle"
	| "subtaskId"
	| "subtaskTitle"
>> {
	const goalShow = await bdShow(goalId, repoRoot);
	if (!goalShow.ok) return { epicId: goalId };

	const goal = parseBdJson(goalShow.stdout);
	const goalSlug = labelAfter(goal?.labels, "goal-");
	if (!goalSlug) return { epicId: goalId };

	const phaseShow = await bdShow(phaseId, repoRoot);
	const phase = phaseShow.ok ? parseBdJson(phaseShow.stdout) : null;
	const phaseName = labelAfter(phase?.labels, "phase-");
	if (!phaseName) {
		return { goalSlug, epicId: goalId };
	}

	const parts: StatuslineParts = {
		goalSlug,
		epicId: goalId,
		phaseName,
	};

	const phaseList = await bdList(
		["--label", "kind:phase", "--label", `goal-${goalSlug}`],
		repoRoot,
	);
	if (phaseList.ok) {
		const phases = parseBdList(phaseList.stdout).filter((p) => p.id);
		parts.phaseTotal = phases.length;
		const idx = phases.findIndex((p) => p.id === phaseId);
		if (idx >= 0) parts.phaseIndex = idx + 1;
	}

	const doingList = await bdList(
		[
			"--label",
			`phase-${phaseName}`,
			"--label",
			`goal-${goalSlug}`,
			"--status",
			"doing",
		],
		repoRoot,
	);
	if (!doingList.ok) return parts;

	const doing = parseBdList(doingList.stdout)
		.filter((t) => t.id)
		.sort((a, b) => idDepth(a.id!) - idDepth(b.id!));

	if (doing.length === 0) return parts;

	const rootTask = doing[0]!;
	parts.taskId = rootTask.id;
	if (rootTask.title) parts.taskTitle = sanitizeTitle(rootTask.title);

	const subtask = doing.find(
		(t) => t.id !== rootTask.id && t.id!.startsWith(`${rootTask.id}.`),
	);
	if (subtask?.id) {
		parts.subtaskId = subtask.id;
		if (subtask.title) parts.subtaskTitle = sanitizeTitle(subtask.title);
	}

	return parts;
}

export async function buildStatuslineParts(
	cwd: string,
	sessionId?: string | null,
): Promise<StatuslineParts> {
	const parts: StatuslineParts = {};

	if (sessionId) {
		parts.sessionId = sessionId;
		parts.sessionShort = shortSessionId(sessionId);
	}

	const wsEnv = process.env.CMUX_WORKSPACE_ID?.trim();
	if (wsEnv) parts.cmuxWorkspace = wsEnv;

	const cmux = await cmuxIdentifyJson();
	if (cmux) {
		parts.cmuxWorkspace ??= shortRef(cmux.workspaceRef);
		parts.cmuxPane = shortRef(cmux.paneRef);
		parts.cmuxSurface = shortRef(cmux.surfaceRef);
		parts.cmuxSurfaceType = cmux.surfaceType;
	}

	const scoped = await readScopedGoalIds();
	if (!scoped.goalId && !scoped.phaseId) return parts;

	const repoRoot = findBeadsRepoRoot(cwd);
	if (!repoRoot) {
		if (scoped.goalId) parts.epicId = scoped.goalId;
		else if (scoped.phaseId) parts.taskId = scoped.phaseId;
		return parts;
	}

	let goalId = scoped.goalId;
	let phaseId = scoped.phaseId;

	if (!goalId && phaseId) {
		const phaseShow = await bdShow(phaseId, repoRoot);
		if (phaseShow.ok) {
			const phase = parseBdJson(phaseShow.stdout);
			goalId = phase?.parent?.trim() || null;
		}
	}

	if (!goalId) {
		if (phaseId) parts.taskId = phaseId;
		return parts;
	}

	if (!phaseId) {
		const goalOnly = await resolveGoalEpic(repoRoot, goalId);
		return { ...parts, ...goalOnly };
	}

	const beads = await resolveBeadsScope(repoRoot, goalId, phaseId);
	return { ...parts, ...beads };
}

/** Compact footer line for Pi `ctx.ui.setStatus`. */
export function formatStatusline(parts: StatuslineParts, cols = terminalWidth()): string {
	const sep = " · ";
	const segments: string[] = [];

	if (parts.sessionShort) {
		segments.push(`π:${parts.sessionShort}`);
	}

	const cmuxBits: string[] = [];
	if (parts.cmuxWorkspace) cmuxBits.push(`ws:${parts.cmuxWorkspace}`);
	if (parts.cmuxPane) cmuxBits.push(`pane:${parts.cmuxPane}`);
	else if (parts.cmuxSurface) cmuxBits.push(`surf:${parts.cmuxSurface}`);
	if (parts.cmuxSurfaceType && cols >= 100) cmuxBits.push(parts.cmuxSurfaceType);
	if (cmuxBits.length) segments.push(`cmux ${cmuxBits.join(" ")}`);

	if (parts.goalSlug) {
		segments.push(parts.goalSlug);
	}

	if (parts.epicId && parts.goalSlug) {
		const epicShort = parts.epicId.includes(".")
			? parts.epicId.split(".").pop() ?? parts.epicId
			: parts.epicId;
		segments.push(`epic:${epicShort}`);
	}

	if (parts.phaseName) {
		let phase = `phase:${parts.phaseName}`;
		if (parts.phaseIndex && parts.phaseTotal) {
			phase = `phase ${parts.phaseIndex}/${parts.phaseTotal}:${parts.phaseName}`;
		}
		segments.push(phase);
	}

	if (parts.taskId) {
		let task = `▸ ${parts.taskId}`;
		if (parts.taskTitle && cols >= 80) task += ` ${parts.taskTitle}`;
		segments.push(task);
	}

	if (parts.subtaskId) {
		let sub = `↳ ${parts.subtaskId}`;
		if (parts.subtaskTitle && cols >= 100) sub += ` ${parts.subtaskTitle}`;
		segments.push(sub);
	}

	let line = segments.join(sep);
	if (line.length > cols && cols > 20) {
		line = `${line.slice(0, cols - 1)}…`;
	}
	return line;
}

function terminalWidth(): number {
	const raw = process.env.COLUMNS;
	if (raw) {
		const n = Number.parseInt(raw, 10);
		if (Number.isFinite(n) && n > 20) return n;
	}
	return 120;
}
