export interface RespuestaApi<T> {
  idTipoMensaje: number;
  mensaje: string;
  datos?: T;
}

export interface IniciarSesionEntrada {
  correo: string;
  contrasena: string;
}

export interface IniciarSesionSalida {
  token: string;
  nombre: string;
  apellido: string;
  correo: string;
  rolSistema: string;
  forzarCambioContrasena: boolean;
}

export interface UsuarioSesion {
  nombre: string;
  apellido: string;
  correo: string;
  rolSistema: string;
  /** Label legible del rol (ej. "Visor", "Administrador"). Puede faltar en sesiones viejas. */
  rolSistemaLabel?: string;
  /** Área del usuario (ej. "comercial"). Puede faltar en sesiones viejas. */
  area?: string;
  forzarCambioContrasena: boolean;
}

/** Respuesta del endpoint GET /api/autenticacion/me. */
export interface MisDatos {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rolSistema: string;
  rolSistemaLabel: string;
  area: string;
  forzarCambioContrasena: boolean;
}

export interface CambiarContrasenaRequest {
  contrasenaActual: string;
  contrasenaNueva: string;
}
