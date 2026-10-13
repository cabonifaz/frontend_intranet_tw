import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import { PreparacionReprogramacion } from '../../../../core/models/seguimiento.model';

@Component({
  selector: 'app-modal-reprogramar-accion',
  imports: [CommonModule, DatePipe, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-reprogramar-accion.component.html',
  styleUrl: './modal-reprogramar-accion.component.scss',
})
export class ModalReprogramarAccionComponent {
  private readonly svc   = inject(SeguimientoService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargandoDatos = signal(true);
  readonly datos         = signal<PreparacionReprogramacion | null>(null);
  readonly enviando      = signal(false);

  readonly idTipoAccion  = signal<number | null>(null);
  readonly fechaNueva    = signal<string>('');
  readonly idPrioridad   = signal<number | null>(null);
  readonly idResponsable = signal<number | null>(null);
  readonly idMotivo      = signal<number | null>(null);
  readonly detalle       = signal<string>('');

  readonly puedeGuardar = computed(() => {
    return !!this.fechaNueva() && this.idMotivo() !== null;
  });

  readonly subtitulo = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return `${d.accionActual.numero} / ${d.accionActual.razonSocial}`;
  });

  constructor() {
    effect(() => {
      const id = this.idPropuesta();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargandoDatos.set(true);
    try {
      const d = await this.svc.prepararReprogramacion(id);
      this.datos.set(d);
      this.idTipoAccion.set(d.accionActual.idTipoAccion ?? null);
      this.idPrioridad.set(d.accionActual.idPrioridad ?? null);
      this.idResponsable.set(d.accionActual.idResponsable ?? null);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar la reprogramación.');
    } finally {
      this.cargandoDatos.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar() || this.enviando()) return;
    this.enviando.set(true);
    try {
      await this.svc.reprogramar(this.idPropuesta(), {
        idTipoAccion:  this.idTipoAccion(),
        fecha:         this.fechaNueva() || null,
        idPrioridad:   this.idPrioridad(),
        idResponsable: this.idResponsable(),
        idMotivo:      this.idMotivo(),
        detalle:       this.detalle() || null,
      });
      this.toast.exito('Próxima acción reprogramada correctamente.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo reprogramar.');
    } finally {
      this.enviando.set(false);
    }
  }
}
