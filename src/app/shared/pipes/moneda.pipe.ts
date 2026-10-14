import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea un monto con símbolo de moneda, separadores de miles y 2 decimales.
 *
 * @example
 *   {{ 5955.3 | moneda }}            → "S/ 5,955.30"
 *   {{ 5955.3 | moneda:'US$' }}      → "US$ 5,955.30"
 *   {{ null  | moneda }}             → "—"
 *   {{ 1000  | moneda:'S/':false }}  → "S/ 1000.00"   (sin separador)
 */
@Pipe({ name: 'moneda', standalone: true })
export class MonedaPipe implements PipeTransform {
  transform(valor: number | null | undefined, simbolo: string | null = 'S/', agrupar = true): string {
    if (valor == null || isNaN(valor)) return '—';
    const s = simbolo ?? 'S/';
    const n = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: agrupar,
    }).format(valor);
    return `${s} ${n}`;
  }
}
