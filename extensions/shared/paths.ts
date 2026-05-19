import * as os from "node:os";
import * as path from "node:path";

export function localBin(name: string): string {
	const home = os.homedir();
	return path.join(home, ".local", "bin", name);
}

export const PAPERFLOW_BIN = {
	preflight: () => process.env.PAPERFLOW_PREFLIGHT ?? localBin("paperflow-preflight"),
	doctor: () => process.env.PAPERFLOW_DOCTOR ?? localBin("paperflow-doctor"),
	docVerify: () => process.env.PAPERFLOW_DOC_VERIFY ?? localBin("paperflow-doc-verify"),
	cmuxDetect: () => process.env.PAPERFLOW_CMUX_DETECT ?? localBin("paperflow-cmux-detect"),
	daemonSpawn: () => process.env.PAPERFLOW_DAEMON_SPAWN ?? localBin("paperflow-daemon-spawn"),
	activeScope: () => process.env.PAPERFLOW_ACTIVE_SCOPE ?? localBin("paperflow-active-scope"),
} as const;
