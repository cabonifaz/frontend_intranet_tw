import { Component, input } from '@angular/core';

/**
 * Grid responsivo para KPIs. Proyecta cualquier contenido (típicamente `app-kpi-card`).
 *
 * @example
 *   <app-kpi-grid [columnas]="6">
 *     <app-kpi-card ... />
 *     <app-kpi-card ... />
 *   </app-kpi-grid>
 */
@Component({
  selector: 'app-kpi-grid',
  imports: [],
  templateUrl: './kpi-grid.component.html',
  styleUrl: './kpi-grid.component.scss',
})
export class KpiGridComponent {
  /** Nº de columnas en desktop (en móvil siempre colapsa a 1-2). */
  readonly columnas = input<number>(4);
}
