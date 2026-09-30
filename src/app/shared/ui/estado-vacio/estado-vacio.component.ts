import { Component, input } from '@angular/core';

type Variante = 'cargando' | 'vacio' | 'error';

@Component({
  selector: 'app-estado-vacio',
  imports: [],
  templateUrl: './estado-vacio.component.html',
  styleUrl: './estado-vacio.component.scss',
})
export class EstadoVacioComponent {
  readonly variante = input<Variante>('vacio');
  readonly mensaje  = input.required<string>();
  readonly icono    = input<string>('');

  get iconoResuelto(): string {
    if (this.icono()) return this.icono();
    if (this.variante() === 'cargando') return 'progress_activity';
    if (this.variante() === 'error')    return 'error';
    return 'inbox';
  }
}
