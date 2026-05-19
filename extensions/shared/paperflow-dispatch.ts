/**
 * Inject a message into a registered boss Pi session (grill bridge pattern).
 * Used by paperflow_dispatch tool, /pi-flow-dispatch, and scripts/pi-flow-dispatch.sh.
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DAEMON_URL } from "./constants.ts";

const execFileAsync = promisify(execFile);

export interface DiscoveredSession {
	session_id: string;
	cmux_workspace: string | null;
	cmux_surface: string | null;
	tty: string | null;
	started_at?: string;
	heartbeat_age_ms?: number;
	alive?: boolean;
}

export interface DispatchResult {
	ok: boolean;
	session_id?: string;
	result?: string;
	delivered_to?: Record<string, unknown>;
	reason?: string;
}

async function fetchJson<T>(
	path: string,
	init?: RequestInit,
): Promise<{ status: number; body: T }> {
	const response = await fetch(`${DAEMON_URL}${path}`, {
		...init,
		signal: AbortSignal.timeout(8000),
	});
	const body = (await response.json().catch(() => ({}))) as T;
	return { status: response.status, body };
}

export async function discoverSessions(
	workspace?: string | null,
): Promise<DiscoveredSession[]> {
	const qs = workspace ? `?workspace=${encodeURIComponent(workspace)}` : "";
	const { status, body } = await fetchJson<{ sessions?: DiscoveredSession[] }>(
		`/sessions/discover${qs}`,
	);
	if (status !== 200) return [];
	return body.sessions?.filter((s) => s.alive !== false) ?? [];
}

export function pickBossSession(
	sessions: DiscoveredSession[],
	preferSessionId?: string,
): DiscoveredSession | null {
	if (preferSessionId) {
		const exact = sessions.find((s) => s.session_id === preferSessionId);
		if (exact) return exact;
	}
	const withSurface = sessions.filter((s) => s.cmux_surface || s.tty);
	if (withSurface.length === 0) return sessions[0] ?? null;
	// discover is sorted newest-first
	return withSurface[0] ?? null;
}

function dispatchDocNonce(sessionId: string): string {
	const hash = createHash("sha256").update(sessionId).digest("hex").slice(0, 16);
	return `pi-flow-dispatch-${hash}`;
}

export async function registerDispatchDoc(
	sessionId: string,
	docPath: string,
	docNonce?: string,
): Promise<{ ok: boolean; doc_nonce: string; reason?: string }> {
	const nonce = docNonce ?? dispatchDocNonce(sessionId);
	const { status, body } = await fetchJson<{ ok?: boolean; error?: string }>(
		"/docs/register",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				session_id: sessionId,
				doc_path: docPath,
				doc_nonce: nonce,
			}),
		},
	);
	if (status === 200 && body.ok !== false) {
		return { ok: true, doc_nonce: nonce };
	}
	return {
		ok: false,
		doc_nonce: nonce,
		reason: body.error ?? `HTTP ${status}`,
	};
}

export async function dispatchToBossSession(options: {
	message: string;
	workspace?: string | null;
	sessionId?: string | null;
	docPath?: string;
}): Promise<DispatchResult> {
	const { message, workspace, sessionId, docPath } = options;
	const sessions = await discoverSessions(workspace ?? undefined);
	if (sessions.length === 0) {
		return {
			ok: false,
			reason: "no registered sessions — open Pi in cmux (boss pane) and wait for session_start",
		};
	}

	const session = pickBossSession(sessions, sessionId ?? undefined);
	if (!session) {
		return { ok: false, reason: "no session with cmux_surface or tty" };
	}

	const path =
		docPath ??
		`${process.env.HOME ?? ""}/docs/paperflow/plans/pi-flow-dispatch-bridge.html`;
	const reg = await registerDispatchDoc(session.session_id, path);
	if (!reg.ok) {
		return {
			ok: false,
			session_id: session.session_id,
			reason: `doc register failed: ${reg.reason}`,
		};
	}

	const { status, body } = await fetchJson<{
		ok?: boolean;
		result?: string;
		delivered_to?: Record<string, unknown>;
		error?: string;
	}>("/build", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			doc_nonce: reg.doc_nonce,
			message,
		}),
	});

	if (status === 200 && body.ok) {
		return {
			ok: true,
			session_id: session.session_id,
			result: body.result,
			delivered_to: body.delivered_to,
		};
	}

	// Stale pid in registry but surface may still work — direct cmux send.
	if (status === 410 && session.cmux_surface) {
		const direct = await dispatchViaCmuxDirect(session, message);
		if (direct.ok) return direct;
	}

	return {
		ok: false,
		session_id: session.session_id,
		reason: body.error ?? `HTTP ${status}`,
	};
}

async function dispatchViaCmuxDirect(
	session: DiscoveredSession,
	message: string,
): Promise<DispatchResult> {
	const cmux = process.env.CMUX_CLI ?? "cmux";
	try {
		const sendArgs = ["send"];
		if (session.cmux_workspace) sendArgs.push("--workspace", session.cmux_workspace);
		if (session.cmux_surface) sendArgs.push("--surface", session.cmux_surface);
		sendArgs.push(message);
		await execFileAsync(cmux, sendArgs, { timeout: 5000 });
		const keyArgs = ["send-key"];
		if (session.cmux_workspace) keyArgs.push("--workspace", session.cmux_workspace);
		if (session.cmux_surface) keyArgs.push("--surface", session.cmux_surface);
		keyArgs.push("Return");
		await execFileAsync(cmux, keyArgs, { timeout: 5000 });
		return {
			ok: true,
			session_id: session.session_id,
			result: "cmux:direct",
			delivered_to: {
				cmux_workspace: session.cmux_workspace,
				cmux_surface: session.cmux_surface,
			},
		};
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		return { ok: false, session_id: session.session_id, reason };
	}
}
