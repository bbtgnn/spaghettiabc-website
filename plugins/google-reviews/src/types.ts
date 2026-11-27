export type StoredReview = {
	/** GBP resource name: accounts/.../locations/.../reviews/... */
	name: string;
	reviewId: string;
	accountId: string;
	locationId: string;
	rating: number;
	/** Display / edited text used on homepage and featured. */
	text: string;
	/** Last-synced Google/mock comment; never overwritten by admin edits. */
	originalText: string;
	/** True when `text` differs from `originalText`. */
	textEdited?: boolean;
	createTime?: string;
	updateTime?: string;
	authorName: string;
	authorPhotoUri?: string;
	/** Optional public Maps / profile URL for the business (not per-review). */
	mapsUri?: string;
	featured: boolean;
	syncedAt: string;
};

export type LocationSummary = {
	accountId: string;
	locationId: string;
	rating?: number;
	userRatingCount?: number;
	googleMapsUri?: string;
};

export type SyncMeta = {
	lastSyncAt?: string;
	lastSyncError?: string | null;
	place?: LocationSummary | null;
	reviewCount?: number;
	/** `mock` when Dev mock sync was used; `live` for Business Profile API. */
	source?: "live" | "mock";
};

export type FeaturedResponse = {
	place: LocationSummary | null;
	reviews: StoredReview[];
};

export type ListResponse = {
	place: LocationSummary | null;
	meta: SyncMeta;
	reviews: StoredReview[];
	configured: {
		devMockSync: boolean;
		hasClientId: boolean;
		hasClientSecret: boolean;
		hasRefreshToken: boolean;
		accountId: string | null;
		locationId: string | null;
		mapsUri: string | null;
	};
};

export function reviewStorageId(googleName: string): string {
	return googleName.replace(/\//g, "__");
}

export function normalizeAccountId(raw: string): string {
	return raw.trim().replace(/^accounts\//, "");
}

export function normalizeLocationId(raw: string): string {
	const trimmed = raw.trim();
	const match = trimmed.match(/locations\/([^/]+)$/);
	if (match) return match[1]!;
	return trimmed.replace(/^locations\//, "");
}

export function locationParent(accountId: string, locationId: string): string {
	return `accounts/${normalizeAccountId(accountId)}/locations/${normalizeLocationId(locationId)}`;
}

const STAR_RATING: Record<string, number> = {
	ONE: 1,
	TWO: 2,
	THREE: 3,
	FOUR: 4,
	FIVE: 5,
};

export function starRatingToNumber(starRating: string | undefined): number {
	if (!starRating) return 0;
	return STAR_RATING[starRating] ?? 0;
}

/** Settings forms may persist booleans as strings/numbers. */
export function isTruthySetting(value: unknown): boolean {
	return value === true || value === "true" || value === 1 || value === "1";
}
