import { Component, computed, input, output } from '@angular/core';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

export type TipoCierreSeguimiento = 'aceptar' | 'rechazar' | 'cerrar_sin_venta';

/**
 * HU-21 — Selector del tipo de cierre del seguimiento comercial.
 * Reemplaza los 3 botones del footer del detalle (Aceptación / Rechazo / Sin venta)
 * por un solo botón "Cerrar Seguimiento" que abre este modal. El usuario elige
 * cuál cierre aplicar y se dispara el modal específico correspondiente.
 */
@Component({
  selector: 'app-modal-selector-cierre',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './modal-selector-cierre.component.html',
  styleUrl: './modal-selector-cierre.component.scss',
})
export class ModalSelectorCierreComponent {
  readonly codigo      = input<string>('');
  readonly razonSocial = input<string>('');
  readonly puedeAceptar       = input<boolean>(true);
  readonly puedeRechazar      = input<boolean>(true);
  readonly puedeCerrarSinVenta = input<boolean>(true);

  readonly cerrar       = output<void>();
  readonly seleccionado = output<TipoCierreSeguimiento>();

  readonly subtitulo = computed(() => {
    const parts: string[] = [];
    if (this.codigo())      parts.push(this.codigo());
    if (this.razonSocial()) parts.push(this.razonSocial());
    return parts.join(' / ');
  });

  elegir(tipo: TipoCierreSeguimiento): void {
    this.seleccionado.emit(tipo);
  }

  onCerrar(): void { this.cerrar.emit(); }
}
