import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/**
 * Modal de confirmación que aparece al intentar editar una propuesta que ya
 * fue enviada a Visto Bueno. Explica que se creará una nueva versión y que
 * la versión anterior quedará anulada, obligando a repetir el flujo de VB.
 */
@Component({
  selector: 'app-modal-crear-nueva-version',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './modal-crear-nueva-version.component.html',
  styleUrl: './modal-crear-nueva-version.component.scss',
})
export class ModalCrearNuevaVersionComponent {
  readonly codigoPropuesta = input.required<string>();
  readonly versionActual   = input<number>(1);

  readonly continuar = output<void>();
  readonly cerrar    = output<void>();

  get versionSiguiente(): string {
    return `v${this.versionActual() + 1}`;
  }
}
