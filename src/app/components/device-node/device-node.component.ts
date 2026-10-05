import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Device } from '../../models/device.model';
import { TopologyService } from '../../services/topology.service';
import { ViewportService } from '../../services/viewport.service';

@Component({
  selector: 'app-device-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-node.component.html',
  styleUrl: './device-node.component.css',
})
export class DeviceNodeComponent {
  /** Il dispositivo da disegnare, passato dal componente canvas. */
  @Input({ required: true }) device!: Device;

  protected readonly topology = inject(TopologyService);
  private readonly viewport = inject(ViewportService);

  /** True se questo è il dispositivo attualmente selezionato/evidenziato. */
  protected readonly isSelected = computed(
    () => this.topology.selectedDeviceId() === this.device.id
  );

  // Stato di drag "locale" al componente: non serve un Signal condiviso,
  // riguarda solo l'interazione del mouse su QUESTO nodo.
  private dragging = false;
  private lastClientX = 0;
  private lastClientY = 0;

  /**
   * Inizio del trascinamento. Il drag è permesso solo in modalità Edit:
   * in modalità Connect il click deve servire solo a selezionare gli estremi
   * della connessione, non a spostare i dispositivi.
   */
  onPointerDown(event: PointerEvent): void {
    if (this.topology.mode() !== 'edit') return;

    // Evita che il click "attraversi" il nodo e arrivi al canvas sottostante
    // (che altrimenti interpreterebbe il click come "deseleziona tutto").
    event.stopPropagation();

    this.dragging = true;
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;

    // Il pointer capture fa sì che questo stesso elemento continui a
    // ricevere pointermove/pointerup anche se il mouse esce dai suoi confini
    // durante il trascinamento veloce.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  /**
   * Durante il trascinamento calcoliamo lo spostamento (delta) rispetto
   * all'ultima posizione nota del puntatore, e lo sommiamo alla posizione
   * attuale del dispositivo. Usare un delta invece delle coordinate assolute
   * del mouse evita di dover conoscere la posizione del canvas sullo schermo.
   */
  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;

    // Se il canvas è ingrandito/rimpicciolito con un transform: scale(),
    // un movimento di "10px sullo schermo" NON corrisponde più a "10px"
    // nelle coordinate logiche del dispositivo. Dividendo per il livello
    // di zoom attuale, il drag resta proporzionalmente corretto a qualunque
    // livello di ingrandimento (es. a zoom 200%, 20px di movimento reale
    // del mouse spostano il dispositivo di soli 10px in coordinate logiche).
    const zoom = this.viewport.zoom();
    const deltaX = (event.clientX - this.lastClientX) / zoom;
    const deltaY = (event.clientY - this.lastClientY) / zoom;
    this.lastClientX = event.clientX;
    this.lastClientY = event.clientY;

    this.topology.moveDevice(this.device.id, this.device.x + deltaX, this.device.y + deltaY);
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  /** Click semplice: selezione (Edit) oppure passo di creazione connessione (Connect). */
  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.topology.selectDevice(this.device.id);
  }

  /** Click destro: apre il pannello di dettaglio invece del menu del browser. */
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.topology.openDetails(this.device.id);
  }
}
