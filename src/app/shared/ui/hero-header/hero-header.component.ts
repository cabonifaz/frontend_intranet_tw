import { Component, input, output } from '@angular/core';

type BadgeVariant = 'verde-dot' | 'ambar-dot' | 'rojo' | 'azul' | 'verde';

@Component({
  selector: 'app-hero-header',
  imports: [],
  templateUrl: './hero-header.component.html',
  styleUrl: './hero-header.component.scss',
})
export class HeroHeaderComponent {
  readonly titulo       = input.required<string>();
  readonly descripcion  = input<string>('');
  readonly badgeTexto   = input<string>('');
  readonly badgeVariant = input<BadgeVariant>('verde-dot');
  readonly mostrarBack  = input<boolean>(true);
  /** Código identificador de la ficha para auditoría (ej. "FCH-0002"). Se
      renderiza como chip monoespaciado al lado del título, separado del badge
      de estado para no abarrotar el título. */
  readonly codigoFicha  = input<string>('');

  readonly volver = output<void>();

  onVolver(): void { this.volver.emit(); }
}
