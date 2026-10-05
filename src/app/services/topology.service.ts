import { Injectable, computed, signal } from '@angular/core';
import { Device, DeviceStatus, DeviceType } from '../models/device.model';
import { Connection } from '../models/connection.model';

/** Le due modalità operative del canvas: trascinare o collegare. */
export type EditorMode = 'edit' | 'connect';

/** Un messaggio da mostrare all'utente: un errore o una semplice notifica. */
export interface Notification {
  type: 'error' | 'info';
  message: string;
}

/**
 * Rappresentazione "pronta per il disegno" di una connessione: contiene già
 * le coordinate calcolate dei due dispositivi collegati. Viene ricalcolata
 * automaticamente ogni volta che dispositivi o connessioni cambiano, grazie
 * a `computed()`. Il componente che disegna le linee non deve fare nessun
 * calcolo: legge solo x1/y1/x2/y2.
 */
export interface ConnectionLineVm {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Injectable({ providedIn: 'root' })
export class TopologyService {
  // ---------------------------------------------------------------------
  // STATO PRIVATO (Signals)
  // Sono privati e "writable" solo qui dentro: nessun componente esterno
  // può modificarli direttamente, deve sempre passare dai metodi pubblici
  // qui sotto. Questo evita che lo stato venga alterato da punti sparsi
  // nell'applicazione senza controllo.
  // ---------------------------------------------------------------------
  private readonly _devices = signal<Device[]>([]);
  private readonly _connections = signal<Connection[]>([]);
  private readonly _selectedDeviceId = signal<string | null>(null);
  private readonly _detailDeviceId = signal<string | null>(null);
  private readonly _mode = signal<EditorMode>('edit');
  private readonly _notification = signal<Notification | null>(null);

  // Contatori interni per generare nomi tipo "PC-01", "PC-02"...
  // Non sono Signal perché non servono alla UI: sono un dettaglio implementativo.
  private counters: Record<DeviceType, number> = { PC: 0, Switch: 0, Router: 0 };

  // ---------------------------------------------------------------------
  // STATO ESPOSTO IN SOLA LETTURA
  // I componenti leggono da qui (es. `topology.devices()`), ma non possono
  // scrivere: `asReadonly()` restituisce una versione del signal senza `.set()`.
  // ---------------------------------------------------------------------
  readonly devices = this._devices.asReadonly();
  readonly connections = this._connections.asReadonly();
  readonly selectedDeviceId = this._selectedDeviceId.asReadonly();
  readonly detailDeviceId = this._detailDeviceId.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly notification = this._notification.asReadonly();

  // ---------------------------------------------------------------------
  // DATI DERIVATI (computed)
  // Si ricalcolano da soli quando i signal da cui dipendono cambiano.
  // ---------------------------------------------------------------------

  /** Il dispositivo attualmente selezionato/evidenziato, oppure null. */
  readonly selectedDevice = computed(
    () => this._devices().find((d) => d.id === this._selectedDeviceId()) ?? null
  );

  /** Il dispositivo di cui è aperto il pannello di dettaglio, oppure null. */
  readonly detailDevice = computed(
    () => this._devices().find((d) => d.id === this._detailDeviceId()) ?? null
  );

  /**
   * Le connessioni "arricchite" con le coordinate correnti dei dispositivi.
   * Questo è l'esempio più importante di "single source of truth": le
   * coordinate vivono SOLO nel Device, qui vengono semplicemente lette al volo.
   * Quando un dispositivo si sposta, questo computed si ricalcola da solo e
   * la linea sul canvas si aggiorna automaticamente, senza codice aggiuntivo.
   */
  readonly connectionLines = computed<ConnectionLineVm[]>(() => {
    const devicesById = new Map(this._devices().map((d) => [d.id, d]));
    const lines: ConnectionLineVm[] = [];
    for (const conn of this._connections()) {
      const source = devicesById.get(conn.sourceId);
      const target = devicesById.get(conn.targetId);
      if (!source || !target) continue; // dispositivo eliminato: linea ignorata
      lines.push({
        id: conn.id,
        sourceId: conn.sourceId,
        targetId: conn.targetId,
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
      });
    }
    return lines;
  });

  // ---------------------------------------------------------------------
  // GESTIONE DISPOSITIVI
  // ---------------------------------------------------------------------

