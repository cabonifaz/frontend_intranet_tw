import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { OpcionFiltro, ResponsableCorreccionDto } from '../../../../core/models/ordenes-compra.model';

@Component({
  selector: 'app-modal-observar-oc',
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent],
  templateUrl: './modal-observar-oc.component.html',
  styleUrl: './modal-observar-oc.component.scss',
})
export class ModalObservarOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc        = input.required<number>();
  readonly numeroOc    = input<string>('');
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly motivosDisponibles = signal<OpcionFiltro[]>([]);
  readonly responsables       = signal<ResponsableCorreccionDto[]>([]);
  readonly motivosSel         = signal<Set<number>>(new Set());

  detalle = '';
  idResponsable: number | null = null;

  get formularioValido(): boolean {
    return this.motivosSel().size > 0
      && this.detalle.trim().length > 0
      && this.idResponsable != null;
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
      const d = await this.svc.prepararValidacion(id);
      this.motivosDisponibles.set(d.motivos);
      this.responsables.set(d.responsables);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar motivos.');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleMotivo(id: number): void {
    const set = new Set(this.motivosSel());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.motivosSel.set(set);
  }

  async guardar(): Promise<void> {
    if (!this.formularioValido || this.guardando()) return;
    this.guardando.set(true);
    try {
      await this.svc.observarOrdenCompra(this.idOc(), {
        motivos: Array.from(this.motivosSel()),
        detalle: this.detalle.trim(),
        idResponsable: this.idResponsable!,
      });
      this.toast.exito('Observación registrada. El responsable fue notificado.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar la observación.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
