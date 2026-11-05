import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { RegistrarRespuestaClienteRequest, RespuestaClienteRegistrada } from '../../../../core/models/programacion-operativa.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

type Canal     = 'correo' | 'whatsapp' | 'llamada' | 'presencial';
type Resultado = 'acepto' | 'pidio_reprogramar' | 'cancelo';

/**
 * Modal "Registrar respuesta del cliente" (HU-37). El padre pasa idProgramacion.
 * Al guardar, emite el resultado para que el padre decida si dispara otro flujo
 * (gestionar viáticos / reprogramar / cancelar).
 */
@Component({
  selector: 'app-modal-registrar-respuesta-cliente',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-registrar-respuesta-cliente.component.html',
  styleUrl: './modal-registrar-respuesta-cliente.component.scss',
})
export class ModalRegistrarRespuestaClienteComponent {
  private readonly svc   = inject(ProgramacionOperativaService);
  private readonly toast = inject(ToastService);

  readonly idProgramacion = input.required<number>();
  readonly codigo         = input<string>('');

  readonly cerrar      = output<void>();
  readonly registrado  = output<RespuestaClienteRegistrada>();

  readonly canal       = signal<Canal | null>(null);
  readonly resultado   = signal<Resultado | null>(null);
  readonly comentario  = signal('');
  readonly guardando   = signal(false);

  readonly CANALES: { codigo: Canal; label: string; icono: string }[] = [
    { codigo: 'correo',     label: 'Correo',     icono: 'mail' },
    { codigo: 'whatsapp',   label: 'WhatsApp',   icono: 'chat' },
    { codigo: 'llamada',    label: 'Llamada',    icono: 'call' },
    { codigo: 'presencial', label: 'Presencial', icono: 'person' },
  ];

  readonly RESULTADOS: { codigo: Resultado; label: string; descripcion: string; variante: string }[] = [
    { codigo: 'acepto',            label: 'Aceptó',            descripcion: 'El cliente confirmó la programación.',                   variante: 'verde' },
    { codigo: 'pidio_reprogramar', label: 'Pidió reprogramar', descripcion: 'Necesita otra fecha/hora: se abre flujo de reprogramación.', variante: 'ambar' },
    { codigo: 'cancelo',           label: 'Canceló',           descripcion: 'No se realizará el servicio en estas condiciones.',       variante: 'rojo'  },
  ];

  readonly puedeGuardar = computed(() =>
    this.canal() != null && this.resultado() != null && !this.guardando()
  );

  async guardar(): Promise<void> {
    if (!this.puedeGuardar()) return;
    this.guardando.set(true);
    try {
      const dto: RegistrarRespuestaClienteRequest = {
        canal:      this.canal()!,
        resultado:  this.resultado()!,
        comentario: this.comentario() || null,
      };
      const r = await this.svc.registrarRespuestaCliente(this.idProgramacion(), dto);
      this.toast.exito('Respuesta del cliente registrada.');
      this.registrado.emit(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar la respuesta.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