  /** Crea un nuovo dispositivo del tipo indicato e lo aggiunge al canvas. */
  addDevice(type: DeviceType): void {
    this.counters[type]++;
    const progressivo = this.counters[type].toString().padStart(2, '0');

    const newDevice: Device = {
      id: crypto.randomUUID(),
      type,
      name: `${type}-${progressivo}`,
      // Posizione iniziale leggermente randomizzata, così dispositivi creati
      // in sequenza non finiscono tutti esattamente sovrapposti.
      x: 120 + Math.round(Math.random() * 280),
      y: 100 + Math.round(Math.random() * 180),
    };

    this._devices.update((devices) => [...devices, newDevice]);
  }

  /** Aggiorna la posizione di un dispositivo (chiamato durante il drag). */
  moveDevice(id: string, x: number, y: number): void {
    this._devices.update((devices) =>
      devices.map((d) => (d.id === id ? { ...d, x, y } : d))
    );
  }

  /** Aggiorna i campi modificabili di un dispositivo (nome, ip, hostname, stato). */
  updateDevice(
    id: string,
    changes: Partial<Pick<Device, 'name' | 'ip' | 'hostname' | 'status'>>
  ): void {
    this._devices.update((devices) =>
      devices.map((d) => (d.id === id ? { ...d, ...changes } : d))
    );
  }

  /**
   * Rimuove un dispositivo e, di conseguenza, tutte le connessioni che lo
   * coinvolgono (requisito sezione 13/20: nessuna connessione "orfana").
   */
  removeDevice(id: string): void {
    const hadConnections = this._connections().some(
      (c) => c.sourceId === id || c.targetId === id
    );

    this._devices.update((devices) => devices.filter((d) => d.id !== id));
    this._connections.update((conns) =>
      conns.filter((c) => c.sourceId !== id && c.targetId !== id)
    );

    // Ripulisco anche i riferimenti a questo dispositivo nello stato di UI.
    if (this._selectedDeviceId() === id) this._selectedDeviceId.set(null);
    if (this._detailDeviceId() === id) this._detailDeviceId.set(null);

    this.setInfo(
      hadConnections
        ? 'Dispositivo eliminato insieme alle sue connessioni.'
        : 'Dispositivo eliminato.'
    );
  }

  // ---------------------------------------------------------------------
  // MODALITÀ E SELEZIONE
  // ---------------------------------------------------------------------

  /** Cambia modalità (Edit/Connect) e azzera qualunque selezione in corso. */
  setMode(mode: EditorMode): void {
    this._mode.set(mode);
    this._selectedDeviceId.set(null);
  }

  /** Annulla la selezione corrente (es. click su area vuota del canvas). */
  deselect(): void {
    this._selectedDeviceId.set(null);
  }

  /**
   * Gestisce il click su un dispositivo. Il comportamento dipende dalla
   * modalità attiva:
   * - Edit: click = seleziona/deseleziona (evidenzia soltanto).
   * - Connect: primo click = sorgente, secondo click = destinazione. Se tra i
   *   due dispositivi non esiste ancora una connessione, viene creata; se
   *   esiste già, viene rimossa. È un "interruttore" (toggle): cliccare due
   *   volte la stessa coppia di dispositivi connette e poi disconnette
   *   (vedi toggleConnection).
   */
  selectDevice(id: string): void {
    if (this._mode() === 'edit') {
      this._selectedDeviceId.set(this._selectedDeviceId() === id ? null : id);
      return;
    }

    // Modalità Connect
    const pendingSourceId = this._selectedDeviceId();
    if (!pendingSourceId) {
      // Primo click: memorizzo la sorgente e la evidenzio.
      this._selectedDeviceId.set(id);
      return;
    }

    // Secondo click: connetto o disconnetto a seconda che la connessione
    // esista già, poi azzero la selezione in ogni caso, così l'utente
    // riparte pulito per la prossima coppia.
    this.toggleConnection(pendingSourceId, id);
    this._selectedDeviceId.set(null);
  }

  // ---------------------------------------------------------------------
  // GESTIONE CONNESSIONI, DISCONNESSIONE E VALIDAZIONI (sezione 9/20 del brief)
  // ---------------------------------------------------------------------

