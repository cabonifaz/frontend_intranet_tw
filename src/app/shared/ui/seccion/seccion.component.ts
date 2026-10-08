import { Component, input } from '@angular/core';

type BadgeVariant = 'rojo' | 'azul' | 'dark' | 'verde' | 'ambar';

@Component({
  selector: 'app-seccion',
  imports: [],
  templateUrl: './seccion.component.html',
  styleUrl: './seccion.component.scss',
})
export class SeccionComponent {
  readonly numero          = input<string>('');
  readonly icono           = input<string>('');
  readonly titulo          = input.required<string>();
  readonly subtitulo       = input<string>('');
  readonly badgeTexto      = input<string>('');
  readonly badgeVariant    = input<BadgeVariant>('azul');
  /** Permite que el contenido salga del card (ej. dropdowns absolutos). */
  readonly overflowVisible = input<boolean>(false);
}
