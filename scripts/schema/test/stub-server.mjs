import http from "node:http";

/**
 * Tiny HTTP stand-in for the EmDash schema API (token auth). `collections` = live-shaped collection objects
 * (array of `EmDashClient.collection(slug)` results). Field mutations are applied to it; content is empty.
 * `opts.mangle(field)` lets a test make the "server" store something different from what was sent.
 */
export async function stubServer(collections, { token = "test-token", mangle = (f) => f, refuse = () => null, content = null } = {}) {
	const state = structuredClone(collections);
	const calls = [];
	const json = (res, status, data) => {
		res.writeHead(status, { "content-type": "application/json" });
		res.end(JSON.stringify(status < 400 ? { data } : { error: data }));
	};
	const server = http.createServer(async (req, res) => {
		const url = new URL(req.url, "http://x");
		let body = "";
		for await (const chunk of req) body += chunk;
		const payload = body ? JSON.parse(body) : undefined;
		calls.push({ method: req.method, path: url.pathname + url.search, body: payload, auth: req.headers.authorization });
		if (req.headers.authorization !== `Bearer ${token}`) return json(res, 401, { code: "NOT_AUTHENTICATED", message: "no" });
		const p = url.pathname.replace("/_emdash/api", "");
		const refusal = refuse(req.method, p, payload);
		if (refusal) return json(res, refusal.status ?? 400, refusal);
		let m;
		if (req.method === "GET" && p === "/schema/collections") return json(res, 200, { items: state.map(({ fields, ...c }) => c) });
		if (req.method === "GET" && (m = /^\/schema\/collections\/([^/]+)$/.exec(p))) {
			const c = state.find((x) => x.slug === m[1]);
			return c ? json(res, 200, { item: c }) : json(res, 404, { code: "COLLECTION_NOT_FOUND", message: "nope" });
		}
		if ((m = /^\/schema\/collections\/([^/]+)\/fields$/.exec(p)) && req.method === "POST") {
			const c = state.find((x) => x.slug === m[1]);
			c.fields.push(mangle({ id: "f", collectionId: c.id, columnType: "TEXT", sortOrder: c.fields.length, ...payload, validation: payload.validation ?? undefined }));
			return json(res, 201, { item: payload });
		}
		if ((m = /^\/schema\/collections\/([^/]+)\/fields\/reorder$/.exec(p)) && req.method === "POST") {
			const c = state.find((x) => x.slug === m[1]);
			c.fields = payload.fieldSlugs.map((s) => c.fields.find((f) => f.slug === s));
			return json(res, 200, {});
		}
		if ((m = /^\/schema\/collections\/([^/]+)\/fields\/([^/]+)$/.exec(p)) && req.method === "DELETE") {
			const c = state.find((x) => x.slug === m[1]);
			c.fields = c.fields.filter((f) => f.slug !== m[2]);
			return json(res, 200, {});
		}
		if (req.method === "GET" && p === "/manifest") return json(res, 200, { contentLocale: { defaultLocale: "en", implicit: true } });
		if (content && p.startsWith("/content/")) {
			try {
				const data = await content.server.request(req.method, p + url.search, payload);
				return data === undefined ? (res.writeHead(204), res.end()) : json(res, 200, data);
			} catch (e) {
				return json(res, e.status ?? 500, { code: e.code ?? "ERR", message: e.message });
			}
		}
		if (req.method === "GET" && /^\/content\/[^/]+(\/trash)?$/.test(p)) return json(res, 200, { items: [] });
		return json(res, 404, { code: "NOT_FOUND", message: `stub: ${req.method} ${p}` });
	});
	await new Promise((r) => server.listen(0, "127.0.0.1", r));
	return {
		url: `http://127.0.0.1:${server.address().port}`,
		token,
		state,
		calls,
		close: () => new Promise((r) => server.close(r)),
	};
}
