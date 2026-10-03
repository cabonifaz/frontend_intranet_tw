import { Component, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/**
 * Modal que se abre al intentar crear una propuesta sobre un RQ que ya tiene
 * una propuesta vinculada. El usuario elige entre dos cards:
 *   - Nueva versión (hereda el contenido de la propuesta anterior).
 *   - Propuesta independiente (desde cero, sin vínculo).
 * Y luego confirma con "Crear propuesta" en el footer.
 */
type Opcion = 'nueva-version' | 'independiente';

@Component({
  selector: 'app-modal-propuesta-existente',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './modal-propuesta-existente.component.html',
  styleUrl: './modal-propuesta-existente.component.scss',
})
export class ModalPropuestaExistenteComponent {
  readonly codigoRq         = input.required<string>();
  readonly codigoPropuesta  = input.required<string>();
  readonly versionActual    = input<number>(1);

  readonly nuevaVersion   = output<void>();
  readonly independiente  = output<void>();
  readonly cerrar         = output<void>();

  readonly opcion = signal<Opcion | null>(null);

  get versionSiguiente(): string {
    return `v${this.versionActual() + 1}`;
  }

  seleccionar(op: Opcion): void {
    this.opcion.set(op);
  }

  confirmar(): void {
    const op = this.opcion();
    if (op === 'nueva-version') this.nuevaVersion.emit();
    else if (op === 'independiente') this.independiente.emit();
  }
}
