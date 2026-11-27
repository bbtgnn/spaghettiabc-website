/**
 * CLI harness for schema scripts: argv parsing, LoopError, and process-exit mapping.
 * EmDash HTTP lives in server.mjs; this module never talks to a server.
 */
import { EmDashApiError } from "emdash/client";
import { EXIT } from "./index.mjs";

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

/** `--flag value` / `--flag=value` / boolean flags. Unknown flags and stray positionals are usage errors. */
export function parseArgs(argv, spec, usage) {
	const out = {};
	const bad = (msg) => {
		throw new LoopError(EXIT.USAGE, "USAGE", `${msg}\nusage: ${usage}`);
	};
	for (let i = 0; i < argv.length; i++) {
		let a = argv[i];
		if (!a.startsWith("--")) bad(`unexpected argument ${a}`);
		let inline;
		const eq = a.indexOf("=");
		if (eq !== -1) {
			inline = a.slice(eq + 1);
			a = a.slice(0, eq);
		}
		const name = a.slice(2);
		const kind = spec[name];
		if (!kind) bad(`unknown option ${a}`);
		if (kind === "boolean") {
			if (inline !== undefined) bad(`${a} does not take a value`);
			out[name] = true;
		} else {
			const v = inline ?? argv[++i];
			if (v === undefined || (inline === undefined && v.startsWith("--"))) bad(`${a} needs a value`);
			out[name] = v;
		}
	}
	return out;
}

/** map unknown / API / network errors onto LoopError (used by `run` and by server.connect) */
export const asLoopError = (e, what) => {
	if (e instanceof LoopError) return e;
	if (e instanceof EmDashApiError) return new LoopError(EXIT.REMOTE, e.code ?? "API_ERROR", `${what}: ${e.status} ${e.code ?? ""} ${e.message}`.replace(/\s+/g, " "), { status: e.status, code: e.code, details: e.details });
	return new LoopError(EXIT.REMOTE, "NETWORK", `${what}: ${e?.cause?.code ?? ""} ${e?.message ?? e}`.replace(/\s+/g, " ").trim());
};

/** run an async main, mapping LoopError / unexpected errors to exit codes; flushes stdout first */
export async function run(main) {
	let code = EXIT.OK;
	try {
		code = (await main()) ?? EXIT.OK;
	} catch (e) {
		if (e instanceof LoopError) {
			console.error(`${e.code}: ${e.message}`);
			if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: false, exit: e.exit, error: { code: e.code, message: e.message } }, null, 2));
			if (e.details && process.env.SCHEMA_DEBUG) console.error(JSON.stringify(e.details, null, 2));
			code = e.exit;
		} else {
			const le = asLoopError(e, "unexpected error");
			console.error(e?.stack ?? le.message);
			if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: false, exit: EXIT.REMOTE, error: { code: le.code, message: le.message } }, null, 2));
			code = EXIT.REMOTE;
		}
	}
	process.exitCode = code;
}
