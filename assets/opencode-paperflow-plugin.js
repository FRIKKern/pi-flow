// pi-flow-paperflow-plugin v1
// Registers OpenCode sessions with paperflow-daemon so grill Submit routes to the terminal.
// Installed by pi-flow on session_start and /pi-flow-setup (never edit — re-run setup to refresh).

const DAEMON_URL = process.env.PAPERFLOW_DAEMON_URL || "http://localhost:8767";
const registered = new Set();

async function resolveCmuxSurface($) {
  const fromEnv =
    process.env.CMUX_SURFACE_REF ||
    process.env.CMUX_SURFACE_ID ||
    process.env.CMUX_SURFACE ||
    "";
  if (fromEnv) return fromEnv;
  try {
    const result = await $`cmux identify --json`.quiet().nothrow();
    if (result.exitCode !== 0) return "";
    const parsed = JSON.parse(result.stdout.toString());
    return parsed?.caller?.surface_ref || "";
  } catch {
    return "";
  }
}

async function registerSession(sessionID, $) {
  if (!sessionID || registered.has(sessionID)) return;
  registered.add(sessionID);

  const cmuxWorkspace =
    process.env.CMUX_WORKSPACE_ID || process.env.CMUX_WORKSPACE || null;
  const cmuxSurface = await resolveCmuxSurface($);

  const body = {
    session_id: `opencode-${sessionID}`,
    agent: "opencode",
    cmux_workspace: cmuxWorkspace,
    cmux_surface: cmuxSurface || null,
    tty: null,
    pid: typeof process.pid === "number" ? process.pid : null,
  };

  try {
    const response = await fetch(`${DAEMON_URL}/sessions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      registered.delete(sessionID);
    }
  } catch {
    registered.delete(sessionID);
  }
}

/** @type {import("@opencode-ai/plugin").Plugin} */
export const PiFlowPaperflow = async (ctx) => {
  const $ = ctx.$;
  return {
    async event({ event }) {
      const e = event;
      if (e?.type === "session.created") {
        const sessionID = e.properties?.sessionID ?? e.properties?.id;
        if (sessionID) await registerSession(sessionID, $);
      }
    },
  };
};

export default PiFlowPaperflow;
