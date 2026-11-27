/**
 * CLI harness for schema scripts: argv parsing and process-exit mapping.
 * EmDash HTTP lives in server.mjs; this module never talks to a server.
 * LoopError / EXIT / asLoopError live in errors.mjs (re-exported here for CLI convenience).
 */
import { EXIT, LoopError, asLoopError } from "./errors.mjs";

export { LoopError, asLoopError };

/**
 * `--flag value` / `--flag=value` / boolean flags.
 * Spec: flag → `"boolean"` | `"string"` | `"string[]"` (`string[]` appends each occurrence);
 * `_`: `"string"` for one optional positional → `out._`. Unknown flags and stray positionals are usage errors.
 */
export function parseArgs(argv, spec, usage) {
	const out = {};
	for (const [k, kind] of Object.entries(spec)) {
		if (kind === "string[]") out[k] = [];
	}
	const bad = (msg) => {
		throw new LoopError(EXIT.USAGE, "USAGE", `${msg}\nusage: ${usage}`);
	};
	for (let i = 0; i < argv.length; i++) {
		let a = argv[i];
		if (!a.startsWith("--")) {
			if (spec._ !== "string") bad(`unexpected argument ${a}`);
			if (out._ !== undefined) bad(`unexpected argument ${a}`);
			out._ = a;
			continue;
		}
		let inline;
		const eq = a.indexOf("=");
		if (eq !== -1) {
			inline = a.slice(eq + 1);
			a = a.slice(0, eq);
		}
		const name = a.slice(2);
		const kind = spec[name];
		if (!kind || name === "_") bad(`unknown option ${a}`);
		if (kind === "boolean") {
			if (inline !== undefined) bad(`${a} does not take a value`);
			out[name] = true;
		} else {
			const v = inline ?? argv[++i];
			if (v === undefined || (inline === undefined && v.startsWith("--"))) bad(`${a} needs a value`);
			if (kind === "string[]") out[name].push(v);
			else out[name] = v;
		}
	}
	return out;
}

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
