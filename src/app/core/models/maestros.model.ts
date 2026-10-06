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
  // Áreas de operación del cliente (ej. Pesaje, Refrigeración, Minería).
  // Catálogo AREA_USUARIO (IdMaestro=79). Pendiente back: tabla cliente_area
  // + SP_ObtenerClientePorId devolviendo este array.
  areas?: string[];
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
  // Códigos de áreas (string2 de tabla_maestra AREA_USUARIO). Pendiente back:
  // SP_GuardarCliente debe aceptar el array y hacer delete+insert en cliente_area.
  areas?: string[];
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
 * Pendiente back: tabla puente `contacto_sede` + split de `es_contacto_principal`.
 */
export interface ContactoSede {
  idSede: number;
  nombreSede?: string;        // enriquecido para render en chips
  esPrincipalSede: boolean;
}

export interface ContactoListaItem {
  idContacto: number;
  idCliente: number;
  /** @deprecated Se mantiene por compat con back actual. Preferir `sedes[]`. */
  idSede: number | null;
  nombres: string;
  documentoIdentidad: string | null;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefonoMovil: string | null;
  telefonoAnexo: string | null;
  /** @deprecated Se mantiene por compat con back actual. Preferir `esPrincipalEmpresa`. */
  esContactoPrincipal: boolean;
  // Nuevos campos (modelo definitivo). Hasta que Bryan actualice los SPs,
  // vienen opcionales/vacíos y el front los sintetiza desde los legacy.
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
  /** @deprecated Compat back actual: enviamos la primera sede del array. */
  idSede: number | null;
  nombres: string;
  documentoIdentidad: string | null;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefonoMovil: string | null;
  telefonoAnexo: string | null;
  /** @deprecated Compat back actual: mirror de `esPrincipalEmpresa`. */
  esContactoPrincipal: boolean;
  // Nuevos campos (modelo definitivo).
  sedes?: ContactoSede[];
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
