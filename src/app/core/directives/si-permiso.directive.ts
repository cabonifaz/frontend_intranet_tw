import {
  Directive,
  EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { PermisosService } from '../services/permisos.service';

/**
 * Directiva estructural: renderiza el elemento solo si el usuario tiene la acción.
 *
 *   <app-button *twSiPermiso="'propuesta_enviar_vb'" ...>Enviar a VB</app-button>
 *
 * Any-of (muestra si tiene al menos una):
 *   <div *twSiPermiso="['propuesta_enviar_vb', 'propuesta_vb_resolver']">...</div>
 *
 * Mientras los permisos aún no cargaron (p.ej. refresh), NO se renderiza por default
 * para evitar flashes de UI prohibida. Cambialo con:
 *   *twSiPermiso="'propuesta_enviar_vb'; mostrarMientrasCarga: true"
 */
@Directive({
  selector: '[twSiPermiso]',
  standalone: true,
})
export class SiPermisoDirective {
  private readonly tpl       = inject(TemplateRef<unknown>);
  private readonly vcr       = inject(ViewContainerRef);
  private readonly permisos  = inject(PermisosService);

  readonly twSiPermiso                      = input<string | string[] | null>(null);
  readonly twSiPermisoMostrarMientrasCarga = input<boolean>(false);

  private viewRef: EmbeddedViewRef<unknown> | null = null;

  /** Reactivo: lee tanto los inputs como las signals del PermisosService.
   *  Al cambiar cualquiera, el effect dispara y renderiza/elimina el elemento. */
  private readonly visible = computed(() => {
    const accion = this.twSiPermiso();
    if (!accion) return false;
    if (!this.permisos.cargado()) return this.twSiPermisoMostrarMientrasCarga();
    return Array.isArray(accion)
      ? this.permisos.puedeAlguna(accion)
      : this.permisos.puede(accion);
  });

  constructor() {
    effect(() => {
      const show = this.visible();
      if (show && !this.viewRef) {
        this.viewRef = this.vcr.createEmbeddedView(this.tpl);
      } else if (!show && this.viewRef) {
        this.vcr.clear();
        this.viewRef = null;
      }
    });
  }
}
