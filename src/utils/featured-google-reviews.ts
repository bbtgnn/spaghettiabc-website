import {
	getPublicPluginApiRouteHandler,
	type PublicPluginRuntimeLocals,
} from "emdash/plugin-utils";

/** Shape CompactReviewRail / SezioneTour expect for quote cards. */
export type DisplayReview = {
	author: string;
	quote: string;
	rating: number;
	reviewUrl?: string | null;
	avatar?: {
		id: string;
		src?: string;
		alt?: string;
		width?: number;
		height?: number;
	} | null;
	avatarSrc?: string | null;
};

type PluginFeaturedPayload = {
	place: {
		rating?: number;
		userRatingCount?: number;
		googleMapsUri?: string;
	} | null;
	reviews: Array<{
		authorName: string;
		text: string;
		rating: number;
		authorPhotoUri?: string;
		mapsUri?: string;
	}>;
};

type CmsGoogleFields = {
	google_reviews?: Array<{
		author: string;
		quote: string;
		rating: number;
		avatar?: DisplayReview["avatar"];
		review_url?: string | null;
	}> | null;
	google_score?: number | null;
	google_review_count?: number | null;
	google_profile_url?: string | null;
};

export type FeaturedGoogleReviewsResult = {
	reviews: DisplayReview[];
	googleScore: number;
	googleReviewCount: number;
	googleProfileUrl: string | null | undefined;
	/** True when the plugin featured route answered (owns the quote list, even if empty). */
	reviewsFromPlugin: boolean;
};

/**
 * Prefer plugin `featured` when available; CMS `google_reviews` is seed/fallback only.
 */
export async function resolveFeaturedGoogleReviews(
	locals: PublicPluginRuntimeLocals | null | undefined,
	request: Request,
	cms: CmsGoogleFields | null | undefined,
): Promise<FeaturedGoogleReviewsResult> {
	let pluginPlace: PluginFeaturedPayload["place"] = null;
	let pluginReviews: DisplayReview[] = [];
	let reviewsFromPlugin = false;

	const pluginApi = getPublicPluginApiRouteHandler(locals);
	if (pluginApi) {
		const featured = await pluginApi(
			"google-reviews",
			"GET",
			"featured",
			request,
		);
		if (featured.success && featured.data && typeof featured.data === "object") {
			reviewsFromPlugin = true;
			const payload = featured.data as PluginFeaturedPayload;
			pluginPlace = payload.place ?? null;
			pluginReviews = (
				Array.isArray(payload.reviews) ? payload.reviews : []
			).map((review) => ({
				author: review.authorName,
				quote: review.text?.trim() || "",
				rating: Number(review.rating) || 5,
				reviewUrl: review.mapsUri ?? pluginPlace?.googleMapsUri ?? null,
				avatarSrc: review.authorPhotoUri ?? null,
			}));
		}
	}

	const cmsReviews: DisplayReview[] = (cms?.google_reviews ?? []).map(
		(item) => ({
			author: item.author,
			quote: item.quote,
			rating: Number(item.rating) || 5,
			reviewUrl: item.review_url,
			avatar: item.avatar,
		}),
	);

	return {
		reviews: reviewsFromPlugin ? pluginReviews : cmsReviews,
		googleScore:
			(typeof pluginPlace?.rating === "number" ? pluginPlace.rating : null) ??
			(Number(cms?.google_score) || 0),
		googleReviewCount:
			(typeof pluginPlace?.userRatingCount === "number"
				? pluginPlace.userRatingCount
				: null) ?? (Number(cms?.google_review_count) || 0),
		googleProfileUrl:
			pluginPlace?.googleMapsUri ?? cms?.google_profile_url ?? null,
		reviewsFromPlugin,
	};
}
