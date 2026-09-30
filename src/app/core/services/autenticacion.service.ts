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

// TODO: quitar cuando el backend esté disponible en staging
const USAR_MOCK = true;
const MOCK_CREDENCIALES = [
  { correo: 'admin@totalweight.com',     contrasena: 'TW@Admin2026',    nombre: 'Admin',    apellido: 'TW',           rol: 'Admin'                 },
  { correo: 'gestor@totalweight.com',    contrasena: 'TW@Gestor2026',   nombre: 'Gestor',   apellido: 'Comercial',    rol: 'Gestor Comercial'      },
  { correo: 'jefe@totalweight.com',      contrasena: 'TW@Jefe2026',     nombre: 'Jefe',     apellido: 'Operaciones',  rol: 'Jefe de Operaciones'   },
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
        token:      `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        nombre:     c.nombre,
        apellido:   c.apellido,
        correo:     c.correo,
        rolSistema: c.rol,
      },
    };
  }
}
