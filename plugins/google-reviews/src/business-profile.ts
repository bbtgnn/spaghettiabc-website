import type { HttpAccess, LogAccess, SettingsAccess, StorageCollection } from "emdash";
import { createReviewsCatalog, type ReviewsCatalog } from "./reviews-catalog.ts";
import {
	LiveGbpListError,
	resolveReviewsSource,
	type ReviewsSource,
	type ReviewsSourceContext,
} from "./reviews-source.ts";
import type { LocationSummary, StoredReview } from "./types.ts";

export type SyncResult =
	| {
			ok: true;
			place: LocationSummary;
			upserted: number;
			reviews: StoredReview[];
			source: "live" | "mock";
	  }
	| {
			ok: false;
			error: string;
	  };

type SyncDeps = {
	settings: SettingsAccess;
	http: HttpAccess;
	log: LogAccess;
	reviews: StorageCollection<StoredReview>;
	kv: {
		get<T>(key: string): Promise<T | null>;
		set(key: string, value: unknown): Promise<void>;
	};
	/** Optional override (tests); otherwise resolved from settings once. */
	source?: ReviewsSource;
	sourceContext?: ReviewsSourceContext;
	catalog?: ReviewsCatalog;
};

export async function syncGoogleReviews(deps: SyncDeps): Promise<SyncResult> {
	const catalog =
		deps.catalog ??
		createReviewsCatalog({
			reviews: deps.reviews,
			kv: deps.kv,
			log: deps.log,
		});

	let source = deps.source;
	let context = deps.sourceContext;

	if (!source || !context) {
		const resolved = await resolveReviewsSource({
			settings: deps.settings,
			http: deps.http,
			log: deps.log,
		});
		if (!resolved.ok) {
			if (resolved.recordFailure) {
				await catalog.recordSyncFailure(resolved.error, "live");
			}
			return { ok: false, error: resolved.error };
		}
		source = resolved.source;
		context = resolved.context;
	}

	let listed;
	try {
		listed = await source.listAll();
	} catch (err) {
		if (err instanceof LiveGbpListError) {
			deps.log.error("Business Profile reviews.list failed", {
				status: err.status,
				body: err.body,
			});
			const error = `${err.message}. Controlla Account/Location ID, OAuth e accesso API Business Profile.`;
			await catalog.recordSyncFailure(error, "live");
			return { ok: false, error };
		}
		throw err;
	}

	const place: LocationSummary = {
		accountId: context.accountId,
		locationId: context.locationId,
		rating: listed.averageRating,
		userRatingCount: listed.totalReviewCount,
		googleMapsUri: context.mapsUri,
	};

	const persisted = await catalog.replaceFromSync({
		reviews: listed.reviews,
		place,
		mapsUri: context.mapsUri,
		source: source.kind,
		totalReviewCount: listed.totalReviewCount,
	});

	return {
		ok: true,
		place,
		upserted: persisted.upserted,
		reviews: persisted.reviews,
		source: source.kind,
	};
}
