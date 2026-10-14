import { Component, input } from '@angular/core';

/**
 * Tarjeta tipo "chip informativo": etiqueta pequeña arriba + valor principal abajo.
 * Usado típicamente en la fila superior de los modales de detalle (OC, Propuesta, Seguimiento).
 *
 * @example
 *   <app-chip-info label="CLIENTE" [valor]="d.razonSocial" />
 *   <app-chip-info label="MONTO" [valor]="monto" variant="pct" />
 *
 * Con content projection cuando necesitas markup custom (ej. badge dentro):
 *   <app-chip-info label="ESTADO">
 *     <span class="badge badge--verde">Validada</span>
 *   </app-chip-info>
 */
@Component({
  selector: 'app-chip-info',
  imports: [],
  templateUrl: './chip-info.component.html',
  styleUrl: './chip-info.component.scss',
})
export class ChipInfoComponent {
  readonly label   = input.required<string>();
  readonly valor   = input<string | number | null | undefined>(null);
  readonly sub     = input<string | null | undefined>(null);
  /** `default` texto normal · `pct` resaltado azul grande · `codigo` monoespaciado */
  readonly variant = input<'default' | 'pct' | 'codigo'>('default');
}
