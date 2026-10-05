import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopologyService } from '../../services/topology.service';
import { ViewportService } from '../../services/viewport.service';
import { DeviceNodeComponent } from '../device-node/device-node.component';
import { ConnectionLineComponent } from '../connection-line/connection-line.component';

@Component({
  selector: 'app-network-canvas',
  standalone: true,
  imports: [CommonModule, DeviceNodeComponent, ConnectionLineComponent],
  templateUrl: './network-canvas.component.html',
  styleUrl: './network-canvas.component.css',
})
export class NetworkCanvasComponent {
  protected readonly topology = inject(TopologyService);
  protected readonly viewport = inject(ViewportService);

  // Stato locale del trascinamento dello sfondo (pan). Variabili normali,
  // non Signal: sono un dettaglio tecnico dell'interazione del mouse su
  // QUESTO componente, non "stato applicativo" che altri devono leggere.
  protected panning = false;
  private lastClientX = 0;
  private lastClientY = 0;
  private didPanSignificantly = false;

  /**
   * Click su area vuota del canvas: annulla la selezione corrente.
   * Eccezione: se il click arriva subito dopo un trascinamento del canvas
   * (l'utente stava navigando, non cliccando a vuoto), non deseleziono
   * nulla — altrimenti ogni pan "nasconderebbe" anche il dispositivo che
   * magari era selezionato prima di iniziare a navigare.
   */
  onCanvasClick(): void {
    if (this.didPanSignificantly) {
      this.didPanSignificantly = false;
      return;
    }
    this.topology.deselect();
  }

  onRemoveConnection(id: string): void {
    this.topology.removeConnection(id);
  }

  /**
   * Inizio di un possibile trascinamento dello sfondo. Parte solo se:
   * - siamo in modalità Edit (in Connect il click serve a selezionare, non a navigare);
   * - il bersaglio diretto dell'evento NON è un dispositivo, una linea di
   *   connessione o il pannello di zoom. Uso `closest(...)` invece di un confronto di identità
   *   (`event.target === event.currentTarget`) perché questo ascoltatore è
   *   agganciato a `.canvas` (il contenitore esterno, MAI spostato dal
   *   pan/zoom — a differenza di `.canvas-content`, che si trasla insieme
   *   al contenuto e quindi, dopo un pan, non copre più esattamente la
   *   stessa area di `.canvas`). Con `closest()`, qualunque punto "libero"
   *   venga cliccato — che il bersaglio preciso sia `.canvas` stesso o
   *   `.canvas-content` sopra di esso — avvia comunque il pan; si esclude
   *   solo quando il click è avvenuto davvero su un nodo o su una linea.
   */
  onBackgroundPointerDown(event: PointerEvent): void {
    if (this.topology.mode() !== 'edit') return;

    const target = event.target as HTMLElement;
    if (target.closest('.device-node, .connection-hitbox, .zoom-controls')) return;

    this.panning = true;
    this.didPanSignificantly = false;
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onBackgroundPointerMove(event: PointerEvent): void {
    if (!this.panning) return;

    const deltaX = event.clientX - this.lastClientX;
    const deltaY = event.clientY - this.lastClientY;
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;

    // Soglia minima: sotto i 3px di movimento totale consideriamo il gesto
    // ancora un "click", non un trascinamento vero e proprio.
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      this.didPanSignificantly = true;
    }

    this.viewport.pan(deltaX, deltaY);
  }

  onBackgroundPointerUp(event: PointerEvent): void {
    if (!this.panning) return;
    this.panning = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  /**
   * Zoom con la rotellina del mouse (o gesto pinch del trackpad, che il
   * browser traduce comunque in un evento "wheel"). preventDefault() evita
   * che la pagina scrolli mentre l'utente sta invece zoomando il canvas.
   */
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.viewport.zoomIn();
    } else {
      this.viewport.zoomOut();
    }
  }
}