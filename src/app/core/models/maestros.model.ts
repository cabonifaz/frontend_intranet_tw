export interface CatalogoItem {
  id: number;
  nombre: string;
  codigo: string | null;
  // Opcionales — se usan en catálogos jerárquicos (ej. CARGO_USUARIO los usa
  // para indicar el área a la que pertenece el cargo via String3).
  num2?: number | null;
  string3?: string | null;
}

export interface ClientesPaginado {
  items: ClienteListaItem[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ClienteListaItem {
  idCliente: number;
  ruc: string;
  codigo: string;
  razonSocial: string;
  nombreComercial: string | null;
  tipoCliente: string;
  condicionFiscal: string;
  condicionContribuyente: string;
  esVip: boolean;
  estado: string;
  sedeNombre: string | null;
  sedeRegion: string | null;
  cantidadContactos: number;
  // Contacto principal de la empresa (nivel cliente, no por sede). Pendiente
  // de que Bryan modifique SP_ObtenerClientes para hacer LEFT JOIN con
  // contacto_cliente WHERE es_principal_empresa=1. Mientras no venga, se
  // renderiza "—" en la celda.
  contactoPrincipalNombre?: string | null;
  contactoPrincipalTelefono?: string | null;
}

export interface ClienteDetalle {
  idCliente: number;
  tipoDocumento: string;
  ruc: string;
  tipoCliente: string;
  razonSocial: string;
  nombreComercial: string | null;
  condicionFiscal: string;
  condicionContribuyente: string;
  condicionPago: string | null;
  lineaCreditoUsd: number | null;
  telefonoCentral: string | null;
  domicilioFiscal: string | null;
  esVip: boolean;
  reglaVip: string | null;
  descuentoVipPct: number | null;
  patronMasasAsignado: string | null;
  ssomaPolizaSctr: boolean;
  ssomaCamioneta4x4: boolean;
  ssomaInduccionSsoma: boolean;
  ssomaExamenMedico: boolean;
  ssomaNotas: string | null;
  idCategoria: number | null;
  nombreCategoria: string | null;
  estado: string;
}

export interface GuardarClienteRequest {
  idCliente: number;
  tipoDocumento: string;
  ruc: string;
  tipoCliente: string;
  razonSocial: string;
  nombreComercial: string | null;
  condicionFiscal: string;
  condicionContribuyente: string;
  condicionPago: string | null;
  lineaCreditoUsd: number | null;
  telefonoCentral: string | null;
  domicilioFiscal: string | null;
  esVip: boolean;
  reglaVip: string | null;
  descuentoVipPct: number | null;
  patronMasasAsignado: string | null;
  ssomaPolizaSctr: boolean;
  ssomaCamioneta4x4: boolean;
  ssomaInduccionSsoma: boolean;
  ssomaExamenMedico: boolean;
  ssomaNotas: string | null;
  idCategoria: number | null;
}

export interface CambiarEstadoClienteRequest {
  idCliente: number;
  estado: string;
}

export interface SedeListaItem {
  idSede: number;
  idCliente: number;
  nombre: string;
  tipoInstalacion: string | null;
  region: string | null;
  provincia: string | null;
  distrito: string | null;
  urbanizacion: string | null;
  direccionExacta: string | null;
  estado: string;
}

export interface GuardarSedeRequest {
  idSede: number;
  idCliente: number;
  nombre: string;
  tipoInstalacion: string | null;
  region: string | null;
  provincia: string | null;
  distrito: string | null;
  urbanizacion: string | null;
  direccionExacta: string;
}

export interface CambiarEstadoSedeRequest {
  idSede: number;
  estado: string;
}

/**
 * Vinculación contacto ↔ sede. Un contacto puede estar vinculado a N sedes
 * (mínimo 1 obligatoria) y ser principal de cada sede independientemente.
 * Back soporta esta estructura desde la migración 35 (tabla `contacto_sede`).
 */
export interface ContactoSede {
  idSede: number;
  nombreSede?: string;        // enriquecido para render en chips
  esPrincipalSede: boolean;
}

export interface ContactoListaItem {
  idContacto: number;
  idCliente: number;
  // idSede legacy: compat con contactos antiguos que no tenían array de sedes.
  // Para contactos nuevos se usa `sedes[]`.
  idSede: number | null;
  nombres: string;
  documentoIdentidad: string | null;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefonoMovil: string | null;
  telefonoAnexo: string | null;
  // esContactoPrincipal legacy: compat. Para el modelo nuevo usar `esPrincipalEmpresa`.
  esContactoPrincipal: boolean;
  sedes?: ContactoSede[];
  esPrincipalEmpresa?: boolean;
  autorizadoAprobarCotizaciones: boolean;
  recibeAlertasCalibracion: boolean;
  autorizadoRecepcionTecnica: boolean;
  estado: string;
}

export interface GuardarContactoRequest {
  idContacto: number;
  idCliente: number;
  // idSede legacy: fallback que el back usa si no viene `sedes[]` (null = usa sedes).
  idSede: number | null;
  nombres: string;
  documentoIdentidad: string | null;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefonoMovil: string | null;
  telefonoAnexo: string | null;
  // esContactoPrincipal legacy: el back lo ignora cuando viene `esPrincipalEmpresa`.
  esContactoPrincipal: boolean;
  // Array de sedes vinculadas. Mínimo 1 obligatoria. El back valida contra la
  // tabla `contacto_sede`.
  sedes?: ContactoSede[];
  // Flag separado del principal por sede: éste es principal a nivel empresa.
  esPrincipalEmpresa?: boolean;
  autorizadoAprobarCotizaciones: boolean;
  recibeAlertasCalibracion: boolean;
  autorizadoRecepcionTecnica: boolean;
}

export interface CambiarEstadoContactoRequest {
  idContacto: number;
  estado: string;
}

export interface CategoriaCliente {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  prioridadAtencion: number | null;
  pctGananciaMin: number | null;
  pctGananciaMax: number | null;
  estado: string;
}

export interface GuardarCategoriaRequest {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  prioridadAtencion: number | null;
  pctGananciaMin: number | null;
  pctGananciaMax: number | null;
}

export interface CambiarEstadoCategoriaRequest {
  idCategoria: number;
  estado: string;
}

// ─── Áreas del cliente (ubicación específica de sus equipos) ─────────────
// Son por cliente (no catálogo global). Cada cliente tiene sus propias áreas
// con nombres libres (ej. "Zona de carnes", "Patio norte"). Se persisten en
// la tabla `area_cliente` del back.
export interface AreaCliente {
  idArea: number;
  idCliente: number;
  nombre: string;
  estado: string;             // 'Activo' | 'Inactivo'
  equipos: number;            // conteo de equipos del cliente usando esta área
}

export interface GuardarAreaClienteRequest {
  idArea: number;             // 0 para crear, >0 para renombrar
  nombre: string;
}

export interface CambiarEstadoAreaClienteRequest {
  estado: string;
}
