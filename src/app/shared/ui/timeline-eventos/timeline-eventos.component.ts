import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface EventoTimeline {
  fecha?:       string | Date | null;
  titulo:       string;
  descripcion?: string | null;
  usuario?:     string | null;
  /** Área/rol/contexto que aparece junto al usuario. */
  contexto?:    string | null;
  /** Material Symbols name — si no viene, se infiere del nivel. */
  icono?:       string;
  /** azul (default) | verde (éxito) | ambar (alerta) | rojo (error) */
  nivel?:       'azul' | 'verde' | 'ambar' | 'rojo';
}

/**
 * Timeline vertical de eventos con íconos, colores y detalles.
 *
 * @example
 *   <app-timeline-eventos [eventos]="eventos()" />
 *
 *   <app-timeline-eventos [eventos]="[]" mensajeVacio="No hay actividad registrada." />
 */
@Component({
  selector: 'app-timeline-eventos',
  imports: [DatePipe],
  templateUrl: './timeline-eventos.component.html',
  styleUrl: './timeline-eventos.component.scss',
})
export class TimelineEventosComponent {
  readonly eventos      = input.required<EventoTimeline[]>();
  readonly mensajeVacio = input<string>('No hay eventos registrados.');
  readonly iconoVacio   = input<string>('inbox');

  iconoDe(ev: EventoTimeline): string {
    if (ev.icono) return ev.icono;
    switch (ev.nivel) {
      case 'verde': return 'check_circle';
      case 'ambar': return 'warning';
      case 'rojo':  return 'cancel';
      default:      return 'info';
    }
  }

  claseDe(ev: EventoTimeline): string {
    return `ev--${ev.nivel ?? 'azul'}`;
  }

  trackEvento = (i: number, ev: EventoTimeline) => `${ev.fecha}-${ev.titulo}-${i}`;
}
