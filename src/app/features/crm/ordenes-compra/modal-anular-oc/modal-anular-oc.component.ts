import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import {
  PreparacionAnulacionOcDto,
} from '../../../../core/models/ordenes-compra.model';

/**
 * HU-28 — Anulación de Orden de Compra.
 * Carga el impacto desde el back (GET /anulacion), muestra impacto crítico si hay OS en ejecución,
 * y confirma con POST /anular.
 */
@Component({
  selector: 'app-modal-anular-oc',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, MonedaPipe],
  templateUrl: './modal-anular-oc.component.html',
  styleUrl: './modal-anular-oc.component.scss',
})
export class ModalAnularOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc     = input.required<number>();
  readonly numeroOc = input.required<string>();
  readonly cerrar     = output<void>();
  readonly confirmado = output<void>();

  readonly cargando   = signal(true);
  readonly enviando   = signal(false);
  readonly preparacion = signal<PreparacionAnulacionOcDto | null>(null);

  readonly idMotivo        = signal<number | null>(null);
  readonly justificacion   = signal<string>('');
  readonly confirmoImpacto = signal<boolean>(false);

  readonly impacto    = computed(() => this.preparacion()?.impacto ?? null);
  readonly propuestas = computed(() => this.preparacion()?.propuestas ?? []);
  readonly osList     = computed(() => this.preparacion()?.ordenesServicio ?? []);
  readonly motivos    = computed(() => this.preparacion()?.motivos ?? []);

  readonly longitudJust = computed(() => this.justificacion().trim().length);
  readonly tieneImpactoCritico = computed(() => this.impacto()?.impactoCritico ?? false);
  /** Al menos una propuesta aceptada quedará sin OC vigente → se generará una OC-AUTO al confirmar. */
  readonly generaraOcAuto = computed(() => this.propuestas().some(p => p.generaraOcAutogenerada));
  readonly propuestasAfectadas = computed(() => this.propuestas().filter(p => p.generaraOcAutogenerada));

  readonly puedeConfirmar = computed(() => {
    if (!this.impacto())             return false;
    if (!this.idMotivo())            return false;
    if (this.longitudJust() < 20)    return false;
    if (this.tieneImpactoCritico() && !this.confirmoImpacto()) return false;
    return true;
  });

  constructor() {
    effect(() => {
      const id = this.idOc();
      if (id > 0) void this.cargar();
    });
  }

  onCerrar(): void { this.cerrar.emit(); }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const p = await this.svc.prepararAnulacion(this.idOc());
      this.preparacion.set(p);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el impacto de la anulación.');
    } finally {
      this.cargando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar() || this.enviando()) return;
    this.enviando.set(true);
    try {
      const r = await this.svc.anular(this.idOc(), {
        idMotivo:        this.idMotivo(),
        justificacion:   this.justificacion(),
        confirmaImpacto: this.confirmoImpacto() || !this.tieneImpactoCritico(),
      });
      // Si el back generó OC-AUTO para alguna propuesta, mencionarlo en el toast.
      const autogen = r.propuestas.filter(p => p.numeroOcAutogenerada);
      if (autogen.length === 1) {
        this.toast.exito(`OC ${this.numeroOc()} anulada. Se generó ${autogen[0].numeroOcAutogenerada} para mantener la cobertura de ${autogen[0].numero} v${autogen[0].version}.`);
      } else if (autogen.length > 1) {
        this.toast.exito(`OC ${this.numeroOc()} anulada. Se generaron ${autogen.length} OC autogeneradas para mantener la cobertura de las propuestas afectadas.`);
      } else {
        this.toast.exito(`Orden de Compra ${this.numeroOc()} anulada correctamente.`);
      }
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo anular la OC.');
    } finally {
      this.enviando.set(false);
    }
  }
}
