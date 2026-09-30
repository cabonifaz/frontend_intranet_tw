import { Component, input } from '@angular/core';
import { ESTADO } from '../../../core/constants/estados';

@Component({
  selector: 'app-badge-estado',
  imports: [],
  templateUrl: './badge-estado.component.html',
  styleUrl: './badge-estado.component.scss',
})
export class BadgeEstadoComponent {
  readonly estado = input.required<string>();

  get esActivo(): boolean {
    return this.estado() === ESTADO.ACTIVO;
  }
}