  /**
   * Crea una connessione tra sourceId e targetId se non esiste ancora,
   * oppure la rimuove se esiste già: è un "interruttore" (toggle), non una
   * semplice creazione. Questo sostituisce il vecchio comportamento in cui
   * ricliccare la stessa coppia di dispositivi mostrava un errore di
   * "connessione duplicata" — ora, invece, disconnette.
   */
  private toggleConnection(sourceId: string, targetId: string): void {
    // Regola 1: non si può collegare un dispositivo a se stesso.
    if (sourceId === targetId) {
      this.setError('Non è possibile collegare un dispositivo a se stesso.');
      return;
    }

    // Regola 2: entrambi i dispositivi devono esistere ancora (potrebbero
    // essere stati eliminati nel frattempo).
    const idsEsistenti = new Set(this._devices().map((d) => d.id));
    if (!idsEsistenti.has(sourceId) || !idsEsistenti.has(targetId)) {
      this.setError('Uno dei dispositivi selezionati non esiste più.');
      return;
    }

    // Il modello è NON orientato, quindi A->B è considerato uguale a B->A:
    // cerco una connessione esistente in un verso o nell'altro.
    const connessioneEsistente = this._connections().find(
      (c) =>
        (c.sourceId === sourceId && c.targetId === targetId) ||
        (c.sourceId === targetId && c.targetId === sourceId)
    );

    if (connessioneEsistente) {
      // La connessione c'era già: il secondo click su questa stessa coppia
      // la rimuove, invece di segnalare un errore di duplicato.
      this._connections.update((conns) =>
        conns.filter((c) => c.id !== connessioneEsistente.id)
      );
      this.setInfo('Connessione rimossa.');
      return;
    }

    const nuovaConnessione: Connection = {
      id: crypto.randomUUID(),
      sourceId,
      targetId,
    };
    this._connections.update((conns) => [...conns, nuovaConnessione]);
    this.setInfo('Connessione creata.');
  }

  /** Elimina una singola connessione (selezionata sul canvas). */
  removeConnection(id: string): void {
    this._connections.update((conns) => conns.filter((c) => c.id !== id));
  }

  // ---------------------------------------------------------------------
  // PANNELLO DI DETTAGLIO (click destro)
  // ---------------------------------------------------------------------

  openDetails(id: string): void {
    this._detailDeviceId.set(id);
  }

  closeDetails(): void {
    this._detailDeviceId.set(null);
  }

  // ---------------------------------------------------------------------
  // NOTIFICHE (errori e messaggi informativi mostrati in cima all'app)
  // ---------------------------------------------------------------------

  setError(message: string): void {
    this._notification.set({ type: 'error', message });
  }

  setInfo(message: string): void {
    this._notification.set({ type: 'info', message });
  }

  clearNotification(): void {
    this._notification.set(null);
  }

  // ---------------------------------------------------------------------
  // PERSISTENZA (usata da StorageService / dai componenti)
  // ---------------------------------------------------------------------

  /** Sostituisce interamente lo stato corrente (usato dal "Carica topologia"). */
  loadState(devices: Device[], connections: Connection[]): void {
    this._devices.set(devices);
    this._connections.set(connections);
    this._selectedDeviceId.set(null);
    this._detailDeviceId.set(null);
    this.recalculateCounters(devices);
  }

  /** Svuota completamente la topologia corrente. */
  clearState(): void {
    this._devices.set([]);
    this._connections.set([]);
    this._selectedDeviceId.set(null);
    this._detailDeviceId.set(null);
    this.counters = { PC: 0, Switch: 0, Router: 0 };
  }

  /**
   * Dopo un caricamento da Local Storage, ricalcolo i contatori PC/Switch/Router
   * in base ai nomi già presenti, così un nuovo dispositivo aggiunto dopo un
   * "Carica" non genera un nome già usato (es. di nuovo "PC-01").
   */
  private recalculateCounters(devices: Device[]): void {
    const counters: Record<DeviceType, number> = { PC: 0, Switch: 0, Router: 0 };
    for (const d of devices) {
      const match = /-(\d+)$/.exec(d.name);
      const numero = match ? parseInt(match[1], 10) : 0;
      if (numero > counters[d.type]) counters[d.type] = numero;
    }
    this.counters = counters;
  }
}
