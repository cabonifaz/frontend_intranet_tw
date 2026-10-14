import { Pipe, PipeTransform, inject } from '@angular/core';
import { CatalogoEstadosService, EstadoVisual, Modulo } from '../../core/services/catalogo-estados.service';

/**
 * Devuelve la info visual de un estado para pintar un badge.
 *
 * @example
 *   <span class="badge {{ item.estado | estadoBadge:'oc' }}">
 *     {{ (item.estado | estadoBadge:'oc').label }}
 *   </span>
 *
 * Para evitar llamar dos veces, usar con alias:
 *   @let v = item.estado | estadoBadge:'oc';
 *   <span class="badge {{ v.clase }}">{{ v.label }}</span>
 */
@Pipe({ name: 'estadoBadge', standalone: true, pure: true })
export class EstadoBadgePipe implements PipeTransform {
  private readonly svc = inject(CatalogoEstadosService);

  transform(estado: string | null | undefined, modulo: Modulo): EstadoVisual {
    return this.svc.obtener(modulo, estado ?? '');
  }
}
