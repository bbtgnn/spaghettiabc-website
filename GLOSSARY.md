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
Citazione da Google (stelle, testo, autore, foto) sincronizzata dal plugin `@spaghettiabc/google-reviews` (Business Profile; in locale anche mock sync), con selezione «in evidenza» e testo display editabile in admin; mostrata nello strip della Sezione Tour. Non vive in una content collection.
_Avoid_: Testimonianza, testimonial, review widget Google; paste di link di condivisione Maps (#4, scartato)

**Newsletter**:
Canale di aggiornamento di Flavia (ricette di stagione, eventi e novità). Sul sito è una sezione di iscrizione in homepage; non è (ancora) una landing dedicata né un provider collegato.
_Avoid_: mailing list (come nome UI), iscriviti (come nome di entità)

**Sezione Newsletter**:
Blocco della homepage con titolo, sottotitolo e casella email per l’iscrizione (per ora solo interfaccia, senza invio reale).
_Avoid_: pagina newsletter, form contatti
