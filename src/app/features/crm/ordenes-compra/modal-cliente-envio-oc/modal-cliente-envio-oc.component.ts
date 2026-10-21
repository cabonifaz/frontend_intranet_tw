import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';

/**
 * HU-27 — Modal Post-Aceptación de Propuesta.
 * Se abre automáticamente al pasar una propuesta a ACEPTADA.
 * Pregunta "¿El cliente ya envió la OC?" con 2 opciones:
 *  - Sí → abre la ficha de registro de OC (modal-registrar-oc)
 *  - No → autogenera una OC provisional (OC-AUTO-NNNN-YYYY sin PDF)
 */

@Component({
  selector: 'app-modal-cliente-envio-oc',
  imports: [ModalComponent],
  templateUrl: './modal-cliente-envio-oc.component.html',
  styleUrl: './modal-cliente-envio-oc.component.scss',
})
export class ModalClienteEnvioOcComponent {
  readonly numeroPropuesta = input.required<string>();
  readonly razonSocial     = input.required<string>();

  readonly cerrar       = output<void>();
  readonly registrarOc  = output<void>();
  readonly autogenerar  = output<void>();

  onCerrar(): void { this.cerrar.emit(); }
  elegirRegistrar(): void { this.registrarOc.emit(); }
  elegirAutogenerar(): void { this.autogenerar.emit(); }
}
