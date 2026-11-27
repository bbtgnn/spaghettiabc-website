/**
 * Server access for the schema loop (public EmDash APIs only: `emdash/client`).
 *
 * Auth: `EMDASH_TOKEN` (API token / OAuth token) for any URL, or dev-bypass for localhost/127.0.0.1/[::1].
 * Never talks to anything but the `--url` it is given.
 */
import { EmDashApiError, EmDashClient, createTransport, csrfInterceptor, devBypassInterceptor, tokenInterceptor } from "emdash/client";
import { EXIT, canonicalFromLive, hashSchema } from "./index.mjs";

export { EmDashApiError };

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

export const isLocalUrl = (url) => {
	try {
		const h = new URL(url).hostname;
		return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
	} catch {
		return false;
	}
};

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

/** normalise `--url`: http(s) only, no trailing slash, no path */
export function normalizeUrl(raw) {
	let u;
	try {
		u = new URL(raw);
	} catch {
		throw new LoopError(EXIT.USAGE, "USAGE", `invalid --url ${JSON.stringify(raw)}`);
	}
	if (!["http:", "https:"].includes(u.protocol)) throw new LoopError(EXIT.USAGE, "USAGE", `--url must be http(s): ${raw}`);
	return u.origin;
}

const asLoopError = (e, what) => {
	if (e instanceof LoopError) return e;
	if (e instanceof EmDashApiError) return new LoopError(EXIT.REMOTE, e.code ?? "API_ERROR", `${what}: ${e.status} ${e.code ?? ""} ${e.message}`.replace(/\s+/g, " "), { status: e.status, code: e.code, details: e.details });
	return new LoopError(EXIT.REMOTE, "NETWORK", `${what}: ${e?.cause?.code ?? ""} ${e?.message ?? e}`.replace(/\s+/g, " ").trim());
};

/**
 * localhost only: make sure the dev bypass session can be established. When the instance has not been set
 * up yet (`/auth/dev-bypass` answers 409) call `/_emdash/api/setup/dev-bypass?content=0` (admin user, no content).
 */
export async function ensureDevSetup(baseUrl) {
	const probe = async () => {
		const res = await fetch(new URL("/_emdash/api/auth/dev-bypass", baseUrl), { redirect: "manual" });
		await res.text().catch(() => {});
		return res.status;
	};
	if ((await probe()) !== 409) return false;
	const res = await fetch(new URL("/_emdash/api/setup/dev-bypass?content=0", baseUrl), { redirect: "manual" });
	await res.text().catch(() => {});
	if (res.status >= 400) throw new LoopError(EXIT.REMOTE, "DEV_SETUP_FAILED", `dev setup failed: HTTP ${res.status}`);
	return true;
}

/**
 * -> Server { baseUrl, auth, request, client, readLiveSchema, readLive }
 * `request(method, path, body?)` returns `data` of the `{data}` envelope; path is relative to `/_emdash/api`.
 */
export async function connect({ url, token = process.env.EMDASH_TOKEN } = {}) {
	if (!url) throw new LoopError(EXIT.USAGE, "USAGE", "--url is required");
	const baseUrl = normalizeUrl(url);
	const local = isLocalUrl(baseUrl);
	let auth;
	const interceptors = [csrfInterceptor()];
	if (token) {
		auth = "token";
		interceptors.push(tokenInterceptor(token));
	} else if (local) {
		auth = "dev-bypass";
		try {
			await ensureDevSetup(baseUrl);
		} catch (e) {
			throw asLoopError(e, `cannot reach ${baseUrl}`);
		}
		interceptors.push(devBypassInterceptor(baseUrl));
	} else {
		throw new LoopError(EXIT.USAGE, "NO_AUTH", `${baseUrl} is not localhost: set EMDASH_TOKEN (dev bypass is localhost only)`);
	}
	const transport = createTransport({ interceptors });
	const client = new EmDashClient({ baseUrl, ...(token ? { token } : { devBypass: true }) });

	async function raw(method, path, body, headers) {
		const hdrs = { Accept: "application/json", ...headers };
		let payload;
		if (body !== undefined) {
			hdrs["Content-Type"] = "application/json";
			payload = JSON.stringify(body);
		}
		return transport.fetch(new Request(`${baseUrl}/_emdash/api${path}`, { method, headers: hdrs, body: payload }));
	}
	async function request(method, path, body) {
		let res;
		try {
			res = await raw(method, path, body);
		} catch (e) {
			throw asLoopError(e, `${method} ${path}`);
		}
		if (!res.ok) {
			let code = "UNKNOWN_ERROR";
			let message = `HTTP ${res.status}`;
			let details;
			try {
				const json = await res.json();
				code = json.error?.code ?? code;
				message = json.error?.message ?? message;
				details = json.error?.details;
			} catch {
				/* not json */
			}
			throw new EmDashApiError(res.status, code, message, details);
		}
		if (res.status === 204) return undefined;
		const text = await res.text();
		return text ? JSON.parse(text).data : undefined;
	}

	async function readLive() {
		try {
			const list = await client.collections();
			const collections = [];
			for (const c of list) collections.push(await client.collection(c.slug));
			return collections;
		} catch (e) {
			throw asLoopError(e, `reading live schema from ${baseUrl}`);
		}
	}
	async function readLiveSchema() {
		const collections = await readLive();
		const canonical = canonicalFromLive(collections);
		return { collections, canonical, hash: hashSchema(canonical) };
	}
	return { baseUrl, auth, local, request, client, readLive, readLiveSchema };
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
