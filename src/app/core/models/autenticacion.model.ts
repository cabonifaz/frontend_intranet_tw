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
  forzarCambioContrasena: boolean;
}

export interface CambiarContrasenaRequest {
  contrasenaActual: string;
  contrasenaNueva: string;
}
