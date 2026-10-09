import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { VistoBuenoPropuesta } from '../../../../core/models/propuesta-modales.model';

@Component({
  selector: 'app-modal-enviar-vb',
  imports: [CommonModule, FormsModule, DatePipe, ModalComponent, ButtonComponent],
  templateUrl: './modal-enviar-vb.component.html',
  styleUrl: './modal-enviar-vb.component.scss',
})
export class ModalEnviarVbComponent {
  private readonly svc   = inject(PropuestasService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly enviado     = output<void>();

  readonly cargando  = signal(true);
  readonly enviando  = signal(false);
  readonly error     = signal('');
  readonly datos     = signal<VistoBuenoPropuesta | null>(null);
  readonly comentario = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const r = await this.svc.prepararEnvioVistoBueno(this.idPropuesta());
      this.datos.set(r);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al preparar el envío a VB.');
    } finally {
      this.cargando.set(false);
    }
  }

  async enviar(): Promise<void> {
    if (!this.datos()?.puedeEnviar || this.enviando()) return;
    this.enviando.set(true);
    try {
      await this.svc.enviarVistoBueno(this.idPropuesta(), { comentario: this.comentario().trim() || undefined });
      this.enviado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo enviar a VB.');
    } finally {
      this.enviando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
