import { Component, input } from '@angular/core';

type Variant =
  // Legacy (nombres de color) — se mantienen por compat
  | 'azul' | 'verde' | 'rojo' | 'ambar' | 'gris' | 'dark' | 'morado'
  // Semánticos (recomendados para código nuevo)
  | 'info' | 'success' | 'danger' | 'warning' | 'neutral';
type Tamano = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  imports: [],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  readonly texto   = input.required<string>();
  readonly variant = input<Variant>('azul');
  readonly tamano  = input<Tamano>('md');
  readonly conDot  = input<boolean>(false);
  readonly mono    = input<boolean>(false);
}
