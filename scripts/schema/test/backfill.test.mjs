import assert from "node:assert/strict";
import { test } from "node:test";
import { findBlockers, runBackfill } from "../lib/backfill.mjs";
import { fakeContent } from "./fake-content.mjs";

const COPY = { id: "b1", collection: "tours", from: "group_size", to: "party_size", transform: "copy", locales: "all" };
const MIGRATION = { id: "0002_x", file: "/nonexistent/0002_x.json" };
const run = (fake, b = COPY, opts = {}) => runBackfill(fake.server, MIGRATION, b, { defaultLocale: "en", ...opts });

const fixtures = () =>
	fakeContent("tours", [
		{ id: "pub", data: { title: "P", group_size: "8" } },
		{ id: "edit", data: { title: "E", group_size: "8" }, draft: { title: "E (draft)", group_size: "3" } },
		{ id: "dro", status: "draft", data: { title: "D", group_size: "2" }, live: null },
		{ id: "gone", status: "published", trashed: true, data: { title: "T", group_size: "1" }, live: null },
		{ id: "empty", data: { title: "no source" } },
	]);

test("backfill policy: publish unless a foreign draft is pending; never publish drafts; trashed stay trashed", async () => {
	const f = fixtures();
	const res = await run(f);
	assert.deepEqual(res.errors, []);
	const pub = f.find("pub");
	assert.equal(pub.columns.party_size, "8", "published entry: live column written");
	assert.equal(pub.live.party_size, "8");
	assert.equal(pub.draft, null, "published entry: no leftover draft");
	const edit = f.find("edit");
	assert.equal(edit.status, "published");
	assert.equal(edit.columns.party_size, undefined, "editor draft: live untouched (stage-only)");
	assert.equal(edit.live.party_size, undefined);
	assert.equal(edit.draft.party_size, "3", "editor draft: value derived from the draft");
	assert.equal(edit.draft.title, "E (draft)", "editor draft content preserved");
	const dro = f.find("dro");
	assert.equal(dro.status, "draft", "draft-only entry is never published");
	assert.equal(dro.draft.party_size, "2");
	const gone = f.find("gone");
	assert.equal(gone.trashed, true, "trashed entry is trashed again");
	assert.equal(gone.revisions.at(-1).party_size, "1");
	assert.equal(f.find("empty").draft, null, "nothing to copy: untouched");
	assert.equal(res.byAction["skip:no-source"], 1);
});

test("backfill is idempotent: a second run writes nothing", async () => {
	const f = fixtures();
	await run(f);
	const snap = f.snapshot();
	f.resetLog();
	const res = await run(f);
	assert.equal(f.snapshot(), snap);
	assert.ok(!f.log.some((l) => l.startsWith("PUT") || l.endsWith("/publish") || l.endsWith("/restore")), f.log.join("\n"));
	assert.deepEqual(res.errors, []);
});

test("backfill: a 409 re-reads the entry and retries", async () => {
	const f = fixtures();
	f.conflictOnce("pub");
	const res = await run(f);
	assert.deepEqual(res.errors, []);
	assert.equal(f.find("pub").columns.party_size, "8");
});

test("backfill: a crash leftover draft (equal to live apart from the target) is published, an editor draft is not", async () => {
	const f = fakeContent("tours", [
		{ id: "ours", data: { title: "A", group_size: "8" }, draft: { title: "A", group_size: "8", party_size: "8" } },
	]);
	await run(f);
	const e = f.find("ours");
	assert.equal(e.draft, null);
	assert.equal(e.columns.party_size, "8");
});

test("backfill: locales default only touches the default locale", async () => {
	const f = fakeContent("tours", [
		{ id: "en1", locale: "en", data: { group_size: "8" } },
		{ id: "it1", locale: "it", data: { group_size: "8" } },
	]);
	await run(f, { ...COPY, locales: "default" });
	assert.equal(f.find("en1").columns.party_size, "8");
	assert.equal(f.find("it1").columns.party_size, undefined);
	await run(f, { ...COPY, locales: "all" });
	assert.equal(f.find("it1").columns.party_size, "8");
});

test("backfill: a failing entry is reported, the others still run", async () => {
	const f = fixtures();
	const real = f.server.request;
	f.server.request = async (m, p, b) => {
		if (m === "PUT" && p.includes("/dro")) throw Object.assign(new Error("locked"), { status: 423, code: "LOCKED" });
		return real(m, p, b);
	};
	const res = await run(f);
	assert.equal(res.errors.length, 1);
	assert.equal(res.errors[0].id, "dro");
	assert.equal(f.find("pub").columns.party_size, "8");
});

test("gate: blockers are entries whose newest version has the source but not the target", async () => {
	const f = fixtures();
	let blockers = await findBlockers(f.server, COPY, { defaultLocale: "en" });
	assert.deepEqual(blockers.map((b) => b.id).sort(), ["dro", "edit", "gone", "pub"]);
	assert.equal(blockers.find((b) => b.id === "edit").version, "pending-draft");
	await run(f);
	blockers = await findBlockers(f.server, COPY, { defaultLocale: "en" });
	assert.deepEqual(blockers, [], "after a backfill nothing blocks, although the editor entry's live value stays empty (stage-only)");
});

test("gate: an editor draft that lacks the value blocks even when live has it", async () => {
	const f = fakeContent("tours", [{ id: "e", data: { group_size: "8", party_size: "8" }, draft: { group_size: "3" } }]);
	const blockers = await findBlockers(f.server, COPY, { defaultLocale: "en" });
	assert.equal(blockers.length, 1);
	assert.equal(blockers[0].version, "pending-draft");
});
