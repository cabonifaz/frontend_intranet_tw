import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionService } from '../services/autenticacion.service';

export const autenticacionGuard: CanActivateFn = () => {
  const router         = inject(Router);
  const autenticacion  = inject(AutenticacionService);

  if (autenticacion.estaAutenticado()) return true;

  return router.createUrlTree(['/login']);
};
