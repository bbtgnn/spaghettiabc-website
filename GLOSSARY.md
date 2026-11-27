# Spaghetti ABC

Dominio del sito di Flavia: tour e contenuti editoriali presentati tramite EmDash.

## Language

**Locale**:
Lingua del sito (inglese o italiano) in cui si legge una pagina, con le sue traduzioni dei contenuti e dell’interfaccia. Default pubblico: inglese.
_Avoid_: confondere con la lingua parlata di un Tour

**Libro**:
L’opera di Flavia sul cibo in Puglia (il titolo “Puglia”), presentata sul sito attraverso le sue Edizioni. Non ha una pagina propria.
_Avoid_: blocco homepage, prodotto, merchandise; non confondere con Edizione

**Edizione**:
Una variante pubblicata del Libro (internazionale, speciale), con copertina, testi e acquisto propri.
_Avoid_: Libro (per indicare una singola variante); version; SKU; product variant

**Sezione Libro**:
Blocco della homepage che presenta le Edizioni scelte dall’editor, nell’ordine scelto, e rimanda alle loro Schede.
_Avoid_: elenco automatico di tutte le Edizioni; CTA di acquisto (sta sulla Scheda)

**Scheda Edizione**:
La pagina dettaglio di una Edizione, l’unico punto da cui la si acquista. Il link indietro torna alla Sezione Libro.
_Avoid_: product page; pagina del Libro (come se l’opera avesse una sola pagina); pagina hub dei libri

**Tour**:
Esperienza cibo guidata di Flavia: di solito in un paese pugliese, a volte un formato speciale senza singolo paese (cena narrativa, MICE, su misura). Non è un itinerario di viaggio plurigiornaliero in Italia.
_Avoid_: viaggio, pacchetto (salvo copy marketing), itinerario (come termine definitorio)

**Catalogo Tour**:
La pagina che elenca tutti i Tour, con teaser verso le Schede Tour.
_Avoid_: lista tour; product listing; «catalogo» per indicare una collection CMS

**Scheda Tour**:
La pagina dettaglio di un Tour: racconto dell’esperienza accanto alla colonna prenotazione (dettagli pratici e Prenotazione).
_Avoid_: product page, pagina prodotto, PDP, tour detail (come nome di dominio); Add to cart

**Impostazioni sito**:
Entry unica di impostazioni globali dei contenuti (FAQ condivisa, URL Calendly predefinito, e simili). Non è una pagina pubblica.
_Avoid_: le impostazioni generali di EmDash (titolo, tagline); config

**Prenotazione**:
Richiesta su Calendly dalla colonna prenotazione della Scheda Tour. Vale l’URL Calendly del Tour, altrimenti quello predefinito in Impostazioni sito. Il pagamento resta fuori sito (SumUp), dopo la richiesta.
_Avoid_: acquisto, Add to cart, carrello, checkout, booking (come nome di dominio)

**Sezione Tour**:
Blocco della homepage che presenta i Tour in evidenza, con Punteggio e Recensioni Google, e rimanda al Catalogo Tour.
_Avoid_: lista tour; chiamare questo blocco «Catalogo Tour»; product grid

**Formazione**:
L’offerta B2B di Flavia: percorsi e incontri per aziende e professionisti intorno alla cultura del cibo, presentata come una sola landing. I singoli percorsi non sono entry separate finché non si decide un catalogo.
_Avoid_: corso, workshop (come nome di entità), education

**Sezione Formazione**:
Blocco della homepage con titolo, sottotitolo, foto e testo CTA *propri* (non letti dalla landing Formazione), che rimanda alla landing.
_Avoid_: pagina formazione, catalogo corsi

**Sezione Dicono di me**:
Blocco della homepage (titolo, sottotitolo, Loghi partner) che mostra le collaborazioni di Flavia. Nessuna landing dedicata né CTA verso una pagina Collaborazioni.
_Avoid_: Sezione Collaborazioni; Credibilità; Fiducia; trust section; testimonianze; Collaborazioni (come pagina)

