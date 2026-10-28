import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SolicitudEdicionOs } from '../../../../core/models/ordenes-servicio.model';

/**
 * HU-40 Fase C — Modal "Resolver Solicitud de Edición".
 *
 * Lo abre el Jefe Comercial cuando recibe una solicitud. Muestra la info de la
 * solicitud (motivo + comentario + solicitante) y permite aprobarla o rechazarla.
 * Rechazar requiere comentario mínimo 10 caracteres.
 */
@Component({
  selector: 'app-modal-resolver-solicitud-os',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-resolver-solicitud-os.component.html',
  styleUrl: './modal-resolver-solicitud-os.component.scss',
})
export class ModalResolverSolicitudOsComponent {
  readonly idOs      = input.required<number>();
  readonly numeroOs  = input.required<string>();
  readonly solicitud = input.required<SolicitudEdicionOs>();

  readonly cerrar   = output<void>();
  readonly resuelta = output<'aprobada' | 'rechazada'>();

  private readonly svc   = inject(OrdenesServicioService);
  private readonly toast = inject(ToastService);

  readonly decision     = signal<'aprobar' | 'rechazar' | null>(null);
  readonly comentario   = signal('');
  readonly enviando     = signal(false);

  readonly puedeAprobar  = computed(() => this.decision() === 'aprobar');
  readonly puedeRechazar = computed(
    () => this.decision() === 'rechazar' && this.comentario().trim().length >= 10,
  );

  elegirAprobar(): void {
    this.decision.set('aprobar');
  }

  elegirRechazar(): void {
    this.decision.set('rechazar');
  }

  async confirmar(): Promise<void> {
    const dec = this.decision();
    if (!dec) return;
    this.enviando.set(true);
    try {
      if (dec === 'aprobar') {
        await this.svc.aprobarSolicitud(this.idOs(), this.solicitud().idSolicitud, this.comentario().trim() || undefined);
        this.toast.exito(`Solicitud de edición de ${this.numeroOs()} aprobada.`);
        this.resuelta.emit('aprobada');
      } else {
        await this.svc.rechazarSolicitud(this.idOs(), this.solicitud().idSolicitud, this.comentario().trim());
        this.toast.exito(`Solicitud de edición de ${this.numeroOs()} rechazada.`);
        this.resuelta.emit('rechazada');
      }
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo resolver la solicitud.');
    } finally {
      this.enviando.set(false);
    }
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}
