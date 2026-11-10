import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComercialCartera } from '../../../../../core/models/maestros.model';
import { ModalComponent }   from '../../../../../shared/ui/modal/modal.component';
import { ButtonComponent }  from '../../../../../shared/ui/button/button.component';

/**
 * Modal de asignación masiva de clientes a un comercial (observación 31/10: Cartera de clientes).
 * El comercial se elige desde la lista disponible; al confirmar se emite el `idComercial` elegido
 * para que el contenedor haga la llamada al back.
 */
@Component({
  selector: 'app-modal-asignar-comercial',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-asignar-comercial.component.html',
  styleUrl: './modal-asignar-comercial.component.scss',
})
export class ModalAsignarComercialComponent {
  readonly comerciales          = input.required<ComercialCartera[]>();
  readonly cantidadClientes     = input.required<number>();
  readonly idComercialSugerido  = input<number | null>(null);

  readonly confirmado = output<number>();
  readonly cancelado  = output<void>();

  readonly busqueda      = signal('');
  readonly idComercialSel = signal<number | null>(null);

  readonly comercialesFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return this.comerciales();
    return this.comerciales().filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.cargo?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly comercialElegido = computed(() => {
    const id = this.idComercialSel();
    if (!id) return null;
    return this.comerciales().find(c => c.id === id) ?? null;
  });

  constructor() {
    // Inicializar con la sugerencia si viene (ej. el admin ya estaba filtrando por un comercial).
    queueMicrotask(() => {
      const sug = this.idComercialSugerido();
      if (sug) this.idComercialSel.set(sug);
    });
  }

  elegir(id: number): void {
    this.idComercialSel.set(id);
  }

  confirmar(): void {
    const id = this.idComercialSel();
    if (!id) return;
    this.confirmado.emit(id);
  }

  cancelar(): void {
    this.cancelado.emit();
  }
}
