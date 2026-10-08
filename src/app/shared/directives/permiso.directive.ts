import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermisosService } from '../../core/services/permisos.service';

/**
 * Renderiza el elemento solo si el usuario tiene la acción indicada (ticket #4301).
 *
 * Uso:
 *   <button *appPermiso="'rq_guardar'">Nuevo</button>
 *   <tr *appPermiso="'usuario_cambiar_estado'">...</tr>
 */
@Directive({ selector: '[appPermiso]' })
export class PermisoDirective {
  private readonly tpl    = inject(TemplateRef<unknown>);
  private readonly vcr    = inject(ViewContainerRef);
  private readonly perms  = inject(PermisosService);

  readonly appPermiso = input.required<string>();

  private mostrando = false;

  constructor() {
    effect(() => {
      // Depende de la señal interna de PermisosService: se re-evalúa al cargar.
      this.perms.cargado();
      const puede = this.perms.puede(this.appPermiso());
      if (puede && !this.mostrando) {
        this.vcr.createEmbeddedView(this.tpl);
        this.mostrando = true;
      } else if (!puede && this.mostrando) {
        this.vcr.clear();
        this.mostrando = false;
      }
    });
  }
}
