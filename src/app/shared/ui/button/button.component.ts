import { Component, input, output } from '@angular/core';

type Variant =
  | 'primary'       // Azul lleno — acción principal
  | 'secondary'     // Blanco con borde gris — acción secundaria
  | 'ghost'         // Casi transparente — acción terciaria
  | 'danger'        // Rojo lleno — eliminar/anular con énfasis
  | 'danger-ghost'  // Rojo plano, sin fondo — eliminar/anular suave
  | 'success'       // Verde lleno — finalizar/aprobar
  | 'dark'          // Negro — filtros/acciones destacadas sobre fondo blanco
  | 'warning'       // Ámbar lleno — alertas/acciones correctivas
  | 'link'          // Solo texto azul — navegación/acción liviana
  | 'dashed';       // Borde discontinuo azul claro — "nuevo item", "agregar"
type Tamano   = 'xs' | 'sm' | 'md' | 'lg';
type Tipo     = 'button' | 'submit';
type SoloIcon = boolean;

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant   = input<Variant>('primary');
  readonly tamano    = input<Tamano>('md');
  readonly tipo      = input<Tipo>('button');
  readonly disabled  = input<boolean>(false);
  readonly cargando  = input<boolean>(false);
  readonly icono     = input<string>('');
  readonly iconoDer  = input<string>('');
  readonly ancho     = input<'auto' | 'full'>('auto');
  /** Solo ícono (sin texto). Debe pasarse icono + ariaLabel. */
  readonly soloIcon  = input<SoloIcon>(false);
  readonly ariaLabel = input<string>('');
  readonly title     = input<string>('');

  readonly clic = output<Event>();

  onClick(e: Event): void {
    if (this.disabled() || this.cargando()) {
      e.preventDefault();
      return;
    }
    this.clic.emit(e);
  }
}
