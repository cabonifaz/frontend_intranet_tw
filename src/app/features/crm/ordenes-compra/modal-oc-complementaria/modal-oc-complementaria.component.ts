import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { PreparacionOcComplementariaDto } from '../../../../core/models/ordenes-compra.model';

@Component({
  selector: 'app-modal-oc-complementaria',
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent],
  templateUrl: './modal-oc-complementaria.component.html',
  styleUrl: './modal-oc-complementaria.component.scss',
})
export class ModalOcComplementariaComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly ctx       = signal<PreparacionOcComplementariaDto | null>(null);

  numeroOc = '';
  fechaOc = '';
  fechaRecepcion = '';
  monto: number | null = null;
  vigenciaDias: number | null = null;
  observaciones = '';
  referencia = '';
  archivo: File | null = null;
  nombreArchivo = '';

  readonly coberturaTotalPct = computed(() => {
    const c = this.ctx();
    const m = this.monto ?? 0;
    if (!c) return 0;
    return Math.min(100, Math.round(((c.propuesta.montoCubierto + m) / c.propuesta.montoPropuesta) * 100));
  });

  readonly coberturaTotal = computed(() => {
    const c = this.ctx();
    const m = this.monto ?? 0;
    if (!c) return 0;
    return c.propuesta.montoCubierto + m;
  });

  get puedeGuardar(): boolean {
    return !!this.ctx()
      && this.numeroOc.trim().length > 0
      && !!this.fechaOc
      && !!this.fechaRecepcion
      && this.monto != null && this.monto > 0
      && !!this.archivo;
  }

  constructor() {
    effect(() => {
      const id = this.idPropuesta();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    try {
      const c = await this.svc.prepararComplementaria(id);
      this.ctx.set(c);
      this.vigenciaDias = c.propuesta.vigenciaDiasDefecto || null;
      this.monto = c.propuesta.faltante;
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al preparar la complementaria.');
    } finally {
      this.cargando.set(false);
    }
  }

  onArchivoSeleccionado(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      this.toast.error('Solo se admite PDF.');
      return;
    }
    this.archivo = file;
    this.nombreArchivo = file.name;
  }

  quitarArchivo(): void {
    this.archivo = null;
    this.nombreArchivo = '';
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar || this.guardando()) return;
    this.guardando.set(true);
    try {
      await this.svc.registrarComplementaria(this.idPropuesta(), {
        numeroOc: this.numeroOc,
        fechaOc: this.fechaOc,
        fechaRecepcion: this.fechaRecepcion,
        monto: this.monto,
        vigenciaDias: this.vigenciaDias,
        observaciones: this.observaciones || null,
        referencia: this.referencia || null,
      }, this.archivo!);
      this.toast.exito('OC complementaria registrada.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar la OC complementaria.');
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
