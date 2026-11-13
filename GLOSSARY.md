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
La pagina dettaglio di un Tour a `/tours/{slug}`: hero a immagine piena, poi corpo editoriale | colonna prenotazione (specs + Calendly) quando c’è un URL Calendly.
_Avoid_: product page, pagina prodotto, PDP, tour detail (come nome di dominio); Add to cart; Atelier gallery|info (scartato)

**Prenotazione**:
Richiesta su Calendly dalla colonna prenotazione della Scheda Tour (campo URL per Tour). Il pagamento resta fuori sito (SumUp), dopo la richiesta.
_Avoid_: acquisto, Add to cart, carrello, checkout, booking (come nome di dominio); sheet prenotazione (scartato)

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
