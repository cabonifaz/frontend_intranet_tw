import { Component, input, output } from '@angular/core';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Tamano  = 'sm' | 'md' | 'lg';
type Tipo    = 'button' | 'submit';

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

  readonly clic = output<Event>();

  onClick(e: Event): void {
    if (this.disabled() || this.cargando()) {
      e.preventDefault();
      return;
    }
    this.clic.emit(e);
  }
}
