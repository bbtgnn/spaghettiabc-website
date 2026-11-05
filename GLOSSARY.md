# Spaghetti ABC

Dominio del sito di Flavia: tour e contenuti editoriali presentati tramite EmDash.

## Language

**Libro**:
Un contenuto di prima classe nel CMS (collection `book`): il titolo che Flavia vende. Sul sito esiste un solo Libro canonico (entry id / URL `/puglia-the-book`) con pagina dedicata.
_Avoid_: blocco homepage, prodotto, merchandise, catalogo libri, `books`

**Sezione Libro**:
Blocco della homepage con titolo, sottotitolo, foto e testo CTA *propri* (non letti dal Libro). La CTA punta alla pagina del Libro canonico.
_Avoid_: pagina libro, scheda libro, reference al Libro

**Tour**:
Esperienza cibo guidata di Flavia — di solito in un paese pugliese, a volte un formato speciale senza singolo paese (cena narrativa, MICE, su misura). Non è un itinerario di viaggio plurigiornaliero in Italia. Campo `destination` = nome del paese oppure etichetta di formato.
_Avoid_: viaggio, pacchetto (salvo copy marketing), itinerario (come termine definitorio)

**Catalogo Tour**:
La pagina `/tours` che elenca tutte le entry Tour (teaser verso le Schede Tour).
_Avoid_: lista tour; product listing; non usare «catalogo» per indicare una collection CMS

**Scheda Tour**:
La pagina dettaglio di un Tour a `/tours/{slug}`: layout a split (gallery + info sticky), senza hero overlay; CTA «Add to cart» solo visuale (non collegata al carrello).
_Avoid_: product page, pagina prodotto, PDP, tour detail (come nome di dominio)

**Sezione Tour**:
Blocco della homepage che elenca Tour in evidenza e rimanda al Catalogo Tour.
_Avoid_: lista tour; chiamare questo blocco «Catalogo Tour»; product grid

**Formazione**:
L’offerta B2B di Flavia: percorsi e incontri per aziende e professionisti intorno alla cultura del cibo, presentata come una sola landing sul sito (collection `training`, entry/URL `/training`). I singoli percorsi non sono entry separate finché non si decide un catalogo.
_Avoid_: corso, workshop (come nome di collection), education, `formazione` (come slug tecnico)

**Sezione Formazione**:
Blocco della homepage con titolo, sottotitolo, foto e testo CTA *propri* (non letti dalla landing Formazione). La CTA punta a `/training`.
_Avoid_: pagina formazione, catalogo corsi, reference alla Formazione

**Collaborazioni**:
La landing di prima classe (collection `collaborations`, entry/URL `/collaborazioni`) che raccoglie collaborazioni, progetti e riconoscimenti di Flavia. Una sola pagina; i progetti non sono entry separate finché non si decide un catalogo. Serve a mostrare credibilità, non è il nome “Credibilità”.
_Avoid_: Credibilità (come nome di collection/pagina), portfolio, press, partner (come nome di collection)

**Sezione Collaborazioni**:
Blocco della homepage con titolo, sottotitolo e CTA *propri*; i loghi partner sono letti dalla landing Collaborazioni; le Recensioni Google vivono sul campo homepage `google_reviews` (non sulla landing).
_Avoid_: pagina collaborazioni, trust section, testimonianze

**Logo partner**:
Marchio di un’azienda o organizzazione con cui Flavia ha collaborato, mostrato in griglia sulla Sezione Collaborazioni e sulla landing.
_Avoid_: sponsor, cliente (salvo copy)

**Recensione Google**:
Citazione stile recensione Google (autore, testo, valutazione numerica) gestita nel CMS sulla homepage (`google_reviews`); demo/placeholder finché non arrivano le recensioni reali. Non è un’integrazione live con Google.
_Avoid_: Testimonianza, testimonial, review widget Google

**Newsletter**:
Canale di aggiornamento di Flavia (ricette di stagione, eventi e novità). Sul sito è una sezione di iscrizione in homepage; non è (ancora) una landing dedicata né un provider collegato.
_Avoid_: mailing list (come nome UI), iscriviti (come nome di entità)

**Sezione Newsletter**:
Blocco della homepage con titolo, sottotitolo e casella email per l’iscrizione (UI; invio reale deferred).
_Avoid_: pagina newsletter, form contatti
