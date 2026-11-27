import { Switch, Text, useKumoToastManager } from "@cloudflare/kumo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PluginAdminExports } from "emdash";
import { apiFetch, isRecord, parseApiResponse } from "emdash/plugin-utils";
import * as React from "react";
import {
	applyRecommendedLayout,
	isRecommendedLayoutApplied,
	parseAdminLayout,
	removeRecommendedLayout,
	type AdminLayout,
} from "./layout";

type CurrentUser = {
	adminLayout: AdminLayout | null;
};

const AUTH_ME = "/_emdash/api/auth/me";
const CURRENT_USER_QUERY_KEY = ["currentUser"] as const;

async function loadCurrentUser(): Promise<CurrentUser> {
	const response = await apiFetch(AUTH_ME);
	return parseApiResponse<CurrentUser>(response, "Impossibile leggere il layout attuale");
}

async function saveAdminLayout(adminLayout: AdminLayout): Promise<AdminLayout> {
	const response = await apiFetch(AUTH_ME, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: "setAdminLayout",
			adminLayout,
		}),
	});
	const saved = await parseApiResponse<{ adminLayout: AdminLayout | null }>(
		response,
		"Impossibile salvare il layout consigliato",
	);
	return saved.adminLayout ?? adminLayout;
}

function LayoutConsigliatoPage() {
	const toast = useKumoToastManager();
	const queryClient = useQueryClient();
	const [working, setWorking] = React.useState(false);

	const { data, isLoading, isError } = useQuery({
		queryKey: CURRENT_USER_QUERY_KEY,
		queryFn: loadCurrentUser,
	});

	const layout = parseAdminLayout(data?.adminLayout);
	const enabled = isRecommendedLayoutApplied(layout);

	const handleToggle = React.useCallback(
		async (checked: boolean) => {
			setWorking(true);
			try {
				const me = data ?? (await loadCurrentUser());
				const current = parseAdminLayout(me.adminLayout);
				const nextLayout = checked
					? applyRecommendedLayout(current)
					: removeRecommendedLayout(current);
				const savedLayout = await saveAdminLayout(nextLayout);

				queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (previous: unknown) => {
					const base = isRecord(previous) ? previous : me;
					return {
						...base,
						adminLayout: savedLayout,
					};
				});
				void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });

				toast.add({
					title: checked ? "Layout consigliato attivo" : "Layout consigliato disattivato",
					description: checked
						? "Le voci e le sezioni consigliate sono nascoste sul tuo account."
						: "Le nascoste consigliate sono state rimosse. Le altre personalizzazioni restano.",
					variant: "success",
				});
			} catch (error) {
				const message =
					error instanceof Error && error.message
						? error.message
						: "Si è verificato un errore imprevisto";
				toast.add({
					title: "Aggiornamento non riuscito",
					description: message,
					variant: "error",
				});
			} finally {
				setWorking(false);
			}
		},
		[data, queryClient, toast],
	);

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<header className="space-y-2">
				<Text variant="heading" size="lg" as="h1">
					Layout consigliato
				</Text>
				<Text variant="secondary" size="sm">
					Semplifica la barra laterale dell’admin per il lavoro quotidiano su Spaghetti ABC.
				</Text>
			</header>

			<div className="space-y-4 rounded-lg border border-kumo-hairline bg-kumo-base p-6 text-sm leading-relaxed">
				<p>
					Questo strumento applica un layout personale pensato per chi gestisce tour e contenuti
					editoriali. Nasconde voci e sezioni dell’admin che su questo sito non servono nel flusso
					normale di lavoro, così la navigazione resta più chiara.
				</p>
				<p>
					Nella navigazione laterale vengono nascoste Categorie, Tag, Tipi di contenuto e Schema dei
					crediti. Nell’editor dei contenuti spariscono le sezioni Crediti e Tassonomie.
				</p>
			</div>

			<div>
				<Switch
					label="Usa layout consigliato"
					checked={enabled}
					disabled={working || isLoading || isError}
					transitioning={working}
					onCheckedChange={(checked) => void handleToggle(checked)}
				/>
				{isError ? (
					<div className="mt-2">
						<Text variant="error" size="sm">
							Impossibile leggere lo stato del layout.
						</Text>
					</div>
				) : null}
			</div>
		</div>
	);
}

export const pages: PluginAdminExports["pages"] = {
	"/": LayoutConsigliatoPage,
};
