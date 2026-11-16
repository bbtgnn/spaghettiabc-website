/**
 * Effective Calendly URL for Scheda Tour Prenotazione:
 * tour override (trimmed) → site_globals fallback → empty.
 */
export function resolveTourCalendlyUrl(
	tourUrl: string | null | undefined,
	globalUrl: string | null | undefined,
): string {
	const fromTour = typeof tourUrl === "string" ? tourUrl.trim() : "";
	if (fromTour) return fromTour;
	const fromGlobal = typeof globalUrl === "string" ? globalUrl.trim() : "";
	return fromGlobal;
}
