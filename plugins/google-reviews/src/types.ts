export type StoredReview = {
	name: string;
	placeId: string;
	rating: number;
	text: string;
	relativePublishTimeDescription?: string;
	publishTime?: string;
	authorName: string;
	authorUri?: string;
	authorPhotoUri?: string;
	googleMapsUri?: string;
	featured: boolean;
	syncedAt: string;
};

export type PlaceSummary = {
	placeId: string;
	displayName?: string;
	rating?: number;
	userRatingCount?: number;
	googleMapsUri?: string;
};

export type SyncMeta = {
	lastSyncAt?: string;
	lastSyncError?: string | null;
	place?: PlaceSummary | null;
	reviewCount?: number;
};

export type FeaturedResponse = {
	place: PlaceSummary | null;
	reviews: StoredReview[];
};

export type ListResponse = {
	place: PlaceSummary | null;
	meta: SyncMeta;
	reviews: StoredReview[];
	configured: {
		hasApiKey: boolean;
		placeId: string | null;
	};
};

export function reviewStorageId(googleName: string): string {
	return googleName.replace(/^places\//, "").replace(/\//g, "__");
}
