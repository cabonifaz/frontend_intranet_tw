import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

export interface OpcionMotivoNuevaVersion {
  id:     number;
  nombre: string;
}

export interface DatosNuevaVersion {
  idMotivo:    number;
  descripcion: string;
}

/**
 * Modal de confirmación para crear una nueva versión de una propuesta que ya
 * fue enviada a Visto Bueno. Pide motivo + descripción opcional + bloques
 * a copiar. Al confirmar emite `continuar` con los datos.
 */
@Component({
  selector: 'app-modal-crear-nueva-version',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-crear-nueva-version.component.html',
  styleUrl: './modal-crear-nueva-version.component.scss',
})
export class ModalCrearNuevaVersionComponent {
  readonly codigoPropuesta = input.required<string>();
  readonly versionActual   = input<number>(1);
  readonly enviando        = input<boolean>(false);
  readonly motivos         = input<OpcionMotivoNuevaVersion[]>([]);

  readonly continuar = output<DatosNuevaVersion>();
  readonly cerrar    = output<void>();

  readonly idMotivo    = signal<number | null>(null);
  readonly descripcion = signal('');

  readonly puedeContinuar = computed(() =>
    this.idMotivo() !== null && this.descripcion().trim().length > 0 && !this.enviando()
  );

  get versionSiguiente(): string { return `v${this.versionActual() + 1}`; }

  onContinuar(): void {
    if (!this.puedeContinuar()) return;
    this.continuar.emit({
      idMotivo:    this.idMotivo()!,
      descripcion: this.descripcion().trim(),
    });
  }
}
