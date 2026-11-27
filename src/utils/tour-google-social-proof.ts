import {
	getPublicPluginApiRouteHandler,
	type PublicPluginRuntimeLocals,
} from "emdash/plugin-utils";

/** Single review view-model for Sezione Tour / CompactReviewRail. */
export type TourGoogleReview = {
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
	/** External photo URL from plugin sync (Google author avatar). */
	avatarSrc?: string | null;
};

/**
 * Everything Sezione Tour needs for Recensioni Google + Punteggio Google.
 * Plugin `featured` when available; CMS `google_*` only as internal fallback.
 */
export type TourGoogleSocialProof = {
	score: number;
	reviewCount: number;
	profileUrl: string | null;
	reviews: TourGoogleReview[];
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

type CmsGoogleFallback = {
	google_reviews?: Array<{
		author: string;
		quote: string;
		rating: number;
		avatar?: TourGoogleReview["avatar"];
		review_url?: string | null;
	}> | null;
	google_score?: number | null;
	google_review_count?: number | null;
	google_profile_url?: string | null;
};

function fromCms(cms: CmsGoogleFallback | null | undefined): TourGoogleSocialProof {
	return {
		score: Number(cms?.google_score) || 0,
		reviewCount: Number(cms?.google_review_count) || 0,
		profileUrl: cms?.google_profile_url ?? null,
		reviews: (cms?.google_reviews ?? []).map((item) => ({
			author: item.author,
			quote: item.quote,
			rating: Number(item.rating) || 5,
			reviewUrl: item.review_url,
			avatar: item.avatar,
		})),
	};
}

function fromPlugin(
	payload: PluginFeaturedPayload,
	cms: TourGoogleSocialProof,
): TourGoogleSocialProof {
	const place = payload.place ?? null;
	const profileUrl = place?.googleMapsUri ?? null;

	return {
		// Plugin owns the quote list when the route answers (even if empty).
		// Place metrics fall back to CMS only when missing.
		score:
			(typeof place?.rating === "number" ? place.rating : null) ?? cms.score,
		reviewCount:
			(typeof place?.userRatingCount === "number"
				? place.userRatingCount
				: null) ?? cms.reviewCount,
		profileUrl: profileUrl ?? cms.profileUrl,
		reviews: (Array.isArray(payload.reviews) ? payload.reviews : []).map(
			(review) => ({
				author: review.authorName,
				quote: review.text?.trim() || "",
				rating: Number(review.rating) || 5,
				reviewUrl: review.mapsUri ?? profileUrl,
				avatarSrc: review.authorPhotoUri ?? null,
			}),
		),
	};
}

/**
 * Resolve Tour Google social proof for the current request.
 * Callers pass CMS homepage fields as fallback only — they must not branch on
 * plugin vs CMS themselves (ADR-0008).
 */
export async function getTourGoogleSocialProof(
	locals: PublicPluginRuntimeLocals | null | undefined,
	request: Request,
	cmsFallback?: CmsGoogleFallback | null,
): Promise<TourGoogleSocialProof> {
	const cms = fromCms(cmsFallback);
	const pluginApi = getPublicPluginApiRouteHandler(locals);
	if (!pluginApi) return cms;

	const featured = await pluginApi("google-reviews", "GET", "featured", request);
	if (!featured.success || !featured.data || typeof featured.data !== "object") {
		return cms;
	}

	return fromPlugin(featured.data as PluginFeaturedPayload, cms);
}
