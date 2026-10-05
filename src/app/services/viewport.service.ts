import { Injectable, computed, signal } from '@angular/core';

/**
 * Limiti e passo dello zoom. Tenerli come costanti evita "numeri magici"
 * sparsi nel codice e rende facile cambiarli in un solo punto.
 */
const MIN_ZOOM = 0.4; // 40%: oltre non avrebbe senso, il canvas diventerebbe illeggibile
const MAX_ZOOM = 2; // 200%
const ZOOM_STEP = 0.15;
const DEFAULT_ZOOM = 1; // 100%

/**
 * Stato di visualizzazione del canvas: zoom e pan (spostamento della vista).
 * Separato volutamente da TopologyService: qui non ci sono "dati di rete",
 * solo una preferenza di come li stiamo guardando. Tenerlo distinto rende
 * chiaro, leggendo il codice, quali Signal riguardano i DATI e quali
 * riguardano la VISTA.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly _zoom = signal(DEFAULT_ZOOM);
  private readonly _panX = signal(0);
  private readonly _panY = signal(0);

  readonly zoom = this._zoom.asReadonly();
  readonly panX = this._panX.asReadonly();
  readonly panY = this._panY.asReadonly();

  /** Il valore percentuale pronto per essere mostrato in UI (es. 100, 130, 70). */
  readonly zoomPercentage = computed(() => Math.round(this._zoom() * 100));

  zoomIn(): void {
    this.setZoom(this._zoom() + ZOOM_STEP);
  }

  zoomOut(): void {
    this.setZoom(this._zoom() - ZOOM_STEP);
  }

  resetZoom(): void {
    this._zoom.set(DEFAULT_ZOOM);
  }

  /**
   * Imposta uno zoom specifico, "bloccandolo" (clamp) dentro i limiti
   * consentiti: se provi ad andare oltre MAX_ZOOM o sotto MIN_ZOOM, il
   * valore viene automaticamente riportato al limite più vicino.
   */
  setZoom(value: number): void {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    // Arrotondo a 2 decimali per evitare che somme ripetute di ZOOM_STEP
    // producano valori tipo 1.2999999999999998 per errori di virgola mobile.
    this._zoom.set(Math.round(clamped * 100) / 100);
  }

  /**
   * Sposta la vista di un delta (in pixel "schermo", non in coordinate del
   * canvas). Chiamato ripetutamente mentre l'utente trascina lo sfondo del
   * canvas per "navigare" dopo uno zoom. Niente limiti massimi qui: l'utente
   * deve poter scorrere liberamente in qualunque direzione.
   */
  pan(deltaX: number, deltaY: number): void {
    this._panX.update((x) => x + deltaX);
    this._panY.update((y) => y + deltaY);
  }

  resetPan(): void {
    this._panX.set(0);
    this._panY.set(0);
  }

  /** Imposta direttamente una posizione di pan, usata dal ripristino da Local Storage. */
  setPan(x: number, y: number): void {
    this._panX.set(x);
    this._panY.set(y);
  }

  /** Riporta la vista allo stato iniziale: zoom 100% e nessuno spostamento. */
  resetView(): void {
    this.resetZoom();
    this.resetPan();
  }
}
