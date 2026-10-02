import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CambiarContrasenaRequest,
  IniciarSesionEntrada,
  IniciarSesionSalida,
  RespuestaApi,
  UsuarioSesion,
} from '../models/autenticacion.model';

const TOKEN_KEY   = 'tw_token';
const USUARIO_KEY = 'tw_usuario';

// Cambiar a true SOLO para debug local sin backend. En staging/prod debe ir en false.
// Con el back vivo, dejar true genera un rebound al login: el token mock cae en 401 al primer llamado real.
const USAR_MOCK = false;
const MOCK_CREDENCIALES = [
  { correo: 'adminmock@totalweight.com',  contrasena: 'TW@Admin2026',    nombre: 'Admin',    apellido: 'Mock',         rol: 'Admin'                 },
  { correo: 'gestormock@totalweight.com', contrasena: 'TW@Gestor2026',   nombre: 'Gestor',   apellido: 'Mock',         rol: 'Gestor Comercial'      },
  { correo: 'jefemock@totalweight.com',   contrasena: 'TW@Jefe2026',     nombre: 'Jefe',     apellido: 'Mock',         rol: 'Jefe de Operaciones'   },
];

@Injectable({ providedIn: 'root' })
export class AutenticacionService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _usuarioActual = signal<UsuarioSesion | null>(
    this.cargarUsuarioGuardado()
  );

  readonly usuarioActual = this._usuarioActual.asReadonly();

  async iniciarSesion(entrada: IniciarSesionEntrada, recordarme: boolean): Promise<void> {
    const respuesta = USAR_MOCK
      ? await this.mockIniciarSesion(entrada)
      : await firstValueFrom(
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

    const storage      = recordarme ? localStorage : sessionStorage;
    const otroStorage  = recordarme ? sessionStorage : localStorage;
    otroStorage.removeItem(TOKEN_KEY);
    otroStorage.removeItem(USUARIO_KEY);
    const sesion: UsuarioSesion = {
      nombre:                 respuesta.datos.nombre,
      apellido:               respuesta.datos.apellido,
      correo:                 respuesta.datos.correo,
      rolSistema:             respuesta.datos.rolSistema,
      forzarCambioContrasena: respuesta.datos.forzarCambioContrasena ?? false,
    };

    storage.setItem(TOKEN_KEY,    respuesta.datos.token);
    storage.setItem(USUARIO_KEY,  JSON.stringify(sesion));

    this._usuarioActual.set(sesion);
  }

  /**
   * Cambia la contraseña del usuario autenticado. Si el back responde OK,
   * limpia el flag forzarCambioContrasena del signal y del storage.
   */
  async cambiarContrasena(dto: CambiarContrasenaRequest): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<null>>(
        `${environment.apiUrl}/api/autenticacion/cambiar-contrasena`,
        dto,
      ).pipe(
        catchError((err: HttpErrorResponse) => {
          const mensaje = err.error?.mensaje ?? 'Error al cambiar la contraseña.';
          return throwError(() => new Error(mensaje));
        }),
      ),
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);

    // Actualizar el signal + storage para que el guard deje de redirigir
    const actual = this._usuarioActual();
    if (!actual) return;
    const actualizado: UsuarioSesion = { ...actual, forzarCambioContrasena: false };
    this._usuarioActual.set(actualizado);
    const storage = localStorage.getItem(USUARIO_KEY) ? localStorage : sessionStorage;
    storage.setItem(USUARIO_KEY, JSON.stringify(actualizado));
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
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<UsuarioSesion>;
      // Defensa para sesiones viejas sin el flag
      return {
        nombre:                 parsed.nombre ?? '',
        apellido:               parsed.apellido ?? '',
        correo:                 parsed.correo ?? '',
        rolSistema:             parsed.rolSistema ?? '',
        forzarCambioContrasena: parsed.forzarCambioContrasena ?? false,
      };
    } catch {
      return null;
    }
  }

  private async mockIniciarSesion(entrada: IniciarSesionEntrada): Promise<RespuestaApi<IniciarSesionSalida>> {
    await new Promise(r => setTimeout(r, 400));
    const c = MOCK_CREDENCIALES.find(x =>
      x.correo.toLowerCase() === entrada.correo.trim().toLowerCase() &&
      x.contrasena === entrada.contrasena,
    );
    if (!c) {
      return { idTipoMensaje: 2, mensaje: 'Correo o contraseña incorrectos.' };
    }
    return {
      idTipoMensaje: 1,
      mensaje: 'OK',
      datos: {
        token:                  `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        nombre:                 c.nombre,
        apellido:               c.apellido,
        correo:                 c.correo,
        rolSistema:             c.rol,
        forzarCambioContrasena: false,
      },
    };
  }
}
