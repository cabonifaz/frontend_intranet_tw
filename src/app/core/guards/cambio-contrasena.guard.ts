import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionService } from '../services/autenticacion.service';

/**
 * Guard que redirige a /cambiar-contrasena si el usuario autenticado tiene
 * `forzarCambioContrasena = true`. Se aplica a todas las rutas protegidas
 * excepto la propia /cambiar-contrasena (que no la tiene asociada).
 */
export const cambioContrasenaGuard: CanActivateFn = (_, state) => {
  const router        = inject(Router);
  const autenticacion = inject(AutenticacionService);
  const usuario       = autenticacion.usuarioActual();

  if (!usuario) return true; // deja que autenticacionGuard se encargue
  if (!usuario.forzarCambioContrasena) return true;
  if (state.url.startsWith('/cambiar-contrasena')) return true;

  return router.createUrlTree(['/cambiar-contrasena']);
};
