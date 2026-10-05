import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopologyService } from '../../services/topology.service';
import { StorageService } from '../../services/storage.service';
import { ViewportService } from '../../services/viewport.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
})
export class ToolbarComponent {
  // `protected` perché queste proprietà servono solo al template di QUESTO
  // componente, non devono essere accessibili da chi lo usa da fuori.
  protected readonly topology = inject(TopologyService);
  // `private`: il template della toolbar non usa più direttamente lo zoom
  // (i controlli sono ora nel canvas), ma il servizio serve ancora qui per
  // includere zoom/pan nel salvataggio e nel ripristino della topologia.
  private readonly viewport = inject(ViewportService);
  private readonly storage = inject(StorageService);

  addPc(): void {
    this.topology.addDevice('PC');
  }

  addSwitch(): void {
    this.topology.addDevice('Switch');
  }

  addRouter(): void {
    this.topology.addDevice('Router');
  }

  setEditMode(): void {
    this.topology.setMode('edit');
  }

  setConnectMode(): void {
    this.topology.setMode('connect');
  }

  saveTopology(): void {
    // Salvo anche zoom e pan correnti insieme a dispositivi e connessioni,
    // così ricaricando la topologia si ritrova la stessa identica visuale
    // con cui era stata salvata.
    this.storage.save(
      this.topology.devices(),
      this.topology.connections(),
      this.viewport.zoom(),
      this.viewport.panX(),
      this.viewport.panY()
    );
    this.topology.setInfo('Topologia salvata nel Local Storage.');
  }

  loadTopology(): void {
    const data = this.storage.load();
    if (!data) {
      this.topology.setError('Nessuna topologia valida trovata nel Local Storage.');
      return;
    }
    this.topology.loadState(data.devices, data.connections);
    // data.zoom/panX/panY potrebbero non esistere (topologia salvata prima
    // di questa funzionalità): in quel caso ripiego sui valori di default.
    this.viewport.setZoom(data.zoom ?? 1);
    this.viewport.setPan(data.panX ?? 0, data.panY ?? 0);
    this.topology.setInfo('Topologia caricata dal Local Storage.');
  }

  clearTopology(): void {
    this.storage.clear();
    this.topology.clearState();
    this.viewport.resetView();
    this.topology.setInfo('Topologia cancellata.');
  }
}
