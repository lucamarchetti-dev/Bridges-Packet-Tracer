import { Injectable } from '@angular/core';
import { Device, DeviceType } from '../models/device.model';
import { Connection } from '../models/connection.model';

/** Chiave usata nel Local Storage. Versionata, per poter cambiare formato in futuro. */
const STORAGE_KEY = 'network-topology-editor:v1';

const VALID_TYPES: DeviceType[] = ['PC', 'Switch', 'Router'];

interface StoredTopology {
  devices: Device[];
  connections: Connection[];
  /** Opzionali: le topologie salvate prima dell'introduzione di zoom/pan non li contengono. */
  zoom?: number;
  panX?: number;
  panY?: number;
}

/**
 * Unico responsabile della persistenza. Non conosce Signals né lo stato
 * dell'applicazione: riceve array semplici e restituisce array semplici.
 * Questo lo rende facile da testare e da sostituire (es. con un backend
 * remoto) senza toccare il resto dell'app.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  save(
    devices: Device[],
    connections: Connection[],
    zoom?: number,
    panX?: number,
    panY?: number
  ): void {
    const payload: StoredTopology = { devices, connections };
    // Aggiungo questi campi solo se effettivamente passati come numeri
    // validi: così il payload resta pulito, senza "zoom: undefined" o
    // simili salvati nel JSON.
    if (typeof zoom === 'number') payload.zoom = zoom;
    if (typeof panX === 'number') payload.panX = panX;
    if (typeof panY === 'number') payload.panY = panY;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  /**
   * Legge la topologia salvata. Restituisce `null` sia se non c'è nulla di
   * salvato, sia se il contenuto è presente ma corrotto/non valido: in
   * nessun caso l'app deve andare in errore per colpa di dati esterni.
   */
  load(): StoredTopology | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!this.isValidTopology(parsed)) {
        console.warn('Dati di topologia presenti nel Local Storage ma non validi.');
        return null;
      }
      return parsed;
    } catch {
      // JSON.parse ha fallito: dati corrotti.
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  hasSavedTopology(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  /**
   * Controllo "manuale" della forma dei dati (niente librerie esterne, come
   * richiesto dal brief). Verifica che ogni dispositivo abbia i campi
   * minimi indispensabili e che ogni connessione punti a dispositivi
   * effettivamente presenti nell'elenco.
   */
  private isValidTopology(data: unknown): data is StoredTopology {
    if (!data || typeof data !== 'object') return false;
    const candidate = data as Partial<StoredTopology>;

    if (!Array.isArray(candidate.devices) || !Array.isArray(candidate.connections)) {
      return false;
    }

    const devicesValid = candidate.devices.every(
      (d) =>
        d &&
        typeof d === 'object' &&
        typeof (d as Device).id === 'string' &&
        VALID_TYPES.includes((d as Device).type) &&
        typeof (d as Device).name === 'string' &&
        typeof (d as Device).x === 'number' &&
        typeof (d as Device).y === 'number'
    );
    if (!devicesValid) return false;

    const idDispositiviValidi = new Set(candidate.devices.map((d) => (d as Device).id));
    const connectionsValid = candidate.connections.every(
      (c) =>
        c &&
        typeof c === 'object' &&
        typeof (c as Connection).id === 'string' &&
        typeof (c as Connection).sourceId === 'string' &&
        typeof (c as Connection).targetId === 'string' &&
        idDispositiviValidi.has((c as Connection).sourceId) &&
        idDispositiviValidi.has((c as Connection).targetId)
    );
    if (!connectionsValid) return false;

    // zoom/panX/panY sono opzionali: se mancano va bene (topologia salvata
    // prima di questa funzionalità), ma se presenti devono essere numeri validi.
    if (candidate.zoom !== undefined && typeof candidate.zoom !== 'number') {
      return false;
    }
    if (candidate.panX !== undefined && typeof candidate.panX !== 'number') {
      return false;
    }
    if (candidate.panY !== undefined && typeof candidate.panY !== 'number') {
      return false;
    }

    return true;
  }
}
