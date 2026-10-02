export interface UsuarioListaItem {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rolSistema: string;
  rolSistemaLabel: string;
  telefono: string | null;
  estado: string;
  ultimoAcceso: string | null;
  fechaCreacion: string;
}

export interface UsuarioDetalle extends UsuarioListaItem {
  // Información personal
  tipoDocumento:  string;
  numeroDocumento: string;
  cargo:           string | null;
  area:            string | null;

  // Asignación operativa
  sedeOperativa:        string | null;
  idSupervisorDirecto:  number | null;

  // Certificación técnica
  habilitadoFirmaInacal:        boolean;
  numeroRegistroInacal:         string | null;
  fechaExpiracionCertificacion: string | null;
  requiereInduccionSctr:        boolean;

  // Seguridad
  forzarCambioContrasena:  boolean;
  enviarCredencialesCorreo: boolean;
  autenticacion2fa:        boolean;
}

export interface UsuariosPaginado {
  items: UsuarioListaItem[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface GuardarUsuarioRequest {
  idUsuario:      number;
  nombre:         string;
  apellido:       string;
  tipoDocumento:  string;
  numeroDocumento: string;
  correo:         string;
  telefono:       string | null;
  cargo:          string | null;
  area:           string | null;
  rolSistema:     string;
  sedeOperativa:  string | null;
  idSupervisorDirecto:  number | null;
  habilitadoFirmaInacal:        boolean;
  numeroRegistroInacal:         string | null;
  fechaExpiracionCertificacion: string | null;
  requiereInduccionSctr:        boolean;
  contrasenaTemporal:           string;
  forzarCambioContrasena:       boolean;
  enviarCredencialesCorreo:     boolean;
  autenticacion2fa:             boolean;
  guardarComoBorrador:          boolean;
}

export interface CambiarEstadoUsuarioRequest {
  idUsuario: number;
  estado: string;
}

