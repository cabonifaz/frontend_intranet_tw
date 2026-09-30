export interface UsuarioListaItem {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rolSistema: string;
  rolSistemaLabel: string;
  areaComercial: string | null;
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

  // Asignación operativa
  baseOperativa:        string | null;
  idSupervisorDirecto:  number | null;
  sedesAutorizadas:     number[];

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
  rolSistema:     string;
  areaComercial:  string | null;
  baseOperativa:  string | null;
  idSupervisorDirecto:  number | null;
  sedesAutorizadas:     number[];
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

export interface SedeOperativa {
  idSede: number;
  nombre: string;
  ubicacion: string;
  tipo: string;
}
