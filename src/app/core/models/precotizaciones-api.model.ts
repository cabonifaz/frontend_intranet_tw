// DTOs 1:1 con PrecotizacionesController del backend (HU-60 Precotizaciones Técnicas).
// Lado Comercial: bandeja + detalle + precarga para nueva propuesta derivada + conversión.

export interface RespuestaPrecotApi<T> {
  idTipoMensaje: number;
  mensaje: string;
  datos: T;
}

// ─── HU-60 Bandeja (tab dentro de Propuestas) ──────────────────────────────

export type EstadoPrecotizacion = 'pendiente' | 'convertida';

export interface FiltrosPrecotizacionesQs {
  estado?:       EstadoPrecotizacion | 'todas' | null;
  busqueda?:     string | null;
  idSupervisor?: number | null;
  fechaDesde?:   string | null;
  fechaHasta?:   string | null;
  pagina?:       number;
  porPagina?:    number;
}

export interface TarjetasPrecotizacionesApi {
  pendientes:          number;
  convertidasMes:      number;
  tiempoPromedioHoras: number | null;
  metaHoras:           number;
  supervisores:        number;
  nombresSupervisores: string | null;
}

export interface ItemBandejaPrecotizacionApi {
  idPrecotizacion:          number;
  numero:                   string | null;
  fecha:                    string | null;
  idRequerimiento:          number | null;
  numeroRq:                 string | null;
  idCliente:                number | null;
  razonSocial:              string | null;
  ruc:                      string | null;
  sede:                     string | null;
  idEquipo:                 number | null;
  equipo:                   string | null;
  idSupervisor:             number | null;
  supervisor:               string | null;
  items:                    number;
  observaciones:            number;
  estado:                   string | null;
  estadoGrupo:              EstadoPrecotizacion | null;
  estadoLabel:              string | null;
  idOs:                     number | null;
  numeroOs:                 string | null;
  idInforme:                number | null;
  idPropuestaGenerada:      number | null;
  numeroPropuestaGenerada:  string | null;
  versionPropuestaGenerada: number | null;
}

export interface OpcionPrecotApi {
  id:     number;
  nombre: string | null;
}

export interface BandejaPrecotizacionesApi {
  tarjetas:     TarjetasPrecotizacionesApi;
  items:        ItemBandejaPrecotizacionApi[];
  total:        number;
  pagina:       number;
  porPagina:    number;
  supervisores: OpcionPrecotApi[];
}

// ─── HU-60 Detalle ──────────────────────────────────────────────────────────

export interface CabeceraPrecotizacionApi {
  idPrecotizacion:            number;
  numero:                     string | null;
  estado:                     string | null;
  estadoGrupo:                EstadoPrecotizacion | null;
  estadoLabel:                string | null;
  estadoDetalle:              string | null;
  fecha:                      string | null;
  notaSupervisor:             string | null;
  diagnostico:                string | null;
  idRequerimiento:            number | null;
  numeroRq:                   string | null;
  fechaRq:                    string | null;
  idCliente:                  number | null;
  razonSocial:                string | null;
  ruc:                        string | null;
  idSede:                     number | null;
  sede:                       string | null;
  idEquipo:                   number | null;
  equipo:                     string | null;
  marca:                      string | null;
  modelo:                     string | null;
  codigoTw:                   string | null;
  numeroSerie:                string | null;
  idSupervisor:               number | null;
  supervisor:                 string | null;
  cargoSupervisor:            string | null;
  idInforme:                  number | null;
  versionInforme:             number | null;
  idOs:                       number | null;
  numeroOs:                   string | null;
  fechaEjecucion:             string | null;
  tipoServicio:               string | null;
  items:                      number;
  observaciones:              number;
  idPropuestaGenerada:        number | null;
  numeroPropuestaGenerada:    string | null;
  versionPropuestaGenerada:   number | null;
  estadoPropuestaGenerada:    string | null;
  totalPropuestaGenerada:     number | null;
  monedaPropuestaGenerada:    string | null;
  comercialPropuestaGenerada: string | null;
  fechaConversion:            string | null;
  convertidoPor:              string | null;
  horasAtencion:              number | null;
  idPropuestaOrigen:          number | null;
  numeroPropuestaOrigen:      string | null;
  versionPropuestaOrigen:     number | null;
  puedeConvertir:             boolean;
  mensajeConversion:          string | null;
}

