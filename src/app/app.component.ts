import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { NetworkCanvasComponent } from './components/network-canvas/network-canvas.component';
import { DeviceDetailsComponent } from './components/device-details/device-details.component';
import { TopologyService } from './services/topology.service';
import { StorageService } from './services/storage.service';
import { ViewportService } from './services/viewport.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, NetworkCanvasComponent, DeviceDetailsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  protected readonly topology = inject(TopologyService);
  private readonly storage = inject(StorageService);
  private readonly viewport = inject(ViewportService);

  constructor() {
    // Requisito sezione 15: "al caricamento dell'applicazione, se esiste una
    // topologia salvata, consentire il ripristino". Qui la ripristiniamo
    // subito, zoom compreso, e informiamo l'utente con una notifica (che può
    // comunque cancellare in qualsiasi momento con "Cancella topologia").
    const saved = this.storage.load();
    if (saved) {
      this.topology.loadState(saved.devices, saved.connections);
      this.viewport.setZoom(saved.zoom ?? 1);
      this.viewport.setPan(saved.panX ?? 0, saved.panY ?? 0);
      this.topology.setInfo('Topologia precedente ripristinata dal Local Storage.');
    }
  }

  dismissNotification(): void {
    this.topology.clearNotification();
  }
}
