import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import { PreparacionCierreSeguimiento } from '../../../../core/models/seguimiento.model';

@Component({
  selector: 'app-modal-cerrar-sin-venta',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-cerrar-sin-venta.component.html',
  styleUrl: './modal-cerrar-sin-venta.component.scss',
})
export class ModalCerrarSinVentaComponent {
  private readonly svc   = inject(SeguimientoService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargandoDatos = signal(true);
  readonly datos         = signal<PreparacionCierreSeguimiento | null>(null);
  readonly enviando      = signal(false);

  readonly idMotivo              = signal<number | null>(null);
  readonly detalle               = signal<string>('');
  readonly permitirReactivacion  = signal(false);
  readonly confirmoCierre        = signal(false);

  readonly puedeGuardar = computed(() => {
    return this.idMotivo() !== null && this.detalle().trim().length > 0 && this.confirmoCierre();
  });

  readonly subtitulo = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return `${d.cabecera.numero} / ${d.cabecera.razonSocial}`;
  });

  constructor() {
    effect(() => {
      const id = this.idPropuesta();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargandoDatos.set(true);
    try {
      const d = await this.svc.prepararCierre(id);
      this.datos.set(d);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar los datos de cierre.');
    } finally {
      this.cargandoDatos.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  formatearMonto(monto: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`;
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar() || this.enviando()) return;
    this.enviando.set(true);
    try {
      await this.svc.cerrarSinVenta(this.idPropuesta(), {
        idMotivo:             this.idMotivo(),
        detalle:              this.detalle() || null,
        permitirReactivacion: this.permitirReactivacion(),
        confirmoCierre:       this.confirmoCierre(),
      });
      this.toast.exito('Seguimiento cerrado sin venta correctamente.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cerrar sin venta.');
    } finally {
      this.enviando.set(false);
    }
  }
}
