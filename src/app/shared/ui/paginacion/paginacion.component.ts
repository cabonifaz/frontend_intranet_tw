import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-paginacion',
  imports: [],
  templateUrl: './paginacion.component.html',
  styleUrl: './paginacion.component.scss',
})
export class PaginacionComponent {
  readonly pagina    = input.required<number>();
  readonly total     = input.required<number>();
  readonly porPagina = input.required<number>();
  readonly etiqueta  = input<string>('ítems');

  readonly cambioPagina = output<number>();

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()) || 1);
  readonly hayAnterior  = computed(() => this.pagina() > 1);
  readonly haySiguiente = computed(() => this.pagina() < this.totalPaginas());
  readonly desde        = computed(() => (this.pagina() - 1) * this.porPagina() + 1);
  readonly hasta        = computed(() => Math.min(this.pagina() * this.porPagina(), this.total()));

  irA(p: number): void {
    if (p < 1 || p > this.totalPaginas()) return;
    this.cambioPagina.emit(p);
  }
}
