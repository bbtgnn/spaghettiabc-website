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
 * Plugin `featured` only — empty proof when the route fails or is unavailable.
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

const EMPTY_PROOF: TourGoogleSocialProof = {
	score: 0,
	reviewCount: 0,
	profileUrl: null,
	reviews: [],
};

function fromPlugin(payload: PluginFeaturedPayload): TourGoogleSocialProof {
	const place = payload.place ?? null;
	const profileUrl = place?.googleMapsUri ?? null;

	return {
		score: typeof place?.rating === "number" ? place.rating : 0,
		reviewCount:
			typeof place?.userRatingCount === "number" ? place.userRatingCount : 0,
		profileUrl,
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
 * Resolve Tour Google social proof for the current request from the plugin
 * `featured` route only (ADR-0008).
 */
export async function getTourGoogleSocialProof(
	locals: PublicPluginRuntimeLocals | null | undefined,
	request: Request,
): Promise<TourGoogleSocialProof> {
	const pluginApi = getPublicPluginApiRouteHandler(locals);
	if (!pluginApi) return EMPTY_PROOF;

	const featured = await pluginApi("google-reviews", "GET", "featured", request);
	if (!featured.success || !featured.data || typeof featured.data !== "object") {
		return EMPTY_PROOF;
	}

	return fromPlugin(featured.data as PluginFeaturedPayload);
}
