import { Component, computed, input, output } from '@angular/core';

type Ancho = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type IconoColor = 'azul' | 'verde' | 'ambar' | 'rojo';

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
  /** Ícono de Material Symbols que se muestra en un cuadrado de color a la izquierda del título. */
  readonly icono       = input<string | null>(null);
  /** Línea descriptiva bajo el título (ej. "Confirma la aprobación del visto bueno"). */
  readonly subtitulo   = input<string | null>(null);
  /** Color del cuadrado del ícono según la semántica de la acción. */
  readonly iconoColor  = input<IconoColor>('azul');

  readonly cerrar = output<void>();

  /** True si debemos renderizar el header "rico" con ícono + subtítulo. */
  readonly tieneHeaderRico = computed(() => !!this.icono() || !!this.subtitulo());

  onCerrar(): void { if (this.cerrable()) this.cerrar.emit(); }
  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onCerrar();
    }
  }
}
