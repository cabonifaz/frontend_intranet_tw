import { Component, input, output } from '@angular/core';

type Ancho = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  readonly titulo    = input.required<string>();
  readonly ancho     = input<Ancho>('md');
  readonly cerrable  = input<boolean>(true);

  readonly cerrar = output<void>();

  onCerrar(): void { if (this.cerrable()) this.cerrar.emit(); }
  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onCerrar();
    }
  }
}
