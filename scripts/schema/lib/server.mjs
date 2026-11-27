/**
 * EmDash transport adapter for the schema loop (public APIs only: `emdash/client`).
 *
 * Auth: `EMDASH_TOKEN` (API token / OAuth token) for any URL, or dev-bypass for localhost/127.0.0.1/[::1].
 * Never talks to anything but the `--url` it is given.
 * LoopError / asLoopError live in errors.mjs; CLI harness (parseArgs / run) lives in cli.mjs.
 */
import { EmDashApiError, EmDashClient, createTransport, csrfInterceptor, devBypassInterceptor, tokenInterceptor } from "emdash/client";
import { EXIT, LoopError, asLoopError } from "./errors.mjs";
import { canonicalFromLive, hashSchema } from "./index.mjs";

export { EmDashApiError };

export const isLocalUrl = (url) => {
	try {
		const h = new URL(url).hostname;
		return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
	} catch {
		return false;
	}
};

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
