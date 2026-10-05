import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionLineVm } from '../../services/topology.service';

/**
 * Nota sul selettore: `g[appConnectionLine]` significa "un elemento <g> che
 * abbia l'attributo appConnectionLine". In questo modo il componente può
 * essere usato direttamente dentro l'unico <svg> del canvas, come:
 *
 *   <g appConnectionLine [line]="line"></g>
 *
 * L'elemento host resta un vero <g> SVG (necessario: un tag <app-connection-line>
 * qualsiasi non sarebbe HTML/SVG valido dentro un <svg> e il browser non lo
 * renderizzerebbe), mentre il template del componente disegna le <line> al
 * suo interno.
 */
@Component({
  selector: 'g[appConnectionLine]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connection-line.component.html',
})
export class ConnectionLineComponent {
  @Input({ required: true }) line!: ConnectionLineVm;

  /** Emesso quando l'utente chiede di eliminare questa connessione (doppio click). */
  @Output() removeRequested = new EventEmitter<string>();

  onRemove(): void {
    this.removeRequested.emit(this.line.id);
  }
}
