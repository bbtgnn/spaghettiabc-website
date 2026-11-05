# Recensioni Google tramite Places API

## Fonti

- Issue GitHub [#4](https://github.com/bbtgnn/spaghettiabc-website/issues/4)
- Scelta con Chiara, 2026-11-04: opzione **2** (Places API + Place ID), non fetch da link di condivisione arbitrario
- Termini di dominio: [`GLOSSARY.md`](../../../GLOSSARY.md)

## Vincolo (2026-11-04)

Google Places API (New) restituisce **al massimo 5 recensioni** per un Place. **Non** esiste un modo ufficiale per risolvere un URL di condivisione Maps in una singola recensione. Lo scraping è fuori scope.

## Appunti — tre possibilità (2026-11-05)

Annotati da Chiara. Tre strade possibili per le recensioni Google in homepage:

1. **Sync Google (casuale / automatico)** — le recensioni prese da Google vengono prese (in pratica quelle che l’API restituisce, fino a 5) e inserite nel sito.
2. **Selezione manuale + link Google** — inseriamo noi le recensioni preferite, con un link che collega direttamente alle recensioni su Google.
3. **Scraping** — recupero non ufficiale dal web (fragile, contro i ToS Google).

Nota di allineamento: la scelta del 2026-11-04 e l’implementazione attuale del plugin sono vicine a (1) con selezione in evidenza dall’admin (non “casuale” pura). (2) e (3) restano alternative documentate; (3) è fuori scope sotto.

## Decisioni (2026-11-04)

1. Plugin EmDash nativo `@spaghettiabc/google-reviews` (`id: google-reviews`).
2. Impostazioni (form generato dall’host): secret `apiKey`, stringa `placeId`. Richiede `EMDASH_ENCRYPTION_KEY`.
3. Pagina admin **Recensioni Google**: Sync + checkbox «Mostra in homepage».
4. Le recensioni sincronizzate vivono nello storage del plugin (non in una collection CMS). I flag «in evidenza» si conservano tra un sync e l’altro.
5. La route pubblica `featured` alimenta l’SSR della homepage via `getPublicPluginApiRouteHandler`.
6. La homepage possiede solo il chrome: `form_heading_reviews`, `reviews_title`, `reviews_subtitle`.
7. Distinte dalle **Testimonianze** Collaborazioni (manuali, non provenienti da Google).

## Workflow di Flavia

1. Google Cloud: abilitare Places API (New), creare la API key, annotare il Place ID.
2. Admin → impostazioni del plugin: incollare chiave + Place ID.
3. Admin → Recensioni Google → **Sincronizza ora**.
4. Spuntare le recensioni da mostrare in homepage.
5. Modificare i titoli della homepage sotto **Recensioni Google**.

## Esplicitamente fuori scope (2026-11-04)

- Fetch da link di condivisione
- Scraping / scraper di recensioni di terze parti
- Scrivere le recensioni in una content collection
- Mettere automaticamente in evidenza ogni recensione sincronizzata
