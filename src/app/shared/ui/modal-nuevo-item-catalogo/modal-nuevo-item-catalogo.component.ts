import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';
import { CampoComponent } from '../campo/campo.component';

/**
 * Modal genérico para agregar un item nuevo a un catálogo de tabla_maestra
 * (Tipo, Subtipo, Marca, Modelo, etc.). UI pura — la lógica de persistencia
 * (POST al back) la maneja el padre vía (guardar).
 */
@Component({
  selector: 'app-modal-nuevo-item-catalogo',
  imports: [FormsModule, ModalComponent, ButtonComponent, CampoComponent],
  templateUrl: './modal-nuevo-item-catalogo.component.html',
  styleUrl: './modal-nuevo-item-catalogo.component.scss',
})
export class ModalNuevoItemCatalogoComponent {
  readonly titulo        = input.required<string>();
  readonly etiquetaCampo = input<string>('Nombre');
  readonly placeholder   = input<string>('');
  readonly minCaracteres = input<number>(2);
  readonly guardando     = input<boolean>(false);

  readonly guardar  = output<string>();
  readonly cancelar = output<void>();

  readonly nombre = signal('');

  get valido(): boolean {
    return this.nombre().trim().length >= this.minCaracteres();
  }

  onGuardar(): void {
    const n = this.nombre().trim();
    if (n.length < this.minCaracteres()) return;
    this.guardar.emit(n);
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
