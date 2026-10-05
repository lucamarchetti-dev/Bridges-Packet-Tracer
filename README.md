# BridgesPT

## 1. Descrizione del progetto

BridgesPT è un'applicazione web a pagina singola per la
costruzione e la gestione visuale di una topologia di rete: l'utente può
aggiungere dispositivi su un canvas, posizionarli liberamente, collegarli tra
loro e consultarne o modificarne i dettagli.

Risolve il problema di visualizzare e modellare rapidamente, senza strumenti
esterni, come sono collegati tra loro PC, switch e router di una rete,
mantenendo dispositivi e collegamenti sempre sincronizzati anche quando la
disposizione sul canvas cambia.

Funzionalità principali implementate:

- Aggiunta di dispositivi di tipo **PC**, **Switch** e **Router**, ciascuno
  con forma grafica distinta (quadrato, rettangolo, cerchio), id univoco e
  nome progressivo di default (es. `PC-01`).
- **Drag & drop** dei dispositivi con aggiornamento delle coordinate e delle
  connessioni collegate.
- Due modalità operative: **Edit** (trascinamento e selezione) e **Connect**
  (creazione di connessioni tramite due click successivi).
- Validazioni sulle connessioni: nessun auto-collegamento, nessuna
  connessione duplicata (il modello è non orientato: `A–B` equivale a
  `B–A`), con messaggio di errore mostrato all'utente.
- Evidenziazione grafica del dispositivo selezionato.
- Pannello di dettaglio del dispositivo, apribile con **click destro**, con
  visualizzazione di tipo, ID, nome, IP, hostname e stato.
- Modifica di nome, IP, hostname e stato dal pannello di dettaglio, con
  aggiornamento immediato dell'interfaccia.
- Eliminazione di un dispositivo (con rimozione automatica delle connessioni
  associate) ed eliminazione di una singola connessione (doppio click sulla
  linea).
- **Colore in base allo stato operativo**: un dispositivo diventa verde se il
  suo stato è `Online`, rosso se `Offline`; resta con il colore neutro di
  default se lo stato non è impostato o è `Unknown`.

Funzionalità bonus effettivamente presenti:

- **Persistenza su Local Storage**, con pulsanti dedicati per salvare,
  caricare e cancellare la topologia, validazione dei dati letti e
  ripristino automatico della topologia salvata (zoom e pan compresi)
  all'avvio dell'applicazione.
- **Zoom del canvas**: pannello flottante verticale con pulsanti "＋/－" e
  "Reset", posizionato sopra l'angolo in alto a sinistra del canvas (non
  nella toolbar), oltre allo zoom con la rotellina del mouse/gesto pinch sul
  trackpad. Lo spostamento dei dispositivi (drag & drop) resta corretto a
  qualunque livello di zoom.
- **Pan del canvas**: trascinando un punto libero dello sfondo (non un
  dispositivo né una connessione) la vista si sposta, per navigare il
  canvas dopo averlo ingrandito. Il pulsante "Reset" dello stesso pannello
  riporta zoom e posizione ai valori iniziali. Zoom e pan correnti vengono
  entrambi inclusi nel salvataggio su Local Storage.

## 2. Tecnologie utilizzate

**Frontend**
- Angular 18 (componenti standalone, senza `NgModule`)
- TypeScript
- Angular Signals (`signal`, `computed`, `effect`) per la gestione dello
  stato applicativo
- Angular Forms (`FormsModule` / `ngModel`) per il form di modifica del
  dispositivo
- HTML e CSS per il rendering dei dispositivi (posizionamento assoluto) e
  SVG nativo (elementi `<svg>`/`<line>`) per il disegno delle connessioni

**Backend e Database**
- Non presente: l'applicazione è interamente client-side.

**Persistenza**
- Browser Local Storage (tramite un servizio dedicato), usata per salvare e
  ricaricare l'intera topologia (dispositivi e connessioni)

**API / comunicazione**
Non presente: non ci sono chiamate di rete o API esterne/interne.

**Build e gestione dipendenze**
- Angular CLI (`@angular/cli`) per build, serve e configurazione del
  progetto
- npm come gestore di pacchetti

**Altri strumenti rilevanti**
- Karma e Jasmine sono presenti come dipendenze di sviluppo (configurazione
  di test standard generata dalla Angular CLI), ma nel progetto non sono
  stati scritti test applicativi oltre a quelli di default.

## 3. Architettura del progetto

L'applicazione è organizzata in componenti standalone che iniettano
direttamente un servizio di stato condiviso, senza passaggio di dati a
cascata tramite `@Input`/`@Output`.

