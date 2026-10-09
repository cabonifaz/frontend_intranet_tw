import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

export interface DatosNuevaVersion {
  motivo:         string;
  descripcion:    string;
  bloquesACopiar: string[];
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

  readonly continuar = output<DatosNuevaVersion>();
  readonly cerrar    = output<void>();

  readonly motivo       = signal('');
  readonly descripcion  = signal('');
  readonly copiarItems         = signal(true);
  readonly copiarCondiciones   = signal(true);
  readonly copiarEquipos       = signal(true);
  readonly copiarRecomend      = signal(true);

  readonly puedeContinuar = computed(() =>
    this.motivo().trim().length > 0 && !this.enviando()
  );

  get versionSiguiente(): string { return `v${this.versionActual() + 1}`; }

  bloquesACopiar(): string[] {
    const l: string[] = [];
    if (this.copiarItems())       l.push('items');
    if (this.copiarCondiciones()) l.push('condiciones');
    if (this.copiarEquipos())     l.push('equipos');
    if (this.copiarRecomend())    l.push('recomendaciones');
    return l;
  }

  onContinuar(): void {
    if (!this.puedeContinuar()) return;
    this.continuar.emit({
      motivo:         this.motivo().trim(),
      descripcion:    this.descripcion().trim(),
      bloquesACopiar: this.bloquesACopiar(),
    });
  }
}
