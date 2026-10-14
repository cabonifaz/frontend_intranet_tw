import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { PreparacionLiberacionDto, ValidacionLiberacionDto } from '../../../../core/models/ordenes-compra.model';

@Component({
  selector: 'app-modal-liberar-oc',
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent],
  templateUrl: './modal-liberar-oc.component.html',
  styleUrl: './modal-liberar-oc.component.scss',
})
export class ModalLiberarOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc        = input.required<number>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly ctx       = signal<PreparacionLiberacionDto | null>(null);

  comentario = '';
  confirmaImpacto = false;

  get puedeLiberar(): boolean {
    const c = this.ctx();
    if (!c) return false;
    if (!c.cabecera.puedeLiberar) return false;
    if (c.cabecera.requiereConfirmacion && !this.confirmaImpacto) return false;
    return true;
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
      this.ctx.set(await this.svc.prepararLiberacion(id));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al preparar la liberación.');
    } finally {
      this.cargando.set(false);
    }
  }

  async liberar(): Promise<void> {
    if (!this.puedeLiberar || this.guardando()) return;
    this.guardando.set(true);
    try {
      await this.svc.liberarOrdenCompra(this.idOc(), {
        confirmaImpacto: this.confirmaImpacto,
        comentario: this.comentario || null,
      });
      this.toast.exito('Expediente liberado para Programación.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo liberar la OC.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  iconoValid(v: ValidacionLiberacionDto): string {
    if (v.estado === 'cumple')     return 'check_circle';
    if (v.estado === 'alerta')     return 'warning';
    return 'cancel';
  }

  chipValid(v: ValidacionLiberacionDto): string {
    if (v.estado === 'cumple')     return 'Verificado';
    if (v.estado === 'alerta')     return 'ALERTA';
    return 'BLOQUEANTE';
  }
}
