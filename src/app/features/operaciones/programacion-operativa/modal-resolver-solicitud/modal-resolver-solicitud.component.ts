import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SolicitudReprogramacion, SolicitudResuelta } from '../../../../core/models/programacion-operativa.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/**
 * HU-38 — Modal "Resolver Solicitud de Reprogramación".
 * El Jefe aprueba o rechaza una solicitud creada por el Asistente.
 * Comentario OBLIGATORIO al rechazar; opcional al aprobar.
 */
@Component({
  selector: 'app-modal-resolver-solicitud',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-resolver-solicitud.component.html',
  styleUrl: './modal-resolver-solicitud.component.scss',
})
export class ModalResolverSolicitudComponent implements OnInit {
  private readonly svc   = inject(ProgramacionOperativaService);
  private readonly toast = inject(ToastService);

  readonly idSolicitud = input.required<number>();

  readonly cerrar   = output<void>();
  readonly resuelta = output<SolicitudResuelta>();

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly datos     = signal<SolicitudReprogramacion | null>(null);
  readonly comentario = signal('');

  readonly puedeAprobar = computed(() => {
    const d = this.datos();
    return !!d && d.puedeResolver && !this.guardando();
  });

  readonly puedeRechazar = computed(() => {
    const d = this.datos();
    if (!d || !d.puedeResolver || this.guardando()) return false;
    return this.comentario().trim().length >= 10;
  });

  async ngOnInit(): Promise<void> {
    try {
      const d = await this.svc.obtenerSolicitud(this.idSolicitud());
      this.datos.set(d);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la solicitud.');
      this.cerrar.emit();
    } finally {
      this.cargando.set(false);
    }
  }

  async aprobar(): Promise<void> {
    if (!this.puedeAprobar()) return;
    this.guardando.set(true);
    try {
      const r = await this.svc.aprobarSolicitud(this.idSolicitud(), {
        decision: 'aprobar',
        comentario: this.comentario().trim() || null,
      });
      this.toast.exito(`Solicitud aprobada. ${r.requiereReconfirmarCliente ? 'Hay que volver a confirmar con el cliente.' : ''}`);
      this.resuelta.emit(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo aprobar la solicitud.');
    } finally {
      this.guardando.set(false);
    }
  }

  async rechazar(): Promise<void> {
    if (!this.puedeRechazar()) return;
    this.guardando.set(true);
    try {
      const r = await this.svc.rechazarSolicitud(this.idSolicitud(), {
        decision: 'rechazar',
        comentario: this.comentario().trim(),
      });
      this.toast.exito('Solicitud rechazada.');
      this.resuelta.emit(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo rechazar la solicitud.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
