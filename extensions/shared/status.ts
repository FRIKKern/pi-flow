import type { DoctorCheck } from "./doctor.ts";
import type { PolicyConfig } from "./policy.ts";

export interface PiFlowStatusSnapshot {
	doctor: DoctorCheck[];
	policy: PolicyConfig;
	skills: { lifecycle: number; cmux: boolean };
	modelRoles: Record<string, string>;
	extensions: string[];
}

export function formatPiFlowStatus(snapshot: PiFlowStatusSnapshot): string {
	const lines = ["pi-flow status", ""];

	for (const c of snapshot.doctor) {
		const icon =
			c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : c.status === "warn" ? "!" : "·";
		lines.push(`${icon} ${c.name}: ${c.detail}`);
	}

	lines.push(
		"",
		"── policy ──",
		`destructive shell: ${snapshot.policy.blockDestructiveShell ? "block" : "allow"}`,
		`destructive git: ${snapshot.policy.blockDestructiveGit ? "block" : "allow"}`,
		`redact secrets: ${snapshot.policy.redactSecrets ? "on" : "off"}`,
		"",
		"── skills ──",
		`lifecycle skills: ${snapshot.skills.lifecycle}`,
		`cmux skills: ${snapshot.skills.cmux ? "discovered when in cmux" : "not active"}`,
		"",
		"── model role hints (piFlow.modelRoles) ──",
	);

	for (const [phase, model] of Object.entries(snapshot.modelRoles)) {
		lines.push(`  ${phase}: ${model}`);
	}

	lines.push(
		"",
		"── extensions ──",
		...snapshot.extensions.map((e) => `  · ${e}`),
		"",
		"Commands: /pi-flow-handoff · /pi-flow-doctor · /pi-flow-update",
		"Docs: docs/BEST-PRACTICES.md · docs/EDITING.md",
	);

	return lines.join("\n");
}
