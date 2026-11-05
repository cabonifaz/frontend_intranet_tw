import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CancelacionPreparada, CancelacionResultado } from '../../../../core/models/programacion-operativa.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/** HU-38 — Modal "Cancelar Programación" (motivo tipificado + comentario). */
@Component({
  selector: 'app-modal-cancelar-programacion',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-cancelar-programacion.component.html',
  styleUrl: './modal-cancelar-programacion.component.scss',
})
export class ModalCancelarProgramacionComponent implements OnInit {
  private readonly svc   = inject(ProgramacionOperativaService);
  private readonly toast = inject(ToastService);

  readonly idProgramacion = input.required<number>();

  readonly cerrar     = output<void>();
  readonly cancelado  = output<CancelacionResultado>();

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly datos     = signal<CancelacionPreparada | null>(null);

  readonly idMotivo    = signal<number | null>(null);
  readonly comentario  = signal('');

  readonly puedeGuardar = computed(() => {
    const d = this.datos();
    if (!d || !d.puedeCancelar) return false;
    const com = this.comentario().trim();
    const minOk = com.length >= (d.comentarioMinimo ?? 0);
    const maxOk = com.length <= (d.comentarioMaximo ?? 500);
    return this.idMotivo() != null && minOk && maxOk && !this.guardando();
  });

  async ngOnInit(): Promise<void> {
    try {
      const d = await this.svc.prepararCancelacion(this.idProgramacion());
      this.datos.set(d);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar los motivos de cancelación.');
      this.cerrar.emit();
    } finally {
      this.cargando.set(false);
    }
  }

  async cancelar(): Promise<void> {
    if (!this.puedeGuardar()) return;
    this.guardando.set(true);
    try {
      const r = await this.svc.cancelarProgramacion(this.idProgramacion(), {
        idMotivo:  this.idMotivo()!,
        comentario: this.comentario().trim() || null,
      });
      this.toast.exito(`Programación ${r.codigo} cancelada.`);
      this.cancelado.emit(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cancelar.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
