/**
 * Runtime policy (oh-my-pi pattern): block dangerous tools, redact secrets.
 */

export interface PolicyConfig {
	blockDestructiveShell: boolean;
	blockDestructiveGit: boolean;
	redactSecrets: boolean;
	preferTrashOverRm: boolean;
}

export const DEFAULT_POLICY: PolicyConfig = {
	blockDestructiveShell: true,
	blockDestructiveGit: true,
	redactSecrets: true,
	preferTrashOverRm: true,
};

export function loadPolicyConfig(settings?: Record<string, unknown>): PolicyConfig {
	const piFlow = settings?.piFlow as Record<string, unknown> | undefined;
	const policy = piFlow?.policy as Partial<PolicyConfig> | undefined;
	return { ...DEFAULT_POLICY, ...policy };
}

export interface ToolCallEvent {
	toolName: string;
	input: Record<string, unknown>;
}

export interface PolicyBlockResult {
	block: true;
	reason: string;
}

export function evaluateToolCall(
	event: ToolCallEvent,
	config: PolicyConfig,
): PolicyBlockResult | undefined {
	if (!config.blockDestructiveShell && !config.blockDestructiveGit) return;

	const cmd = extractShellCommand(event);
	if (!cmd) return;

	if (config.blockDestructiveGit && isDestructiveGit(cmd)) {
		return {
			block: true,
			reason:
				"pi-flow policy: destructive git blocked (force-push, reset --hard). Ask the user explicitly or set PI_FLOW_ALLOW_DESTRUCTIVE=1.",
		};
	}

	if (config.blockDestructiveShell && isDestructiveRm(cmd)) {
		const hint = config.preferTrashOverRm
			? " Use `trash` instead of `rm` (recoverable deletes)."
			: "";
		return {
			block: true,
			reason: `pi-flow policy: destructive rm blocked.${hint}`,
		};
	}

	return undefined;
}

const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
	{ pattern: /(?:api[_-]?key|token|secret|password)\s*[=:]\s*\S+/gi, replacement: "[REDACTED]" },
	{ pattern: /\bsk-[a-zA-Z0-9]{20,}\b/g, replacement: "sk-[REDACTED]" },
	{ pattern: /\bghp_[a-zA-Z0-9]{20,}\b/g, replacement: "ghp_[REDACTED]" },
	{ pattern: /\bBearer\s+[a-zA-Z0-9._-]+/gi, replacement: "Bearer [REDACTED]" },
];

export function redactToolResultContent(
	content: Array<{ type: string; text?: string }>,
	config: PolicyConfig,
): Array<{ type: string; text?: string }> | undefined {
	if (!config.redactSecrets) return;

	let changed = false;
	const out = content.map((chunk) => {
		if (chunk.type !== "text" || !chunk.text) return chunk;
		let text = chunk.text;
		for (const { pattern, replacement } of SECRET_PATTERNS) {
			const next = text.replace(pattern, replacement);
			if (next !== text) {
				text = next;
				changed = true;
			}
		}
		return changed ? { ...chunk, text } : chunk;
	});

	return changed ? out : undefined;
}

function extractShellCommand(event: ToolCallEvent): string | null {
	if (event.toolName !== "bash" && event.toolName !== "shell") return null;
	const raw = event.input.command ?? event.input.cmd ?? event.input.script;
	return typeof raw === "string" ? raw : null;
}

function isDestructiveRm(cmd: string): boolean {
	if (!/\brm\b/.test(cmd)) return false;
	return /\s-rf?\s|\s-r\s+f|\s-f\s+r|--recursive|-rf\b/i.test(cmd) || /\brm\s+-[^\s]*f/.test(cmd);
}

function isDestructiveGit(cmd: string): boolean {
	const normalized = cmd.toLowerCase();
	if (/\bgit\s+push\b/.test(normalized) && /--force|-f\b/.test(normalized)) return true;
	if (/\bgit\s+reset\s+--hard\b/.test(normalized)) return true;
	if (/\bgit\s+clean\s+-[a-z]*f/.test(normalized)) return true;
	return false;
}
