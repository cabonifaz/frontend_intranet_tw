import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { PropuestaDisponibleOcDto } from '../../../../core/models/ordenes-compra.model';

/**
 * Modal "Seleccionar propuesta adicional a vincular" — usado en la ficha de registro de OC
 * cuando el comercial quiere agregar otra propuesta aceptada del mismo cliente a la OC.
 *
 * No consulta al back: recibe la lista `propuestas` desde el padre (ya la cargó el back
 * en la preparación de la ficha).
 */
@Component({
  selector: 'app-seleccionar-propuesta-vincular',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './seleccionar-propuesta-vincular.component.html',
  styleUrl: './seleccionar-propuesta-vincular.component.scss',
})
export class SeleccionarPropuestaVincularComponent {
  readonly propuestas = input.required<PropuestaDisponibleOcDto[]>();
  readonly confirmado = output<PropuestaDisponibleOcDto>();
  readonly cancelado  = output<void>();

  readonly seleccionado = signal<PropuestaDisponibleOcDto | null>(null);
  readonly busqueda     = signal<string>('');
  readonly pagina       = signal(1);
  readonly porPagina    = 6;

  readonly propuestasFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return this.propuestas();
    return this.propuestas().filter(p =>
      p.numero.toLowerCase().includes(q)
      || (p.contacto ?? '').toLowerCase().includes(q)
      || (p.numeroRq ?? '').toLowerCase().includes(q)
    );
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.propuestasFiltradas().length / this.porPagina)),
  );

  readonly propuestasPagina = computed(() => {
    const inicio = (this.pagina() - 1) * this.porPagina;
    return this.propuestasFiltradas().slice(inicio, inicio + this.porPagina);
  });

  get inicio(): number { return this.propuestasFiltradas().length === 0 ? 0 : (this.pagina() - 1) * this.porPagina + 1; }
  get fin():    number { return Math.min(this.pagina() * this.porPagina, this.propuestasFiltradas().length); }

  irPagina(n: number): void {
    if (n < 1 || n > this.totalPaginas()) return;
    this.pagina.set(n);
  }

  seleccionar(p: PropuestaDisponibleOcDto): void { this.seleccionado.set(p); }
  cancelar(): void { this.cancelado.emit(); }
  confirmar(): void {
    const s = this.seleccionado();
    if (s) this.confirmado.emit(s);
  }

  formatearMonto(monto: number | null | undefined, simbolo?: string | null): string {
    if (monto == null) return '—';
    const s = simbolo ?? '';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`.trim();
  }
}
