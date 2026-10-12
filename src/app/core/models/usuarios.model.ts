export interface UsuarioListaItem {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rolSistema: string;
  rolSistemaLabel: string;
  telefono: string | null;
  anexo?: string | null;
  troncal?: string | null;
  estado: string;
  ultimoAcceso: string | null;
  fechaCreacion: string;
}

export interface UsuarioDetalle extends UsuarioListaItem {
  // Información personal
  tipoDocumento:   string;
  numeroDocumento: string;
  fechaNacimiento?: string | null;   // ISO yyyy-mm-dd (opcional)
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
  fechaNacimiento?: string | null;   // ISO yyyy-mm-dd (opcional)
  anexo?:         string | null;     // Anexo completo (troncal + interno 3 dígitos)
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


// ── Servicio de correo (Brevo) ───────────────────────────────────────────────

/** Respuesta de POST /api/maestros/usuarios. */
export interface UsuarioGuardado {
  idUsuario:        number;
  correoSolicitado: boolean;        // se marcó "enviar credenciales"
  correoEnviado:    boolean;
  correoDestino:    string | null;
  correoError:      string | null;
}

/** Respuesta de POST /api/maestros/usuarios/{id}/reenviar-credenciales. */
export interface ReenvioCredenciales {
  idUsuario:          number;
  correo:             string;
  correoEnviado:      boolean;
  correoError:        string | null;
  /** Solo llega si el correo NO salió: hay que entregarla por otro medio. */
  contrasenaTemporal: string | null;
}

export interface ResultadoConMensaje<T> {
  datos:   T;
  mensaje: string;
}
