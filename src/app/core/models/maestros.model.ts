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

export interface ContactoListaItem {
  idContacto: number;
  idCliente: number;
  idSede: number | null;
  nombres: string;
  documentoIdentidad: string | null;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefonoMovil: string | null;
  telefonoAnexo: string | null;
  esContactoPrincipal: boolean;
  autorizadoAprobarCotizaciones: boolean;
  recibeAlertasCalibracion: boolean;
  autorizadoRecepcionTecnica: boolean;
  estado: string;
}

export interface GuardarContactoRequest {
  idContacto: number;
  idCliente: number;
  idSede: number | null;
  nombres: string;
  documentoIdentidad: string | null;
  cargo: string | null;
  area: string | null;
  correo: string | null;
  telefonoMovil: string | null;
  telefonoAnexo: string | null;
  esContactoPrincipal: boolean;
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
