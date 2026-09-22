import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  IniciarSesionEntrada,
  IniciarSesionSalida,
  RespuestaApi,
  UsuarioSesion,
} from '../models/autenticacion.model';

const TOKEN_KEY   = 'tw_token';
const USUARIO_KEY = 'tw_usuario';

@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _usuarioActual = signal<UsuarioSesion | null>(
    this.cargarUsuarioGuardado()
  );

  readonly usuarioActual = this._usuarioActual.asReadonly();

  async iniciarSesion(entrada: IniciarSesionEntrada, recordarme: boolean): Promise<void> {
    const respuesta = await firstValueFrom(
      this.http
        .post<RespuestaApi<IniciarSesionSalida>>(
          `${environment.apiUrl}/api/autenticacion/iniciar-sesion`,
          entrada
        )
        .pipe(
          catchError((err: HttpErrorResponse) => {
            const mensaje =
              err.error?.mensaje ?? 'Error al conectar con el servidor.';
            return throwError(() => new Error(mensaje));
          })
        )
    );

    if (!respuesta.datos) {
      throw new Error(respuesta.mensaje);
    }

    const storage = recordarme ? localStorage : sessionStorage;
    const sesion: UsuarioSesion = {
      nombre:     respuesta.datos.nombre,
      apellido:   respuesta.datos.apellido,
      correo:     respuesta.datos.correo,
      rolSistema: respuesta.datos.rolSistema,
    };

    storage.setItem(TOKEN_KEY,    respuesta.datos.token);
    storage.setItem(USUARIO_KEY,  JSON.stringify(sesion));

    this._usuarioActual.set(sesion);
  }

  cerrarSesion(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USUARIO_KEY);
    this._usuarioActual.set(null);
    this.router.navigate(['/login']);
  }

  obtenerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  private cargarUsuarioGuardado(): UsuarioSesion | null {
    try {
      const raw =
        localStorage.getItem(USUARIO_KEY) ?? sessionStorage.getItem(USUARIO_KEY);
      return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
    } catch {
      return null;
    }
  }
}
