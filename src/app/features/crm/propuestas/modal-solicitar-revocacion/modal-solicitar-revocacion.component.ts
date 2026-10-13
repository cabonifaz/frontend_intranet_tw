import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * HU-13b — Solicitar revocación del visto bueno (comercial autor).
 * Se abre desde el detalle de propuesta cuando el estado = 'aprobado'.
 * El comercial escribe el motivo (mín. 10 caracteres) y la solicitud entra a la
 * bandeja de VB para que el supervisor del área decida aprobar o rechazar.
 */
@Component({
  selector: 'app-modal-solicitar-revocacion',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-solicitar-revocacion.component.html',
  styleUrl: './modal-solicitar-revocacion.component.scss',
})
export class ModalSolicitarRevocacionComponent {
  private readonly svc   = inject(PropuestasService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly codigo      = input<string>('');
  readonly version     = input<number>(0);
  readonly razonSocial = input<string>('');

  readonly cerrar      = output<void>();
  readonly enviado     = output<void>();

  readonly motivo    = signal<string>('');
  readonly enviando  = signal(false);

  readonly longitud    = computed(() => this.motivo().trim().length);
  readonly puedeEnviar = computed(() => this.longitud() >= 10 && !this.enviando());

  onCerrar(): void { this.cerrar.emit(); }

  async solicitar(): Promise<void> {
    if (!this.puedeEnviar()) return;
    this.enviando.set(true);
    try {
      await this.svc.solicitarRevocacionVb(this.idPropuesta(), this.motivo().trim());
      this.toast.exito('Solicitud de revocación enviada. El supervisor del área la revisará.');
      this.enviado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo solicitar la revocación.');
    } finally {
      this.enviando.set(false);
    }
  }
}
