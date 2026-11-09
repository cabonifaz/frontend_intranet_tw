import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrecotizacionesService } from '../../../../core/services/precotizaciones.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CabeceraPrecotizacionApi, DetallePrecotizacionApi, ItemPrecotDetalleApi,
  ObservacionPrecotApi, PasoTrazabilidadApi,
} from '../../../../core/models/precotizaciones-api.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/**
 * HU-60 — Modal Detalle de la Precotización Técnica (lado Comercial).
 * 2 variantes por estado:
 *  - PENDIENTE: botón primario "Generar Propuesta" habilitado
 *  - CONVERTIDA: chip verde con el número de propuesta derivada + botón "Abrir Propuesta"
 */
@Component({
  selector: 'app-modal-detalle-precotizacion',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './modal-detalle-precotizacion.component.html',
  styleUrl: './modal-detalle-precotizacion.component.scss',
})
export class ModalDetallePrecotizacionComponent implements OnInit {
  private readonly svc   = inject(PrecotizacionesService);
  private readonly toast = inject(ToastService);

  readonly idPrecotizacion = input.required<number>();

  readonly cerrar           = output<void>();
  readonly generarPropuesta = output<number>();
  readonly convertida       = output<number>();

  readonly cargando = signal(true);
  readonly error    = signal<string | null>(null);
  readonly detalle  = signal<DetallePrecotizacionApi | null>(null);

  readonly cabecera      = computed<CabeceraPrecotizacionApi | null>(() => this.detalle()?.cabecera ?? null);
  readonly observaciones = computed<ObservacionPrecotApi[]>(() => this.detalle()?.observaciones ?? []);
  readonly items         = computed<ItemPrecotDetalleApi[]>(() => this.detalle()?.items ?? []);
  readonly trazabilidad  = computed<PasoTrazabilidadApi[]>(() => this.detalle()?.trazabilidad ?? []);

  readonly esConvertida = computed(() => this.cabecera()?.estadoGrupo === 'convertida');

  readonly chipEstado = computed(() => this.esConvertida() ? 'chip chip--verde' : 'chip chip--ambar');

  async ngOnInit(): Promise<void> { await this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.detalle.set(await this.svc.obtenerDetalle(this.idPrecotizacion()));
    } catch (e: unknown) {
      const m = e instanceof Error && e.message ? e.message : 'No se pudo cargar el detalle.';
      this.error.set(m);
      this.toast.error(m);
    } finally {
      this.cargando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  onGenerarPropuesta(): void {
    const c = this.cabecera();
    if (c && c.puedeConvertir) this.generarPropuesta.emit(c.idPrecotizacion);
  }

  // Helpers UI

  claseNivel(n: string | null): string {
    switch (n) {
      case 'critico':
      case 'alto':  return 'chip chip--rojo';
      case 'medio': return 'chip chip--ambar';
      case 'bajo':  return 'chip chip--azul';
      default:      return 'chip chip--gris';
    }
  }

  clasePrioridad(p: string | null): string {
    switch (p) {
      case 'alta':     return 'chip chip--rojo';
      case 'media':    return 'chip chip--ambar';
      case 'opcional': return 'chip chip--gris';
      default:         return 'chip chip--gris';
    }
  }

  iconoTraza(codigo: string | null): string {
    switch (codigo) {
      case 'rq':                 return 'description';
      case 'propuesta_origen':   return 'request_quote';
      case 'oc':                 return 'shopping_cart';
      case 'os':                 return 'engineering';
      case 'precotizacion':      return 'receipt_long';
      case 'propuesta_derivada': return 'local_offer';
      default:                   return 'circle';
    }
  }
}
