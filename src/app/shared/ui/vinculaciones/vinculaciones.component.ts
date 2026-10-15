import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

export interface Vinculacion {
  tipo:         string;
  codigo?:      string | null;
  idEntidad?:   number | null;
  descripcion?: string | null;
  estado?:      string | null;
  disponible?:  boolean;
  url?:         string | null;
  /** Material Symbols name — si no viene, se infiere del tipo. */
  icono?:       string;
  /** Etiqueta visible — si no viene, se infiere del tipo. */
  etiqueta?:    string;
}

/**
 * Grid de tarjetas que representan vinculaciones del proceso (RQ, Propuesta,
 * Expediente, Orden de Servicio, etc.).
 *
 * @example
 *   <app-vinculaciones [items]="d.vinculaciones" (abrir)="verVinculo($event)" />
 */
@Component({
  selector: 'app-vinculaciones',
  imports: [ButtonComponent],
  templateUrl: './vinculaciones.component.html',
  styleUrl: './vinculaciones.component.scss',
})
export class VinculacionesComponent {
  readonly items = input.required<Vinculacion[]>();
  readonly columnas = input<number>(2);
  readonly abrir = output<Vinculacion>();

  onAbrir(v: Vinculacion): void {
    if (v.disponible === false) return;
    this.abrir.emit(v);
  }

  iconoDe(v: Vinculacion): string {
    if (v.icono) return v.icono;
    switch (v.tipo) {
      case 'rq':
      case 'requerimiento':   return 'description';
      case 'propuesta':       return 'request_quote';
      case 'expediente':      return 'folder_open';
      case 'os':
      case 'orden_servicio':  return 'engineering';
      case 'oc':
      case 'orden_compra':    return 'receipt_long';
      default:                return 'link';
    }
  }

  etiquetaDe(v: Vinculacion): string {
    if (v.etiqueta) return v.etiqueta;
    switch (v.tipo) {
      case 'rq':
      case 'requerimiento':   return 'Requerimiento';
      case 'propuesta':       return 'Propuesta';
      case 'expediente':      return 'Expediente';
      case 'os':
      case 'orden_servicio':  return 'Orden de Servicio';
      case 'oc':
      case 'orden_compra':    return 'Orden de Compra';
      default:                return v.tipo;
    }
  }

  trackVinc = (i: number, v: Vinculacion) => `${v.tipo}-${v.idEntidad ?? v.codigo ?? i}`;
}
