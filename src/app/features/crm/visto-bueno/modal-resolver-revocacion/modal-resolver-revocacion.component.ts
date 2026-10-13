import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ItemBandejaVb } from '../../../../core/models/visto-bueno.model';

/**
 * HU-13b — Resolver solicitud de revocación de VB (jefe VB).
 * Se abre desde la bandeja de VB al clickear una fila con tipoVb = 'revocacion' y estadoVb = 'revocacion_pendiente'.
 * Muestra el motivo del comercial y permite aprobar o rechazar (comentario mínimo 10 chars si rechaza).
 */
@Component({
  selector: 'app-modal-resolver-revocacion',
  imports: [CommonModule, DatePipe, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-resolver-revocacion.component.html',
  styleUrl: './modal-resolver-revocacion.component.scss',
})
export class ModalResolverRevocacionComponent {
  private readonly svc   = inject(VistoBuenoService);
  private readonly toast = inject(ToastService);

  readonly contexto    = input.required<ItemBandejaVb>();
  readonly cerrar      = output<void>();
  /** Emite el resultado para que el padre pueda navegar a la nueva versión si fue aprobada. */
  readonly resuelto    = output<{ accion: 'aprobar' | 'rechazar'; idNuevaVersion: number }>();

  readonly comentario = signal<string>('');
  readonly enviando   = signal(false);

  readonly longitudComentario = computed(() => this.comentario().trim().length);

  readonly subtitulo = computed(() => {
    const c = this.contexto();
    return `${c.numero} · v${c.version} / ${c.razonSocial}`;
  });

  onCerrar(): void { this.cerrar.emit(); }

  async aprobar(): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    try {
      const r = await this.svc.resolverRevocacion(this.contexto().idPropuesta, {
        accion: 'aprobar',
        comentario: this.comentario().trim() || undefined,
      });
      this.toast.exito(`Revocación aprobada. Se creó la v${this.contexto().version + 1} en borrador.`);
      this.resuelto.emit({ accion: 'aprobar', idNuevaVersion: r.idNuevaVersion });
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo aprobar la revocación.');
    } finally {
      this.enviando.set(false);
    }
  }

  async rechazar(): Promise<void> {
    if (this.enviando()) return;
    if (this.longitudComentario() < 10) {
      this.toast.info('Indique el motivo del rechazo (mínimo 10 caracteres).');
      return;
    }
    this.enviando.set(true);
    try {
      await this.svc.resolverRevocacion(this.contexto().idPropuesta, {
        accion: 'rechazar',
        comentario: this.comentario().trim(),
      });
      this.toast.exito('Revocación rechazada. La propuesta se mantiene aprobada.');
      this.resuelto.emit({ accion: 'rechazar', idNuevaVersion: 0 });
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo rechazar la revocación.');
    } finally {
      this.enviando.set(false);
    }
  }
}
