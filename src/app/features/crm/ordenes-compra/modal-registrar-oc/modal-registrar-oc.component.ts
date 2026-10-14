import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  DatosOrdenCompraDto,
  MonedaOrdenCompraDto,
  OrdenCompraEdicionDto,
  PropuestaOrdenCompraDto,
  PropuestaSinOrdenCompraDto,
} from '../../../../core/models/ordenes-compra.model';

type Modo = 'crear' | 'editar';

@Component({
  selector: 'app-modal-registrar-oc',
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent],
  templateUrl: './modal-registrar-oc.component.html',
  styleUrl: './modal-registrar-oc.component.scss',
})
export class ModalRegistrarOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly modo = input<Modo>('crear');
  readonly idPropuestaPreseleccionada = input<number | null>(null);
  readonly idOcEditar = input<number | null>(null);

  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargando    = signal(true);
  readonly guardando   = signal(false);
  readonly error       = signal('');

  readonly propuestas   = signal<PropuestaSinOrdenCompraDto[]>([]);
  readonly propuestaSel = signal<PropuestaOrdenCompraDto | null>(null);
  readonly ocEdicion    = signal<OrdenCompraEdicionDto | null>(null);
  readonly monedas      = signal<MonedaOrdenCompraDto[]>([]);

  // Form
  numeroOc = '';
  fechaOc = '';
  fechaRecepcion = '';
  idMoneda: number = 2;
  monto: number | null = null;
  vigenciaDias: number | null = 30;
  observaciones = '';
  referencia = '';
  archivo: File | null = null;
  nombreArchivo = '';

  /** True si la OC a editar tiene observación activa (motivo != null o estado 'observada'). */
  get tieneObservacionAbierta(): boolean {
    const oc = this.ocEdicion();
    if (!oc) return false;
    return (oc.idMotivoObservacion != null && oc.idMotivoObservacion > 0)
      || oc.estado === 'observada'
      || oc.estadoVisual === 'observada';
  }

  readonly coberturaPct = computed(() => {
    const p = this.propuestaSel();
    const m = this.monto;
    if (!p || m == null || p.total === 0) return 0;
    return Math.round((m / p.total) * 100 * 10) / 10;
  });

  readonly diferencia = computed(() => {
    const p = this.propuestaSel();
    const m = this.monto;
    if (!p || m == null) return 0;
    return m - p.total;
  });

  readonly coberturaClase = computed(() => {
    const pct = this.coberturaPct();
    if (pct >= 100) return 'cov--ok';
    if (pct >= 60)  return 'cov--mid';
    return 'cov--bad';
  });

  readonly coberturaLabel = computed(() => {
    const pct = this.coberturaPct();
    if (pct >= 100) return 'COBERTURA COMPLETA';
    if (pct >= 60)  return 'COBERTURA PARCIAL';
    return 'COBERTURA INSUFICIENTE';
  });

  get formularioValido(): boolean {
    const basico = this.numeroOc.trim().length > 0
      && !!this.fechaOc
      && !!this.fechaRecepcion
      && this.monto != null && this.monto > 0;
    if (this.modo() === 'editar') return basico;
    return basico && !!this.propuestaSel() && !!this.archivo;
  }

  constructor() {
    effect(() => {
      void this.cargar();
    });
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      if (this.modo() === 'editar' && this.idOcEditar()) {
        const r = await this.svc.prepararEdicion(this.idOcEditar()!);
        this.ocEdicion.set(r.ordenCompra);
        this.monedas.set(r.monedas);
        this.hidratarFormularioEdicion(r.ordenCompra);
      } else {
        const pre = this.idPropuestaPreseleccionada();
        if (pre) {
          const prep = await this.svc.prepararRegistro(pre);
          this.monedas.set(prep.monedas);
          this.propuestaSel.set(prep.propuesta);
          this.hidratarFormularioRegistro(prep.propuesta);
        } else {
          const lista = await this.svc.obtenerPropuestasPendientes();
          this.propuestas.set(lista);
        }
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al preparar el formulario.');
    } finally {
      this.cargando.set(false);
    }
  }

  private hidratarFormularioRegistro(p: PropuestaOrdenCompraDto): void {
    this.idMoneda = p.idMoneda;
    if (this.monto == null) this.monto = p.total;
    this.vigenciaDias = p.vigenciaDiasDefecto || 30;
  }

  private hidratarFormularioEdicion(o: OrdenCompraEdicionDto): void {
    this.numeroOc = o.numeroOc;
    this.referencia = o.referencia ?? '';
    this.fechaOc = o.fechaOc ?? '';
    this.fechaRecepcion = o.fechaRecepcion ?? '';
    this.idMoneda = o.idMoneda;
    this.monto = o.montoOc;
    this.vigenciaDias = o.vigenciaDias ?? null;
    this.observaciones = o.observaciones ?? '';
    this.nombreArchivo = o.nombreArchivoPdf ?? '';
  }

  async seleccionarPropuesta(p: PropuestaSinOrdenCompraDto): Promise<void> {
    try {
      const prep = await this.svc.prepararRegistro(p.idPropuesta);
      this.monedas.set(prep.monedas);
      this.propuestaSel.set(prep.propuesta);
      this.hidratarFormularioRegistro(prep.propuesta);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la propuesta.');
    }
  }

  limpiarSeleccion(): void {
    if (this.idPropuestaPreseleccionada()) return;
    this.propuestaSel.set(null);
    this.monto = null;
  }

  onArchivoSeleccionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
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
    if (!this.formularioValido || this.guardando()) return;
    this.guardando.set(true);
    try {
      const datos: DatosOrdenCompraDto = {
        numeroOc: this.numeroOc,
        fechaOc: this.fechaOc,
        fechaRecepcion: this.fechaRecepcion,
        idMoneda: this.idMoneda,
        monto: this.monto,
        vigenciaDias: this.vigenciaDias,
        observaciones: this.observaciones || null,
        referencia: this.referencia || null,
      };
      if (this.modo() === 'editar' && this.idOcEditar()) {
        const revalidar = this.tieneObservacionAbierta;
        await this.svc.editarOrdenCompra(this.idOcEditar()!, { ...datos, revalidar }, this.archivo);
        this.toast.exito(revalidar
          ? 'OC actualizada. Se notificó al Jefe Comercial para revalidar.'
          : 'OC actualizada.');
      } else {
        await this.svc.registrarOrdenCompra(this.propuestaSel()!.idPropuesta, datos, this.archivo!);
        this.toast.exito('OC registrada. Se notificó a Contabilidad y Operaciones.');
      }
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al registrar la OC.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  formatearMonto(monto: number | null, simbolo?: string | null): string {
    if (monto == null) return '—';
    const s = simbolo ?? 'S/';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`;
  }
}
