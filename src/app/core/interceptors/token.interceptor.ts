import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const TOKEN_KEY = 'tw_token';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token  = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);

  const authReq = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        router.navigate(['/login']);
      }

      // El back envuelve respuestas en RespuestaDto { idTipoMensaje, mensaje, datos }.
      // Cuando responde 400/500 con un mensaje de negocio, lo propagamos como Error
      // para que `e instanceof Error ? e.message : ...` en los services muestre el mensaje
      // real en el toast en vez del fallback genérico.
      const body = err.error;
      const mensajeBack = typeof body === 'object' && body !== null && typeof body.mensaje === 'string'
        ? body.mensaje
        : null;
      if (mensajeBack) {
        const enriched = new Error(mensajeBack) as Error & { httpError: HttpErrorResponse };
        enriched.httpError = err;
        return throwError(() => enriched);
      }

      return throwError(() => err);
    })
  );
};
