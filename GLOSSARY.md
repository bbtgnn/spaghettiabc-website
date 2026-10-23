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
Un’esperienza/itinerario vendibile, con pagina dedicata e possibile presenza in evidenza in homepage.
_Avoid_: viaggio, pacchetto (salvo uso marketing in copy)

**Sezione Tour**:
Blocco della homepage che elenca Tour in evidenza e rimanda all’archivio tour.
_Avoid_: lista tour, catalogo (nel senso di collection)

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
Blocco della homepage con titolo, sottotitolo e CTA *propri*; loghi e testimonianze sono letti dalla landing Collaborazioni (fonte unica).
_Avoid_: pagina collaborazioni, trust section

**Logo partner**:
Marchio di un’azienda o organizzazione con cui Flavia ha collaborato, mostrato in griglia sulla Sezione Collaborazioni e sulla landing.
_Avoid_: sponsor, cliente (salvo copy)

**Testimonianza**:
Commento positivo su Flavia (stile stelle, fino a 5), editabile nel CMS; non è una recensione Google verificata.
_Avoid_: recensione Google, review (come claim di provenienza)

**Newsletter**:
Canale di aggiornamento di Flavia (ricette di stagione, eventi e novità). Sul sito è una sezione di iscrizione in homepage; non è (ancora) una landing dedicata né un provider collegato.
_Avoid_: mailing list (come nome UI), iscriviti (come nome di entità)

**Sezione Newsletter**:
Blocco della homepage con titolo, sottotitolo e casella email per l’iscrizione (UI; invio reale deferred).
_Avoid_: pagina newsletter, form contatti
