/**
 * Shared exit codes and LoopError — offline, no EmDash imports.
 *
 * Used by the offline barrel, CLI harness, and HTTP adapters. Duck-types EmDashApiError
 * so offline modules never need `emdash/client`.
 */

/** Exit codes shared by every schema script: 0 ok, 1 check failed, 2 usage, 3 generator STOP, 4 live DRIFT, 5 blocked, 6 remote/API error. */
export const EXIT = { OK: 0, CHECK_FAILED: 1, USAGE: 2, STOP: 3, DRIFT: 4, BLOCKED: 5, REMOTE: 6 };

/** error with an exit code; thrown by the schema scripts and mapped to `process.exit` by `run()` */
export class LoopError extends Error {
	constructor(exit, code, message, details) {
		super(message);
		this.name = "LoopError";
		this.exit = exit;
		this.code = code;
		this.details = details;
	}
}

/** map unknown / API / network errors onto LoopError (used by `run` and by server.connect) */
export const asLoopError = (e, what) => {
	if (e instanceof LoopError) return e;
	// Duck-type EmDashApiError — avoid importing emdash/client in the offline graph
	if (typeof e?.status === "number" && (e.code != null || e.name === "EmDashApiError")) {
		return new LoopError(
			EXIT.REMOTE,
			e.code ?? "API_ERROR",
			`${what}: ${e.status} ${e.code ?? ""} ${e.message}`.replace(/\s+/g, " "),
			{ status: e.status, code: e.code, details: e.details },
		);
	}
	return new LoopError(EXIT.REMOTE, "NETWORK", `${what}: ${e?.cause?.code ?? ""} ${e?.message ?? e}`.replace(/\s+/g, " ").trim());
};
