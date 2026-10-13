import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/** 3 formas de resolver una tarea pendiente al clickear "Registrar Seguimiento". */
export type DecisionPendiente = 'ejecutar' | 'mantener' | 'cancelar';

/**
 * HU-19 — Decide qué hacer con la próxima acción pendiente cuando el comercial
 * clickea "Registrar Seguimiento" sin usar "Ejecutar ahora". Garantiza el
 * modelo de UNA próxima acción activa a la vez.
 */
@Component({
  selector: 'app-modal-decidir-pendiente',
  imports: [CommonModule, DatePipe, ModalComponent, ButtonComponent],
  templateUrl: './modal-decidir-pendiente.component.html',
  styleUrl: './modal-decidir-pendiente.component.scss',
})
export class ModalDecidirPendienteComponent {
  readonly codigo              = input<string>('');
  readonly razonSocial         = input<string>('');
  readonly nombreAccion        = input<string>('—');
  readonly fechaAccion         = input<string | null | undefined>(null);
  readonly responsableAccion   = input<string | null | undefined>(null);

  readonly cerrar       = output<void>();
  readonly seleccionado = output<DecisionPendiente>();

  elegir(d: DecisionPendiente): void { this.seleccionado.emit(d); }
  onCerrar(): void { this.cerrar.emit(); }
}
