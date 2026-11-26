import { Button, useKumoToastManager } from "@cloudflare/kumo";
import { useQueryClient } from "@tanstack/react-query";
import type { PluginAdminExports } from "emdash";
import { apiFetch, isRecord, parseApiResponse } from "emdash/plugin-utils";
import * as React from "react";
import { applyRecommendedLayout, parseAdminLayout, type AdminLayout } from "./layout";

type CurrentUser = {
	adminLayout: AdminLayout | null;
};

const AUTH_ME = "/_emdash/api/auth/me";
const CURRENT_USER_QUERY_KEY = ["currentUser"] as const;

function LayoutConsigliatoPage() {
	const toast = useKumoToastManager();
	const queryClient = useQueryClient();
	const [working, setWorking] = React.useState(false);

	const handleApply = React.useCallback(async () => {
		setWorking(true);
		try {
			const meResponse = await apiFetch(AUTH_ME);
			const me = await parseApiResponse<CurrentUser>(
				meResponse,
				"Impossibile leggere il layout attuale",
			);
			const nextLayout = applyRecommendedLayout(parseAdminLayout(me.adminLayout));

			const saveResponse = await apiFetch(AUTH_ME, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "setAdminLayout",
					adminLayout: nextLayout,
				}),
			});
			const saved = await parseApiResponse<{ adminLayout: AdminLayout | null }>(
				saveResponse,
				"Impossibile salvare il layout consigliato",
			);

			queryClient.setQueryData(CURRENT_USER_QUERY_KEY, (previous: unknown) => {
				if (!isRecord(previous)) return previous;
				return {
					...previous,
					adminLayout: saved.adminLayout ?? nextLayout,
				};
			});
			void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });

			toast.add({
				title: "Layout consigliato applicato",
				description:
					"Le voci e le sezioni consigliate sono ora nascoste sul tuo account. Puoi annullare da Impostazioni → Barre laterali.",
				variant: "success",
			});
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: "Si è verificato un errore imprevisto";
			toast.add({
				title: "Applicazione non riuscita",
				description: message,
				variant: "error",
			});
		} finally {
			setWorking(false);
		}
	}, [queryClient, toast]);

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<header className="space-y-2">
				<h1 className="text-3xl font-bold">Layout consigliato</h1>
				<p className="text-muted-foreground text-sm">
					Semplifica la barra laterale dell’admin per il lavoro quotidiano su Spaghetti ABC.
				</p>
			</header>

			<div className="space-y-4 rounded-lg border bg-kumo-base p-6 text-sm leading-relaxed">
				<p>
					Questo strumento applica un layout personale pensato per chi gestisce tour e contenuti
					editoriali. Nasconde voci e sezioni dell’admin che su questo sito non servono nel flusso
					normale di lavoro, così la navigazione resta più chiara.
				</p>
				<p>
					L’azione riguarda solo l’account con cui hai effettuato l’accesso. Gli altri utenti non
					vengono modificati: ciascuno può applicare (o meno) il layout dal proprio account, quando
					lo desidera.
				</p>
				<p>
					Nella navigazione laterale verranno nascoste Categorie, Tag, Tipi di contenuto e Schema
					dei crediti. Nell’editor dei contenuti spariscono le sezioni Crediti e Tassonomie.
				</p>
				<p>
					Le personalizzazioni già presenti sul tuo layout — ordine delle voci o altre voci già
					nascoste — vengono mantenute. Il plugin aggiunge solo queste nascoste consigliate, senza
					azzerare il resto.
				</p>
				<p>
					Completa le nascoste di sito già definite in configurazione (calendario, media, commenti e
					simili). Puoi annullare in qualsiasi momento da Impostazioni → Barre laterali, ripristinando
					i valori predefiniti o riattivando le singole voci.
				</p>
			</div>

			<div>
				<Button type="button" loading={working} disabled={working} onClick={() => void handleApply()}>
					Applica layout consigliato
				</Button>
			</div>
		</div>
	);
}

export const pages: PluginAdminExports["pages"] = {
	"/": LayoutConsigliatoPage,
};
