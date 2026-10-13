import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosService } from '../services/permisos.service';
import { ToastService } from '../services/toast.service';

/**
 * Fábrica de guards por acción. Impide entrar a una ruta si el usuario no tiene
 * la acción indicada en su catálogo (SP_ObtenerAccionesUsuario). Si no la tiene,
 * redirige al dashboard y muestra un toast.
 *
 * Uso en app.routes.ts:
 *   { path: 'crm/propuestas', canActivate: [permisoRutaGuard('propuesta_ver')], ... }
 *
 * El back valida igualmente con [RequierePermiso], este guard solo mejora la UX.
 */
export function permisoRutaGuard(accion: string): CanActivateFn {
  return () => {
    const permisos = inject(PermisosService);
    const router   = inject(Router);
    const toast    = inject(ToastService);

    // Si el servicio aún no cargó (p.ej. refresh y la petición no respondió),
    // dejamos pasar; el back cortará si realmente no tiene permiso. Solo bloqueamos
    // cuando sabemos con certeza que la acción no está en el catálogo del usuario.
    if (!permisos.cargado()) return true;

    if (permisos.puede(accion)) return true;

    toast.error('No tienes acceso a este módulo.');
    return router.createUrlTree(['/dashboard']);
  };
}
