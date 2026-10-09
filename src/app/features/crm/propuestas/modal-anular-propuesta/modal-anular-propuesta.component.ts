import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { AnulacionPropuesta } from '../../../../core/models/propuesta-modales.model';

@Component({
  selector: 'app-modal-anular-propuesta',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-anular-propuesta.component.html',
  styleUrl: './modal-anular-propuesta.component.scss',
})
export class ModalAnularPropuestaComponent {
  private readonly svc   = inject(PropuestasService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly anulada     = output<void>();

  readonly cargando   = signal(true);
  readonly anulando   = signal(false);
  readonly error      = signal('');
  readonly datos      = signal<AnulacionPropuesta | null>(null);

  readonly idMotivo         = signal<number | null>(null);
  readonly justificacion    = signal('');
  readonly confirmacion     = signal(false);

  readonly puedeAnular = computed(() =>
    this.datos()?.puedeAnular
    && this.idMotivo() !== null
    && this.justificacion().trim().length >= 20
    && this.confirmacion()
    && !this.anulando()
  );

  async ngOnInit(): Promise<void> {
    try {
      const r = await this.svc.prepararAnulacion(this.idPropuesta());
      this.datos.set(r);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al preparar la anulación.');
    } finally {
      this.cargando.set(false);
    }
  }

  async anular(): Promise<void> {
    if (!this.puedeAnular()) return;
    this.anulando.set(true);
    try {
      await this.svc.anularPropuesta(this.idPropuesta(), {
        idMotivoAnulacion:   this.idMotivo(),
        justificacion:       this.justificacion().trim(),
        confirmacionCritica: true,
      });
      this.anulada.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo anular la propuesta.');
    } finally {
      this.anulando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
