import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopologyService } from '../../services/topology.service';
import { DeviceStatus } from '../../models/device.model';

@Component({
  selector: 'app-device-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './device-details.component.html',
  styleUrl: './device-details.component.css',
})
export class DeviceDetailsComponent {
  protected readonly topology = inject(TopologyService);

  /** Il dispositivo attualmente mostrato nel pannello (null = pannello chiuso). */
  protected readonly device = this.topology.detailDevice;

  protected readonly statusOptions: DeviceStatus[] = ['Online', 'Offline', 'Unknown'];

  // Campi "locali" del form. Non sono Signal: sono semplici proprietà legate
  // con [(ngModel)], perché rappresentano una bozza di modifica che diventa
  // stato ufficiale solo al click su "Salva modifiche".
  protected name = '';
  protected ip = '';
  protected hostname = '';
  protected status: DeviceStatus | '' = '';

  constructor() {
    // effect() qui è realmente necessario (non sarebbe esprimibile con un
    // computed, perché deve SCRIVERE su proprietà normali, non calcolare un
    // valore): ogni volta che cambia il dispositivo mostrato, ricarico i
    // campi del form con i suoi valori correnti, senza dati inventati per
    // le proprietà non impostate.
    effect(() => {
      const d = this.device();
      this.name = d?.name ?? '';
      this.ip = d?.ip ?? '';
      this.hostname = d?.hostname ?? '';
      this.status = d?.status ?? '';
    });
  }

  save(): void {
    const d = this.device();
    if (!d) return;

    this.topology.updateDevice(d.id, {
      name: this.name.trim() || d.name,
      ip: this.ip.trim() || undefined,
      hostname: this.hostname.trim() || undefined,
      status: this.status || undefined,
    });
    this.topology.setInfo('Dispositivo aggiornato.');
  }

  remove(): void {
    const d = this.device();
    if (!d) return;
    this.topology.removeDevice(d.id);
  }

  close(): void {
    this.topology.closeDetails();
  }
}
