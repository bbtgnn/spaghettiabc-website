# Spaghetti ABC

Dominio del sito di Flavia: tour e contenuti editoriali presentati tramite EmDash.

## Language

**Sezione Hero**:
Blocco iniziale della homepage con titolo, sottotitolo, immagine e CTA: l’ingresso di brand di Flavia. Distinta dal Catalogo Tour, dalla Scheda Tour e dalle altre Sezioni.
_Avoid_: hero (da solo come nome di sezione nel dominio); above-the-fold; banner; jumbotron

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

**Sezione Dicono di me**:
Blocco della homepage (titolo, sottotitolo, Loghi partner, Punteggio Google, Recensioni Google) che mostra prove sociali intorno a Flavia. Nessuna landing dedicata né CTA verso una pagina Collaborazioni.
_Avoid_: Sezione Collaborazioni; Credibilità; Fiducia; trust section; testimonianze; Collaborazioni (come pagina/collection)

**Logo partner**:
Marchio di un’azienda o organizzazione con cui Flavia ha collaborato, mostrato nella Sezione Dicono di me.
_Avoid_: sponsor, cliente (salvo copy)

**Punteggio Google**:
Valutazione aggregata del profilo Google di Flavia (voto, numero di recensioni, link al profilo), mostrata a sinistra dell’elenco Recensioni Google nella Sezione Dicono di me.
_Avoid_: rating globale, score widget

**Recensione Google**:
Citazione curata nello stile di una recensione Google (stelle, testo, autore, foto profilo, link alla recensione originale) gestita nel CMS sulla homepage; seed demo finché non arrivano le recensioni reali. Non è un’integrazione live con Google.
_Avoid_: Testimonianza, testimonial, review widget Google

**Newsletter**:
Canale di aggiornamento di Flavia (ricette di stagione, eventi e novità). Sul sito è una sezione di iscrizione in homepage; non è (ancora) una landing dedicata né un provider collegato.
_Avoid_: mailing list (come nome UI), iscriviti (come nome di entità)

**Sezione Newsletter**:
Blocco della homepage con titolo, sottotitolo e casella email per l’iscrizione (UI; invio reale deferred).
_Avoid_: pagina newsletter, form contatti

**Ricetta**:
Contenuto di prima classe nel CMS: una ricetta di Flavia (collection dedicata, URL `/recipes/{slug}`). Distinta da Post e dal canale Newsletter (anche se la Newsletter può parlare di ricette di stagione).
_Avoid_: post, articolo, recipe post, `posts`

**Catalogo Ricette**:
La pagina `/recipes` che elenca tutte le entry Ricetta (teaser verso le Schede Ricetta). Voce di menu **Ricette**.
_Avoid_: lista ricette; blog ricette; recipe index

**Scheda Ricetta**:
La pagina dettaglio di una Ricetta a `/recipes/{slug}`: titolo, immagine, contenuto (prosa; ingredienti/tempi nel body in v1).
_Avoid_: recipe page, pagina ricetta (come nome di dominio), PDP

**Categoria ricetta**:
Classificazione di una Ricetta (tipo di piatto, dieta, stagione), portata dal vecchio sito. Distinta dalle category/tag del blog `posts`.
_Avoid_: tag ricetta, recipe tag, `category` (dei post)

**Ricetta selezionata**:
La singola Ricetta messa in evidenza nello slot della Sezione Il mio mondo (reference curata sulla homepage).
_Avoid_: featured recipes (plurale), ricetta del mese (salvo copy)

**Sezione Il mio mondo**:
Blocco della homepage (dopo Sezione Formazione, prima di Sezione Dicono di me): vetrina curata a tre posti fissi, in ordine Post Instagram → Articolo Substack → Ricetta selezionata; chrome + CTA verso il Catalogo Ricette. Titolo UI editabile nel CMS; nome di dominio fisso.
_Avoid_: feed, social wall, mondo editoriale (come nome di sezione), blog section

**Post Instagram**:
Snapshot curato di un post Instagram di Flavia (immagine, didascalia breve, URL), gestito nel CMS per lo slot della Sezione Il mio mondo. Non è un feed live.
_Avoid_: reel (salvo copy), stories, embed Instagram live

**Articolo Substack**:
Snapshot curato di un pezzo Substack di Flavia (titolo, estratto, URL, immagine opzionale), gestito nel CMS per lo slot della Sezione Il mio mondo. Non è sync live né import automatico continuo.
_Avoid_: newsletter Substack (come nome di entità sul sito), post blog
