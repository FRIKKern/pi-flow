import * as path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve pi-flow package root from any extension entry file. */
export function resolvePackageRoot(fromImportMetaUrl: string): string {
	const extensionDir = path.dirname(fileURLToPath(fromImportMetaUrl));
	return path.resolve(extensionDir, "..", "..");
}
