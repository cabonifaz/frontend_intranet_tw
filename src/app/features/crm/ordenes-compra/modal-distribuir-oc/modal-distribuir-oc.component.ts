import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { DistribucionOrdenCompraDto } from '../../../../core/models/ordenes-compra.model';

@Component({
  selector: 'app-modal-distribuir-oc',
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent],
  templateUrl: './modal-distribuir-oc.component.html',
  styleUrl: './modal-distribuir-oc.component.scss',
})
export class ModalDistribuirOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc        = input.required<number>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly ctx       = signal<DistribucionOrdenCompraDto | null>(null);

  idPropuestaDestino: number | null = null;
  monto: number | null = null;

  readonly saldoAntes = computed(() => this.ctx()?.ordenCompra.saldoDisponible ?? 0);
  readonly saldoDespues = computed(() => {
    const antes = this.saldoAntes();
    const m = this.monto ?? 0;
    return antes - m;
  });

  readonly destinos = computed(() => {
    return this.ctx()?.aplicaciones.filter(a => a.pendiente > 0) ?? [];
  });

  get puedeGuardar(): boolean {
    const c = this.ctx();
    const m = this.monto;
    return !!c
      && this.idPropuestaDestino != null
      && m != null && m > 0
      && m <= c.ordenCompra.saldoDisponible;
  }

  constructor() {
    effect(() => {
      const id = this.idOc();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    try {
      this.ctx.set(await this.svc.prepararDistribucion(id));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al preparar la distribución.');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar || this.guardando()) return;
    this.guardando.set(true);
    try {
      await this.svc.distribuirMonto(this.idOc(), {
        idPropuesta: this.idPropuestaDestino,
        monto: this.monto,
      });
      this.toast.exito('Monto aplicado correctamente.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo aplicar el monto.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  formatearMonto(monto: number | null | undefined, simbolo?: string | null): string {
    if (monto == null) return '—';
    const s = simbolo ?? 'S/';
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${v}`;
  }
}