export interface ObservacionPrecotApi {
  idObservacion:   number;
  codigo:          string | null;
  titulo:          string | null;
  descripcion:     string | null;
  ubicacion:       string | null;
  nivelAfectacion: 'critico' | 'alto' | 'medio' | 'bajo' | null;
}

export interface ItemPrecotDetalleApi {
  idItem:             number;
  orden:              number;
  concepto:           string | null;
  codigo:             string | null;
  idSuministro:       number | null;
  descripcionTecnica: string | null;
  cantidad:           number;
  unidad:             string | null;
  prioridad:          'alta' | 'media' | 'opcional' | null;
  idObservacion:      number | null;
  codigoObservacion:  string | null;
  precioReferencia:   number | null;
}

/** rq · propuesta_origen · oc · os · precotizacion · propuesta_derivada */
export type PasoCodigoTraza =
  | 'rq' | 'propuesta_origen' | 'oc' | 'os' | 'precotizacion' | 'propuesta_derivada';

export interface PasoTrazabilidadApi {
  orden:      number;
  codigo:     PasoCodigoTraza | null;
  titulo:     string | null;
  detalle:    string | null;
  fecha:      string | null;
  completado: boolean;
  actual:     boolean;
}

export interface DetallePrecotizacionApi {
  cabecera:      CabeceraPrecotizacionApi;
  observaciones: ObservacionPrecotApi[];
  items:         ItemPrecotDetalleApi[];
  trazabilidad:  PasoTrazabilidadApi[];
}

// ─── Precarga para la nueva propuesta derivada ─────────────────────────────

export interface CabeceraPrecargaApi {
  idPrecotizacion:  number;
  numero:           string | null;
  idRequerimiento:  number | null;
  numeroRq:         string | null;
  idCliente:        number | null;
  razonSocial:      string | null;
  ruc:              string | null;
  idContacto:       number | null;
  contacto:         string | null;
  idSede:           number | null;
  sede:             string | null;
  idOs:             number | null;
  numeroOs:         string | null;
  idExpediente:     number | null;
  numeroExpediente: string | null;
  idSupervisor:     number | null;
  supervisor:       string | null;
  fecha:            string | null;
  equipo:           string | null;
  tipoServicio:     string | null;
  nota:             string | null;
  items:            number;
}

export interface ItemPrecargaApi {
  idItem:             number;
  orden:              number;
  concepto:           string | null;
  codigo:             string | null;
  idSuministro:       number | null;
  descripcion:        string | null;
  descripcionTecnica: string | null;
  cantidad:           number;
  unidad:             string | null;
  prioridad:          'alta' | 'media' | 'opcional' | null;
  seccion:            'principal' | 'opcional' | null;
  precioReferencia:   number | null;
  idMonedaReferencia: number | null;
  codigoObservacion:  string | null;
}

export interface PrecargaPrecotizacionApi {
  cabecera: CabeceraPrecargaApi;
  items:    ItemPrecargaApi[];
}

// ─── Conversión ────────────────────────────────────────────────────────────

export interface ConvertirPrecotizacionPayload {
  /** Id de la Propuesta creada a partir de la precotización (mismo cliente y RQ). */
  idPropuesta: number;
}

export interface PrecotizacionConvertidaApi {
  idPrecotizacion:  number;
  numero:           string | null;
  estado:           string | null;
  idPropuesta:      number;
  numeroPropuesta:  string | null;
  versionPropuesta: number | null;
}
