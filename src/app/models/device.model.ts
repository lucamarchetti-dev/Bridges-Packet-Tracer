/**
 * I tre tipi di dispositivo supportati dall'editor.
 * Usare un "union type" invece di una stringa qualsiasi impedisce, già in fase
 * di compilazione, di scrivere per errore un tipo che non esiste (es. "Server").
 */
export type DeviceType = 'PC' | 'Switch' | 'Router';

/**
 * Stato operativo del dispositivo. Anche questo è un valore chiuso:
 * o è uno di questi tre, oppure il campo non è impostato (undefined).
 */
export type DeviceStatus = 'Online' | 'Offline' | 'Unknown';

/**
 * Un dispositivo posizionato sul canvas.
 *
 * - id: identificativo univoco, generato automaticamente alla creazione.
 * - x, y: coordinate sul canvas (in pixel), aggiornate durante il drag & drop.
 * - ip, hostname, status: campi opzionali (nota il "?"), valorizzabili dal
 *   pannello di dettaglio. Se non impostati semplicemente non esistono
 *   sull'oggetto: non mostriamo mai dati inventati.
 */
export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  x: number;
  y: number;
  ip?: string;
  hostname?: string;
  status?: DeviceStatus;
}
