import { Component, model, input, output } from '@angular/core';

export interface Tab {
  codigo: string;
  label: string;
  icono?: string;
  /** Dot/badge rojo (ej. corrección pendiente). */
  alerta?: boolean;
  /** Deshabilita el tab (ej. permiso faltante). */
  deshabilitado?: boolean;
  /** Oculta el tab (puede dejarse por lógica declarativa). */
  oculto?: boolean;
}

/**
 * Tabs horizontales reutilizables.
 *
 * @example
 *   readonly tabs: Tab[] = [
 *     { codigo: 'resumen', label: 'Resumen' },
 *     { codigo: 'documentos', label: 'Documentos' },
 *     { codigo: 'historial', label: 'Historial', alerta: true },
 *   ];
 *   activo = signal<string>('resumen');
 *
 *   <app-tabs [tabs]="tabs" [(activo)]="activo" />
 */
@Component({
  selector: 'app-tabs',
  imports: [],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
})
export class TabsComponent {
  readonly tabs    = input.required<Tab[]>();
  readonly activo  = model.required<string>();
  readonly cambio  = output<string>();

  onClick(t: Tab): void {
    if (t.deshabilitado) return;
    this.activo.set(t.codigo);
    this.cambio.emit(t.codigo);
  }
}
