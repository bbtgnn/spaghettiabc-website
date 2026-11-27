import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HttpAccess, LogAccess, SettingsAccess } from "emdash";
import {
	MOCK_ACCOUNT_ID,
	MOCK_LOCATION_ID,
	MOCK_TOTAL_REVIEW_COUNT,
} from "./mock-data.ts";
import {
	createMockReviewsSource,
	resolveReviewsSource,
} from "./reviews-source.ts";

function settings(map: Record<string, unknown>): SettingsAccess {
	return {
		get: async <T>(key: string) => (map[key] as T | undefined) ?? null,
		set: async () => {},
	} as SettingsAccess;
}

const silentLog = {
	info() {},
	warn() {},
	error() {},
	debug() {},
} as unknown as LogAccess;

const unusedHttp = {
	fetch: async () => {
		throw new Error("http should not be called");
	},
} as unknown as HttpAccess;

describe("createMockReviewsSource", () => {
	it("lists fixture reviews with aggregate counts", async () => {
		const source = createMockReviewsSource();
		assert.equal(source.kind, "mock");
		const listed = await source.listAll();
		assert.ok(listed.reviews.length >= 10);
		assert.equal(listed.totalReviewCount, MOCK_TOTAL_REVIEW_COUNT);
		assert.ok(listed.averageRating > 0);
	});
});

describe("resolveReviewsSource", () => {
	it("selects mock adapter when devMockSync is set", async () => {
		const resolved = await resolveReviewsSource({
			settings: settings({
				devMockSync: true,
				mapsUri: "https://maps.example/custom",
			}),
			http: unusedHttp,
			log: silentLog,
		});
		assert.equal(resolved.ok, true);
		if (!resolved.ok) return;
		assert.equal(resolved.source.kind, "mock");
		assert.equal(resolved.context.accountId, MOCK_ACCOUNT_ID);
		assert.equal(resolved.context.locationId, MOCK_LOCATION_ID);
		assert.equal(resolved.context.mapsUri, "https://maps.example/custom");
	});

	it("fails without recording when live credentials are missing", async () => {
		const resolved = await resolveReviewsSource({
			settings: settings({ devMockSync: false }),
			http: unusedHttp,
			log: silentLog,
		});
		assert.equal(resolved.ok, false);
		if (resolved.ok) return;
		assert.match(resolved.error, /OAuth Client ID/);
		assert.equal(resolved.recordFailure, undefined);
	});
});
