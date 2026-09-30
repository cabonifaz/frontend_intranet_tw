import { Component, input } from '@angular/core';

type Variant = 'azul' | 'verde' | 'rojo' | 'ambar' | 'gris' | 'dark' | 'morado';
type Tamano  = 'sm' | 'md';

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
