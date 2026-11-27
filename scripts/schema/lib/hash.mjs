import { createHash } from "node:crypto";

/** JSON with recursively sorted keys; `undefined` values dropped. Array order is preserved. */
export function stableStringify(value) {
	return JSON.stringify(sortKeys(value));
}

function sortKeys(v) {
	if (Array.isArray(v)) return v.map(sortKeys);
	if (v && typeof v === "object") {
		const out = {};
		for (const k of Object.keys(v).sort()) if (v[k] !== undefined) out[k] = sortKeys(v[k]);
		return out;
	}
	return v;
}

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** sha256 of the stable stringification of a canonical schema. */
export const hashSchema = (canonical) => sha256(stableStringify(canonical));

export const deepEqual = (a, b) => stableStringify(a) === stableStringify(b);
