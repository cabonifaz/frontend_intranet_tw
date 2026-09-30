import { Component, input } from '@angular/core';

type Variante = 'azul' | 'verde' | 'ambar' | 'rojo' | 'morado';

@Component({
  selector: 'app-kpi-card',
  imports: [],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent {
  readonly icono     = input.required<string>();
  readonly etiqueta  = input.required<string>();
  readonly valor     = input.required<string | number>();
  readonly variante  = input<Variante>('azul');
  readonly subtitulo = input<string>('');
}
