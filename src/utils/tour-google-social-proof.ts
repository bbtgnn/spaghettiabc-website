import type { FeaturedResponse } from "@spaghettiabc/google-reviews/types";
import {
	getPublicPluginApiRouteHandler,
	type PublicPluginRuntimeLocals,
} from "emdash/plugin-utils";

export type TourGoogleReview = {
	author: string;
	quote: string;
	rating: number;
	reviewUrl?: string | null;
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

export const EMPTY_TOUR_GOOGLE_SOCIAL_PROOF: TourGoogleSocialProof = {
	score: 0,
	reviewCount: 0,
	profileUrl: null,
	reviews: [],
};

function isFeaturedResponse(data: unknown): data is FeaturedResponse {
	if (!data || typeof data !== "object") return false;
	return "place" in data && Array.isArray((data as FeaturedResponse).reviews);
}

function fromPlugin(payload: FeaturedResponse): TourGoogleSocialProof {
	const place = payload.place ?? null;
	const profileUrl = place?.googleMapsUri ?? null;

	return {
		score: typeof place?.rating === "number" ? place.rating : 0,
		reviewCount:
			typeof place?.userRatingCount === "number" ? place.userRatingCount : 0,
		profileUrl,
		reviews: payload.reviews.map((review) => ({
			author: review.authorName,
			quote: review.text?.trim() || "",
			rating: Number(review.rating) || 5,
			reviewUrl: review.mapsUri ?? profileUrl,
			avatarSrc: review.authorPhotoUri ?? null,
		})),
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
	if (!pluginApi) return EMPTY_TOUR_GOOGLE_SOCIAL_PROOF;

	const featured = await pluginApi("google-reviews", "GET", "featured", request);
	if (!featured.success || !isFeaturedResponse(featured.data)) {
		return EMPTY_TOUR_GOOGLE_SOCIAL_PROOF;
	}

	return fromPlugin(featured.data);
}
