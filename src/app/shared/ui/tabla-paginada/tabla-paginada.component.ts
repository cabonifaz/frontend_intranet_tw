import { Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

/**
 * Tabla con paginación integrada y estados cargando/vacío/error.
 *
 * El contenido de `<thead>` y `<tbody>` se proyecta vía `<ng-content>`.
 *
 * @example
 *   <app-tabla-paginada
 *       [cargando]="cargando()"
 *       [vacio]="items().length === 0"
 *       [total]="total()"
 *       [(pagina)]="pagina"
 *       [porPagina]="porPagina()"
 *       textoItems="órdenes de compra"
 *       (paginar)="cargar()">
 *     <thead>
 *       <tr><th>N.º OC</th><th>Fecha</th>...</tr>
 *     </thead>
 *     <tbody>
 *       @for (item of items(); track item.idOc) {
 *         <tr>...</tr>
 *       }
 *     </tbody>
 *   </app-tabla-paginada>
 */
@Component({
  selector: 'app-tabla-paginada',
  imports: [ButtonComponent],
  templateUrl: './tabla-paginada.component.html',
  styleUrl: './tabla-paginada.component.scss',
})
export class TablaPaginadaComponent {
  // ─── Estado ──────────────────────────────────────────────────────
  readonly cargando = input<boolean>(false);
  readonly vacio    = input<boolean>(false);
  readonly error    = input<string>('');

  // ─── Textos ──────────────────────────────────────────────────────
  readonly textoCargando  = input<string>('Cargando...');
  readonly textoVacio     = input<string>('No hay registros con los filtros aplicados.');
  readonly textoItems     = input<string>('registros');
  readonly iconoVacio     = input<string>('inbox');

  // ─── Paginación ──────────────────────────────────────────────────
  readonly total     = input<number>(0);
  readonly pagina    = input<number>(1);
  readonly porPagina = input<number>(10);
  readonly conPaginacion = input<boolean>(true);

  // ─── Eventos ─────────────────────────────────────────────────────
  readonly paginar = output<number>();

  // ─── Derivados ───────────────────────────────────────────────────
  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()) || 1);
  readonly inicio = computed(() => (this.pagina() - 1) * this.porPagina() + 1);
  readonly fin    = computed(() => Math.min(this.pagina() * this.porPagina(), this.total()));
  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const rango: number[] = [];
    const ini = Math.max(1, actual - 2);
    const f   = Math.min(total, actual + 2);
    for (let i = ini; i <= f; i++) rango.push(i);
    return rango;
  });

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas() || p === this.pagina()) return;
    this.paginar.emit(p);
  }
}