```text
src/app/
├── components/
│   ├── toolbar/            → aggiunta dispositivi, cambio modalità, salvataggio/caricamento
│   ├── network-canvas/     → area di disegno: layer SVG connessioni, dispositivi, pannello zoom
│   ├── device-node/        → singolo dispositivo (forma, drag, selezione, click destro)
│   ├── connection-line/    → singola linea SVG di connessione (con area per l'eliminazione)
│   └── device-details/     → pannello laterale di dettaglio/modifica del dispositivo
├── models/
│   ├── device.model.ts     → tipi Device, DeviceType, DeviceStatus
│   └── connection.model.ts → tipo Connection
├── services/
│   ├── topology.service.ts → stato applicativo (Signals) e regole di business
│   ├── storage.service.ts  → lettura/scrittura/validazione su Local Storage
│   └── viewport.service.ts → stato della vista: zoom e pan (spostamento) del canvas
└── app.component.ts        → layout generale, banner notifiche, ripristino iniziale
```

Flusso dei dati:

```text
┌────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│  Toolbar   │─────▶│                     │◀─────│  Device Node      │
└────────────┘      │                     │      └──────────────────┘
                     │  TopologyService    │
┌────────────┐      │  (Signals di stato   │      ┌──────────────────┐
│  Device    │◀────▶│   + computed +      │◀─────│  Connection Line  │
│  Details   │      │   validazioni)      │      └──────────────────┘
└────────────┘      └─────────┬───────────┘
                               │
┌────────────┐                │ (dispositivi, connessioni)
│  Network   │                ▼
│  Canvas    │      ┌─────────────────────┐
└─────┬──────┘      │   StorageService    │
      │             │   (Local Storage)   │
      │ (zoom/pan)   └──────────▲──────────┘
      ▼                         │
┌───────────────┐               │
│ ViewportService│───────────────┘
└───────────────┘   (zoom, pan)
```

- I componenti leggono lo stato dal `TopologyService` tramite Signal in
  sola lettura e invocano i suoi metodi pubblici per ogni modifica (aggiunta,
  spostamento, selezione, connessione, eliminazione, modifica).
- `TopologyService` espone anche dati derivati tramite `computed()`, in
  particolare le coordinate delle linee di connessione, calcolate a partire
  dalla posizione corrente dei dispositivi collegati.
- `ViewportService` gestisce separatamente lo stato della vista (zoom e
  pan): è un servizio distinto da `TopologyService` perché non rappresenta
  dati della rete, solo una preferenza di visualizzazione. `NetworkCanvasComponent`
  lo usa per applicare la trasformazione CSS al canvas e per gestire
  trascinamento dello sfondo (pan) e rotellina del mouse (zoom).
- `StorageService` è indipendente dallo stato applicativo: riceve ed espone
  solo dati semplici (dispositivi, connessioni, zoom, pan), validandoli
  prima di restituirli.
- Non è presente un backend: tutta la logica ed i dati risiedono nel
  browser.

## 4. Modello dati

```text
Device
- id: string (identificativo univoco)
- type: 'PC' | 'Switch' | 'Router'
- name: string
- x: number
- y: number
- ip?: string (opzionale)
- hostname?: string (opzionale)
- status?: 'Online' | 'Offline' | 'Unknown' (opzionale)

Connection
- id: string (identificativo univoco)
- sourceId: string → riferimento a Device.id
- targetId: string → riferimento a Device.id
```

Relazioni:

- Una `Connection` fa riferimento a due `Device` tramite `sourceId` e
  `targetId`; non contiene coordinate proprie, che vengono sempre lette dal
  `Device` corrispondente.
- Il modello di connessione è non orientato: non esiste distinzione di
  verso tra `sourceId` e `targetId` ai fini della validazione dei duplicati.

Non sono presenti altre entità (utenti, sessioni, gruppi di rete, ecc.) nel
progetto.

## 5. Istruzioni di avvio

**Prerequisiti**
- Node.js (versione compatibile con Angular 18) e npm

**Variabili d'ambiente / configurazioni**

Non presenti: il progetto non richiede file `.env` né configurazioni
aggiuntive.

**Installazione delle dipendenze**

```bash
npm install
```

**Avvio dell'applicazione**

```bash
ng serve
```

**Indirizzo da aprire nel browser**

```text
http://localhost:4200
```


**Nota**: non essendoci un backend separato, non è necessario alcun avvio
distinto di frontend e backend.

## 6. Altre Info
Il progetto è un piccolo progetto, fatto con l'ausilio dell'IA, da uno studente ambito ICT. A tempo libero saranno fatte piccole implementazioni e miglioramenti