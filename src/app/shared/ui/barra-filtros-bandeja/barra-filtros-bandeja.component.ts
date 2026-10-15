import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { FiltrosPopoverComponent } from '../filtros-popover/filtros-popover.component';

/**
 * Barra de filtros estándar para bandejas CRM/operativas.
 * Combina `app-filtros-popover` (filtros avanzados) + input de búsqueda +
 * botones acción (refrescar/descargar) en un único componente reutilizable.
 *
 * Uso típico:
 *   <app-barra-filtros-bandeja
 *       [cantidadActivos]="filtrosActivos()"
 *       [(busqueda)]="busqueda"
 *       placeholder="Buscar propuesta, RQ, cliente o RUC..."
 *       (limpiar)="limpiarFiltros()"
 *       (aplicar)="aplicarFiltros()">
 *     <!-- Contenido proyectado dentro del popover de filtros -->
 *     <div class="col-full">
 *       <label>RESPONSABLE</label>
 *       <select [(ngModel)]="idResponsableFiltro">...</select>
 *     </div>
 *   </app-barra-filtros-bandeja>
 *
 * Variantes:
 * - Sin input de búsqueda: `[conBusqueda]="false"` (ej. visto-bueno)
 * - Con botón descargar: `[conDescarga]="true"` + manejar `(descargar)` (ej. requerimientos)
 */
@Component({
  selector: 'app-barra-filtros-bandeja',
  imports: [FormsModule, ButtonComponent, FiltrosPopoverComponent],
  templateUrl: './barra-filtros-bandeja.component.html',
  styleUrl: './barra-filtros-bandeja.component.scss',
})
export class BarraFiltrosBandejaComponent {
  // ─── Popover de filtros avanzados ───────────────────────────────
  readonly cantidadActivos = input<number>(0);
  readonly textoFiltros    = input<string>('FILTROS');

  // ─── Input de búsqueda ──────────────────────────────────────────
  readonly busqueda    = model<string>('');
  readonly placeholder = input<string>('Buscar...');
  readonly conBusqueda = input<boolean>(true);

  // ─── Botones acción (derecha) ───────────────────────────────────
  readonly conRefresh  = input<boolean>(true);
  readonly conDescarga = input<boolean>(false);

  // ─── Eventos ────────────────────────────────────────────────────
  readonly limpiar   = output<void>();
  /** Se emite al aplicar filtros del popover, al dar Enter en el input o al clickear refresh. */
  readonly aplicar   = output<void>();
  readonly descargar = output<void>();
}
