import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { DirectorioItem } from '../../../core/models/directorio.model';

@Component({
  selector: 'app-modal-ficha-contacto',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './modal-ficha-contacto.component.html',
  styleUrl: './modal-ficha-contacto.component.scss',
})
export class ModalFichaContactoComponent {
  readonly contacto = input.required<DirectorioItem>();
  readonly cerrar   = output<void>();

  iniciales(nombreCompleto: string): string {
    const partes = nombreCompleto.trim().split(/\s+/);
    const primera = partes[0]?.charAt(0) ?? '';
    const ultima  = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primera}${ultima}`.toUpperCase();
  }

  onCerrar(): void { this.cerrar.emit(); }
}
