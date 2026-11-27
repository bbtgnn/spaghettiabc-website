import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { classifyListener, ownershipVerdict } from "../../lib/port-owner.mjs";

/** two sibling "checkouts" under a temp dir; the ownership decision is pure given listener cwds + repo root */
function checkouts() {
	const base = realpathSync(mkdtempSync(path.join(tmpdir(), "port-owner-")));
	const mine = path.join(base, "mine");
	const other = path.join(base, "other");
	mkdirSync(path.join(mine, "src"), { recursive: true });
	mkdirSync(other);
	return { base, mine, other, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

test("classifyListener: cwd equal to / inside the repo root is ours", () => {
	const c = checkouts();
	try {
		assert.equal(classifyListener({ cwds: [c.mine], unknown: false }, c.mine), "ours");
		assert.equal(classifyListener({ cwds: [path.join(c.mine, "src")], unknown: false }, c.mine), "ours");
		assert.equal(classifyListener({ cwds: [c.other, c.mine], unknown: false }, c.mine), "ours");
	} finally {
		c.cleanup();
	}
});

test("classifyListener: other checkout, sibling with shared prefix, or vanished cwd is foreign", () => {
	const c = checkouts();
	try {
		const prefix = path.join(c.base, "mine-2");
		mkdirSync(prefix);
		assert.equal(classifyListener({ cwds: [c.other], unknown: false }, c.mine), "foreign");
		assert.equal(classifyListener({ cwds: [prefix], unknown: false }, c.mine), "foreign");
		assert.equal(classifyListener({ cwds: [path.join(c.base, "gone")], unknown: false }, c.mine), "foreign");
		assert.equal(classifyListener({ cwds: [c.base], unknown: false }, c.mine), "foreign", "parent of the repo is not inside it");
	} finally {
		c.cleanup();
	}
});

test("classifyListener: unknown listener stays unknown", () => {
	assert.equal(classifyListener({ cwds: [], unknown: true }, "/anything"), "unknown");
});

test("ownershipVerdict: ours -> allow; foreign -> refuse naming the other directory and --url", () => {
	const c = checkouts();
	try {
		const ok = ownershipVerdict({ cwds: [c.mine], unknown: false }, c.mine, { port: 4321, explicitUrl: false });
		assert.equal(ok.action, "allow");
		for (const explicitUrl of [false, true]) {
			const v = ownershipVerdict({ cwds: [c.other], unknown: false }, c.mine, { port: 4321, explicitUrl });
			assert.equal(v.action, "refuse", "an explicit --url does not bypass a foreign listener");
			assert.match(v.message, new RegExp(c.other.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
			assert.match(v.message, /--url/);
			assert.match(v.message, /4321/);
		}
	} finally {
		c.cleanup();
	}
});

test("ownershipVerdict: unknown -> refuse on the default URL, warn when --url is explicit", () => {
	const unknown = { cwds: [], unknown: true };
	const byDefault = ownershipVerdict(unknown, "/repo", { port: 4321, explicitUrl: false });
	assert.equal(byDefault.action, "refuse");
	assert.match(byDefault.message, /--url/);
	const explicit = ownershipVerdict(unknown, "/repo", { port: 4999, explicitUrl: true });
	assert.equal(explicit.action, "warn");
	assert.match(explicit.message, /WARNING/);
});