**Logo partner**:
Marchio di un’azienda o organizzazione con cui Flavia ha collaborato, mostrato nella Sezione Dicono di me.
_Avoid_: sponsor, cliente (salvo copy)

**Punteggio Google**:
Valutazione aggregata del profilo Google di Flavia (voto, numero di recensioni, link al profilo), mostrata nella Sezione Tour accanto alle Recensioni Google.
_Avoid_: rating globale, score widget

**Recensione Google**:
Citazione curata nello stile di una recensione Google (stelle, testo, autore, foto profilo), scelta dall’editor e mostrata nella Sezione Tour. Non è sincronizzata con Google.
_Avoid_: Testimonianza, testimonial, review widget Google

**Newsletter**:
Canale di aggiornamento di Flavia (ricette di stagione, eventi e novità). Sul sito è una sezione di iscrizione in homepage; non è (ancora) una landing dedicata né un provider collegato.
_Avoid_: mailing list (come nome UI), iscriviti (come nome di entità)

**Sezione Newsletter**:
Blocco della homepage con titolo, sottotitolo e casella email per l’iscrizione (per ora solo interfaccia, senza invio reale).
_Avoid_: pagina newsletter, form contatti

## Schema migration loop

Toolchain vocabulary for evolving `seed/seed.json` into immutable migrations and applying them on staging/production. Not Flavia’s site domain.

**Canonical schema**:
Normalised, comparable shape of collections and fields (defaults filled, volatile keys stripped, stable order) used for hashing and diffs.
_Avoid_: raw `seed.json`; live admin JSON as-is; “schema document”

**Schema hash / hash-chain position**:
SHA-256 of a canonical schema at a known point on the migration replay. The full position list includes every op-prefix (base, pre, full, and partial); the coarse **chain state** view keeps only base|pre|full. Positions are derived by replaying committed migrations — there is no separate ledger.
_Avoid_: ledger; migration log; version number as the identity of live schema

**Partial position**:
Live schema hash matches an interrupted mid-migration op-prefix (between ops of one migration), not a complete chain state. Apply resumes from there; it is not DRIFT.
_Avoid_: DRIFT; “behind” / pending when the apply was cut mid-migration

**Migration**:
Immutable generated JSON (and optional sibling backfill module) that takes the schema from one hash-chain position to the next. Once committed, it is never edited.
_Avoid_: schema patch; admin save; changelog entry

**DRIFT**:
Live schema hash is not any position on the committed migration chain — including partials (usually an out-of-band admin edit). Exit 4.
_Avoid_: SEED_DRIFT; “out of date” when the live schema is simply behind pending migrations; Partial position

**SEED_DRIFT**:
Working-tree `seed/seed.json` no longer matches the final hash of the committed migrations. Exit 1; fix with `schema:generate`.
_Avoid_: DRIFT; live drift

**Pre phase**:
Apply steps before the Worker/code deploy: additive and update ops, then backfills. Removals wait for post.
_Avoid_: “before deploy” as a vague label; calling backfills a separate phase

**Post phase**:
Apply steps after the code deploy: `removeField` / `deleteCollection`, so old code never reads a missing column.
_Avoid_: cleanup phase; destructive phase (destructive is a property of ops, not the phase name)

**STOP**:
Generator refusal: `schema:generate` will not invent an ambiguous or unsupported migration. Exit 3 with a STOP code, details, and hint.
_Avoid_: error; failure; blocked (BLOCKED is exit 5 at apply time)

**Backfill**:
Content transform that copies or maps values when the schema expands (often into a new field). Writes stage-only pending drafts and never publishes; the pending-draft gate blocks destructive post ops until every entry carries the backfilled value (or the draft is discarded).
_Avoid_: data migration (as a synonym that hides the draft gate); content seed

**Schema loop / Rehearse**:
The edit → generate → check → PR cycle; Rehearse is the dress rehearsal that seeds from merge-base, applies all migrations on a throwaway local server, and asserts live == model == seed without touching the checkout’s own DB.
_Avoid_: staging apply as “rehearse”; local `npm run dev` wipe/reseed as the rehearsal
