import { Component, HostListener, input, output, signal } from '@angular/core';

/**
 * Botón "FILTROS" + modal reutilizable para filtros avanzados en las bandejas.
 * Patrón homologado: botón compacto con badge de filtros activos que abre un
 * modal centrado con los selects/campos específicos de cada módulo + acciones
 * Limpiar / Cancelar / Aplicar.
 *
 * Uso:
 *   <app-filtros-popover [cantidadActivos]="2" (limpiar)="onLimpiar()" (aplicar)="onAplicar()">
 *     <label>Estado</label>
 *     <select [(ngModel)]="estadoFiltro">...</select>
 *     <!-- más campos -->
 *   </app-filtros-popover>
 */
@Component({
  selector: 'app-filtros-popover',
  imports: [],
  templateUrl: './filtros-popover.component.html',
  styleUrl: './filtros-popover.component.scss',
})
export class FiltrosPopoverComponent {
  /** Nº de filtros aplicados (muestra badge junto al botón). */
  readonly cantidadActivos = input<number>(0);
  /** Texto del botón principal. */
  readonly texto = input<string>('FILTROS');

  readonly limpiar = output<void>();
  readonly aplicar = output<void>();

  readonly abierto = signal(false);

  toggle(): void { this.abierto.update(v => !v); }
  cerrar(): void { this.abierto.set(false); }

  onLimpiar(): void {
    this.limpiar.emit();
  }

  onAplicar(): void {
    this.aplicar.emit();
    this.cerrar();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.abierto()) this.cerrar(); }
}
