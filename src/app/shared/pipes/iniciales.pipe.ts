import { Pipe, PipeTransform } from '@angular/core';

/**
 * Devuelve las iniciales de un nombre completo (primera letra del primer y último nombre).
 *
 * @example
 *   {{ 'Jazir Olivera'       | iniciales }} → "JO"
 *   {{ 'Juan Carlos Pérez'    | iniciales }} → "JP"
 *   {{ 'Ana'                  | iniciales }} → "A"
 *   {{ null                   | iniciales }} → "—"
 */
@Pipe({ name: 'iniciales', standalone: true })
export class InicialesPipe implements PipeTransform {
  transform(nombre: string | null | undefined): string {
    if (!nombre) return '—';
    const partes = nombre.trim().split(/\s+/);
    const primera = partes[0]?.charAt(0) ?? '';
    const ultima  = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primera}${ultima}`.toUpperCase();
  }
}
