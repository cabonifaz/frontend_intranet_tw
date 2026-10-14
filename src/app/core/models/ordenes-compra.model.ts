// ══════════════════════════════════════════════════════════════════════════
// MÓDULO 6 — Órdenes de Compra (HU-22 a HU-28)
// Alineado 1:1 con los DTOs del back (OrdenCompraDtos.cs).
// ══════════════════════════════════════════════════════════════════════════

// ─── Opción de filtro común ────────────────────────────────────────────────
export interface OpcionFiltro {
  id:     number;
  nombre: string;
  codigo?: string | null;
}

// ══════════════════════════════════════════════════════════════════════════
// HU-22 — Preparación de registro
// ══════════════════════════════════════════════════════════════════════════

export interface PropuestaOrdenCompraDto {
  idPropuesta:         number;
  numero:              string;
  version:             number;
  idCliente:           number;
  razonSocial:         string;
  ruc?:                string | null;
  idRequerimiento?:    number | null;
  numeroRq?:           string | null;
  total:               number;
  idMoneda:            number;
  moneda?:             string | null;
  monedaSimbolo?:      string | null;
  monedaNombre?:       string | null;
  fechaAceptacion?:    string | null;
  tipoAceptacion?:     string | null;
  idResponsable:       number;
  responsable?:        string | null;
  fechaServidor?:      string | null;
  vigenciaDiasDefecto: number;
}

export interface MonedaOrdenCompraDto {
  id:      number;
  nombre:  string;
  simbolo?: string | null;
  codigo?:  string | null;
}

export interface PreparacionOrdenCompraDto {
  propuesta: PropuestaOrdenCompraDto;
  monedas:   MonedaOrdenCompraDto[];
}

export interface DatosOrdenCompraDto {
  numeroOc?:       string | null;
  fechaOc?:        string | null;
  fechaRecepcion?: string | null;
  idMoneda?:       number | null;
  monto?:          number | null;
  vigenciaDias?:   number | null;
  observaciones?:  string | null;
  referencia?:     string | null;
}

export interface CoberturaOrdenCompraDto {
  estadoCobertura:        string;   // completa | parcial | excede | moneda_diferente
  coberturaPct:           number;
  diferencia?:            number | null;
  montoPropuesta:         number;
  idMonedaPropuesta:      number;
  monedaSimboloPropuesta?: string | null;
  montoOc:                number;
  idMonedaOc:             number;
  monedaSimboloOc?:       string | null;
}

export interface OrdenCompraRegistradaDto {
  idOc:            number;
  numeroOc:        string;
  estado:          string;
  estadoCobertura: string;
  coberturaPct:    number;
  diferencia?:     number | null;
  vigenciaHasta?:  string | null;
  siguienteEtapa:  string;
  notificados:     number;
}

// ══════════════════════════════════════════════════════════════════════════
// HU-23 — Bandeja + Detalle
// ══════════════════════════════════════════════════════════════════════════

export interface FiltrosBandejaOrdenesCompraDto {
  estado?:        string;
  cobertura?:     string;
  idCliente?:     number;
  idResponsable?: number;
  fechaDesde?:    string;
  fechaHasta?:    string;
  conPdf?:        boolean;
  busqueda?:      string;
  pagina?:        number;
  porPagina?:     number;
}

export interface KpisOrdenesCompraDto {
  vigentes:              number;
  coberturaParcial:      number;
  saldoInsuficiente:     number;
  pendientesValidacion:  number;
  listasProgramacion:    number;
  observadas:            number;
  vencidas:              number;
  pendientesConAlerta:   number;
  liberadas:             number;
}

export interface ItemBandejaOrdenCompraDto {
  idOc:                number;
  numeroOc:            string;
  fechaOc?:            string | null;
  fechaRecepcion?:     string | null;
  idCliente:           number;
  razonSocial:         string;
  ruc?:                string | null;
  idRequerimiento?:    number | null;
  numeroRq?:           string | null;
  idPropuesta?:        number | null;
  numeroPropuesta?:    string | null;
  versionPropuesta?:   number | null;
  idMoneda:            number;
  moneda?:             string | null;
  monedaSimbolo?:      string | null;
  montoOc:             number;
  montoPropuesta:      number;
  montoAplicado:       number;
  saldo:               number;
  coberturaPct?:       number | null;
  utilizacionPct:      number;
  coberturaCodigo:     string;
  coberturaProyectada: string;
  estado:              string;
  estadoVisual:        string;
  vigenciaHasta?:      string | null;
  diasParaVencer?:     number | null;
  idResponsable:       number;
  responsable?:        string | null;
  tienePdf:            boolean;
  urlPdf?:             string | null;
  listaProgramacion:   boolean;
  fechaRegistro?:      string | null;
  tipoOc:              string;
  idOcOrigen?:         number | null;
  numeroOcOrigen?:     string | null;
  saldoDisponible:     number;
  faltante:            number;
  fechaLiberacion?:    string | null;
}

export interface BandejaOrdenesCompraDto {
  kpis:         KpisOrdenesCompraDto;
  items:        ItemBandejaOrdenCompraDto[];
  total:        number;
  pagina:       number;
  porPagina:    number;
  clientes:     OpcionFiltro[];
  responsables: OpcionFiltro[];
}

export interface ResumenOrdenCompraDto {
  idOc:                  number;
  numeroOc:              string;
  referencia?:           string | null;
  estado:                string;
  estadoVisual:          string;
  fechaOc?:              string | null;
  fechaRecepcion?:       string | null;
  vigenciaDesde?:        string | null;
  vigenciaHasta?:        string | null;
  vigenciaDias?:         number | null;
  diasParaVencer?:       number | null;
  observaciones?:        string | null;
  idCliente:             number;
  razonSocial:           string;
  ruc?:                  string | null;
  idRequerimiento?:      number | null;
  numeroRq?:             string | null;
  referenciaServicio?:   string | null;
  idPropuesta?:          number | null;
  numeroPropuesta?:      string | null;
  versionPropuesta?:     number | null;
  idMoneda:              number;
  moneda?:               string | null;
  monedaSimbolo?:        string | null;
  monedaNombre?:         string | null;
  montoOc:               number;
  montoPropuesta:        number;
  diferencia:            number;
  montoAplicado:         number;
  saldo:                 number;
  coberturaPct?:         number | null;
  utilizacionPct:        number;
  coberturaCodigo:       string;
  coberturaProyectada:   string;
  idResponsable:         number;
  responsable?:          string | null;
  idRegistradoPor?:      number | null;
  registradoPor?:        string | null;
  fechaRegistro?:        string | null;
  idValidadoPor?:        number | null;
  validadoPor?:          string | null;
  fechaValidacion?:      string | null;
  idMotivoObservacion?:  number | null;
  motivoObservacion?:    string | null;
  motivosObservacion?:   string | null;
  detalleObservacion?:   string | null;
  responsableCorreccion?: string | null;
  nombreArchivoPdf?:     string | null;
  tamanoPdfBytes?:       number | null;
  urlPdf?:               string | null;
  listaProgramacion:     boolean;
  ordenesServicio:       number;
  tipoOc:                string;
  idOcOrigen?:           number | null;
  numeroOcOrigen?:       string | null;
  montoRequeridoNeto:    number;
  coberturaOtros:        number;
  montoAsignadoOc:       number;
  saldoDisponible:       number;
  faltante:              number;
  fechaLiberacion?:      string | null;
  liberadoPor?:          string | null;
}

export interface AplicacionOrdenCompraDto {
  idPropuesta:     number;
  numero:          string;
  version:         number;
  estado:          string;
  montoPropuesta:  number;
  idMoneda:        number;
  moneda?:         string | null;
  monedaSimbolo?:  string | null;
  montoAsignado?:  number | null;
  fechaAsignacion?: string | null;
  fechaAceptacion?: string | null;
  esPrincipal:     boolean;
  cubiertoOtrasOc: number;
  pendiente:       number;
}

export interface ItemChecklistOrdenCompraDto {
  codigo:      string;
  descripcion: string;
  cumple:      boolean;
  detalle?:    string | null;
}

export interface VinculacionOrdenCompraDto {
  tipo:        string;    // requerimiento | propuesta | expediente | orden_servicio
  idEntidad?:  number | null;
  codigo?:     string | null;
  descripcion: string;
  estado?:     string | null;
  disponible:  boolean;
  url?:        string | null;
}

export interface DocumentoOrdenCompraDto {
  tipo:         string;
  nombre:       string;
  tamanoBytes?: number | null;
  fecha?:       string | null;
  url?:         string | null;
}

export interface EtapaWorkflowOrdenCompraDto {
  orden:  number;
  codigo: string;
  etapa:  string;
  estado: string;
  fecha?: string | null;
}

export interface EventoHistorialOrdenCompraDto {
  fecha?:       string | null;
  tipo:         string;
  titulo:       string;
  descripcion?: string | null;
  idUsuario?:   number | null;
  usuario?:     string | null;
}

export interface DetalleOrdenCompraDto {
  resumen:            ResumenOrdenCompraDto;
  aplicaciones:       AplicacionOrdenCompraDto[];
  checklist:          ItemChecklistOrdenCompraDto[];
  checklistCumplidos: number;
  vinculaciones:      VinculacionOrdenCompraDto[];
  documentos:         DocumentoOrdenCompraDto[];
  workflow:           EtapaWorkflowOrdenCompraDto[];
  historial:          EventoHistorialOrdenCompraDto[];
}

export interface PropuestaSinOrdenCompraDto {
  idPropuesta:    number;
  numero:         string;
  version:        number;
  idCliente:      number;
  razonSocial:    string;
  ruc?:           string | null;
  idRequerimiento?: number | null;
  numeroRq?:      string | null;
  total:          number;
  idMoneda:       number;
  moneda?:        string | null;
  monedaSimbolo?: string | null;
  fechaAceptacion?: string | null;
  idResponsable:  number;
  responsable?:   string | null;
}

// ══════════════════════════════════════════════════════════════════════════
// HU-24 — Edición
// ══════════════════════════════════════════════════════════════════════════

export interface EvaluacionOrdenCompraSolicitudDto {
  numeroOc?:   string | null;
  idMoneda?:   number | null;
  monto?:      number | null;
  tieneArchivo: boolean;
}

export interface EvaluacionOrdenCompraDto {
  estadoCobertura:         string;
  etiquetaCobertura:       string;
  coberturaPct:            number;
  diferencia?:             number | null;
  montoPropuesta:          number;
  idMonedaPropuesta:       number;
  monedaSimboloPropuesta?: string | null;
  montoOc?:                number | null;
  idMonedaOc?:             number | null;
  monedaSimboloOc?:        string | null;
  toleranciaPct:           number;
  dentroTolerancia:        boolean;
  esEdicion:               boolean;
  montoOcActual?:          number | null;
  idMonedaActual?:         number | null;
  cambiaMontoMoneda:       boolean;
  requiereRevalidacion:    boolean;
  cambioBloqueado:         boolean;
  montoAplicadoProyectado: number;
  saldoProyectado:         number;
  checklist:               ItemChecklistOrdenCompraDto[];
  checklistCumplidos:      number;
  todoConforme:            boolean;
}

export interface OrdenCompraEdicionDto {
  idOc:                          number;
  numeroOc:                      string;
  referencia?:                   string | null;
  fechaOc?:                      string | null;
  fechaRecepcion?:               string | null;
  vigenciaDias?:                 number | null;
  vigenciaHasta?:                string | null;
  idMoneda:                      number;
  moneda?:                       string | null;
  monedaSimbolo?:                string | null;
  monedaNombre?:                 string | null;
  montoOc:                       number;
  observaciones?:                string | null;
  nombreArchivoPdf?:             string | null;
  tamanoPdfBytes?:               number | null;
  urlPdf?:                       string | null;
  idPropuesta?:                  number | null;
  numeroPropuesta?:              string | null;
  versionPropuesta?:             number | null;
  idRequerimiento?:              number | null;
  numeroRq?:                     string | null;
  idCliente:                     number;
  razonSocial:                   string;
  ruc?:                          string | null;
  idMonedaPropuesta?:            number | null;
  monedaSimboloPropuesta?:       string | null;
  montoPropuesta:                number;
  montoAplicado:                 number;
  saldo:                         number;
  coberturaPct?:                 number | null;
  utilizacionPct:                number;
  coberturaCodigo:               string;
  coberturaProyectada:           string;
  estado:                        string;
  estadoVisual:                  string;
  idMotivoObservacion?:          number | null;
  motivoObservacion?:            string | null;
  requiereRevalidacionAlCambiar: boolean;
  puedeCambiarMonto:             boolean;
  ordenesServicio:               number;
  fechaServidor?:                string | null;
}

export interface EdicionOrdenCompraDto {
  ordenCompra: OrdenCompraEdicionDto;
  monedas:     MonedaOrdenCompraDto[];
}

export interface EditarOrdenCompraSolicitudDto extends DatosOrdenCompraDto {
  revalidar: boolean;
}

export interface OrdenCompraEditadaDto {
  idOc:                 number;
  numeroOc:             string;
  estado:               string;
  estadoCobertura:      string;
  coberturaPct:         number;
  diferencia?:          number | null;
  requiereRevalidacion: boolean;
  cambios?:             string | null;
  notificados:          number;
}

// ══════════════════════════════════════════════════════════════════════════
// HU-25 — Documentos + Auditoría
// ══════════════════════════════════════════════════════════════════════════

export interface VersionDocumentoOrdenCompraDto {
  idDocumento?:  number | null;
  version:       number;
  nombreArchivo: string;
  tamanoBytes?:  number | null;
  motivo?:       string | null;
  hash?:         string | null;
  fechaCarga?:   string | null;
  idSubidoPor?:  number | null;
  subidoPor?:    string | null;
  esActual:      boolean;
  url?:          string | null;
}

export interface DocumentosOrdenCompraDto {
  idOc:            number;
  numeroOc:        string;
  estado:          string;
  puedeReemplazar: boolean;
  totalVersiones:  number;
  actual?:         VersionDocumentoOrdenCompraDto | null;
  versiones:       VersionDocumentoOrdenCompraDto[];
}

export interface CabeceraAuditoriaOrdenCompraDto {
  idOc:              number;
  numeroOc:          string;
  estado:            string;
  estadoVisual?:     string | null;
  idExpediente?:     number | null;
  numeroExpediente?: string | null;
  estadoExpediente?: string | null;
  etapaExpediente?:  string | null;
  idPropuesta?:      number | null;
  numeroPropuesta?:  string | null;
  versionPropuesta?: number | null;
  idRequerimiento?:  number | null;
  numeroRq?:         string | null;
  idCliente:         number;
  razonSocial?:      string | null;
  ruc?:              string | null;
  generadoEn?:       string | null;
  generadoPor?:      string | null;
}

export interface EventoTimelineAuditoriaDto {
  fecha?:       string | null;
  codigo:       string;
  titulo:       string;
  descripcion?: string | null;
  nivel:        string;   // exito | info | alerta | documento | neutro
  referencia?:  string | null;
  url?:         string | null;
  idUsuario?:   number | null;
  usuario?:     string | null;
  area?:        string | null;
  rol?:         string | null;
}

export interface RegistroAuditoriaCrmDto {
  fecha?:        string | null;
  entidad:       string;
  idEntidad:     number;
  referencia?:   string | null;
  accion:        string;
  estadoAnterior?: string | null;
  estadoNuevo?:  string | null;
  descripcion?:  string | null;
  idUsuario?:    number | null;
  usuario?:      string | null;
}

export interface AplicacionAuditoriaDto {
  idPropuesta:     number;
  numero:          string;
  version:         number;
  estado:          string;
  montoPropuesta:  number;
  monedaSimbolo?:  string | null;
  montoAsignado:   number;
  fechaAsignacion?: string | null;
  asignadoPor?:    string | null;
}

export interface DocumentoSsomaAuditoriaDto {
  numeroOs:          string;
  idSsomaDoc:        number;
  requisito?:        string | null;
  trabajador?:       string | null;
  estado:            string;
  version:           number;
  fechaCarga?:       string | null;
  fechaVencimiento?: string | null;
  motivoObservacion?: string | null;
}

export interface AuditoriaOrdenCompraDto {
  cabecera:            CabeceraAuditoriaOrdenCompraDto;
  timeline:            EventoTimelineAuditoriaDto[];
  registroCrm:         RegistroAuditoriaCrmDto[];
  aplicaciones:        AplicacionAuditoriaDto[];
  documentacionSsoma:  DocumentoSsomaAuditoriaDto[];
  versionesPdf:        VersionDocumentoOrdenCompraDto[];
}

// ══════════════════════════════════════════════════════════════════════════
// HU-26 — Validar + Observar
// ══════════════════════════════════════════════════════════════════════════

export interface ResumenValidacionOrdenCompraDto {
  idOc:              number;
  numeroOc:          string;
  estado:            string;
  estadoVisual:      string;
  idPropuesta?:      number | null;
  numeroPropuesta?:  string | null;
  versionPropuesta?: number | null;
  idRequerimiento?:  number | null;
  numeroRq?:         string | null;
  idCliente:         number;
  razonSocial?:      string | null;
  ruc?:              string | null;
  montoOc:           number;
  montoPropuesta:    number;
  idMoneda:          number;
  monedaSimbolo?:    string | null;
  monedaNombre?:     string | null;
  coberturaPct?:     number | null;
  coberturaProyectada?: string | null;
  fechaOc?:          string | null;
  fechaRecepcion?:   string | null;
  vigenciaHasta?:    string | null;
  nombreArchivoPdf?: string | null;
  urlPdf?:           string | null;
  idResponsable:     number;
  responsable?:      string | null;
  dictamen:          string;
  dictamenMensaje?:  string | null;
  inconsistencias:   number;
  puedeValidar:      boolean;
  puedeObservar:     boolean;
  motivoNoDisponible?: string | null;
}

export interface ItemValidacionOrdenCompraDto {
  orden:                number;
  codigo:               string;
  descripcion:          string;
  valorSistema?:        string | null;
  valorReferencia?:     string | null;
  cumpleAuto:           boolean;
  requiereConfirmacion: boolean;
  detalle?:             string | null;
}

export interface ResponsableCorreccionDto {
  id:                     number;
  nombre:                 string;
  etiqueta:               string;
  esResponsablePropuesta: boolean;
}

export interface ObservacionOrdenCompraDto {
  idObservacion:         number;
  estado:                string;
  detalle:               string;
  fechaObservacion?:     string | null;
  fechaLevantamiento?:   string | null;
  observadoPor?:         string | null;
  responsableCorreccion?: string | null;
  motivos?:              string | null;
}

export interface PreparacionValidacionOrdenCompraDto {
  resumen:        ResumenValidacionOrdenCompraDto;
  checklist:      ItemValidacionOrdenCompraDto[];
  motivos:        OpcionFiltro[];
  responsables:   ResponsableCorreccionDto[];
  observaciones:  ObservacionOrdenCompraDto[];
}

export interface ValidarOrdenCompraSolicitudDto {
  confirmados?: string[] | null;
  comentario?:  string | null;
}

export interface OrdenCompraValidadaDto {
  idOc:            number;
  numeroOc:        string;
  estado:          string;
  estadoCobertura: string;
  fechaValidacion?: string | null;
  validadoPor?:    string | null;
  notificados:     number;
}

export interface ObservarOrdenCompraSolicitudDto {
  motivos?:       number[] | null;
  detalle?:       string | null;
  idResponsable?: number | null;
}

export interface ObservacionRegistradaDto {
  idObservacion:        number;
  idOc:                 number;
  numeroOc:             string;
  estado:               string;
  motivos?:             string | null;
  idResponsable:        number;
  responsable?:         string | null;
  expedienteBloqueado:  boolean;
  notificados:          number;
}

// ══════════════════════════════════════════════════════════════════════════
// HU-27 — Distribución + Complementaria
// ══════════════════════════════════════════════════════════════════════════

export interface OcDistribucionDto {
  idOc:              number;
  numeroOc:          string;
  tipoOc:            string;
  estado:            string;
  estadoVisual:      string;
  idCliente:         number;
  razonSocial?:      string | null;
  ruc?:              string | null;
  idMoneda:          number;
  moneda?:           string | null;
  monedaSimbolo?:    string | null;
  montoTotal:        number;
  montoAplicado:     number;
  saldoDisponible:   number;
  usoPct:            number;
  puedeDistribuir:   boolean;
  motivoNoDisponible?: string | null;
}

export interface AplicacionDistribucionDto {
  idPropuesta:     number;
  documento:       string;
  tipo:            string;
  numero:          string;
  version:         number;
  cliente?:        string | null;
  concepto?:       string | null;
  requerido:       number;
  aplicado:        number;
  aplicadoOtrasOc: number;
  pendiente:       number;
  estadoCobertura: string;    // cubierto | parcial | pendiente
  vinculada:       boolean;
  esPrincipal:     boolean;
  idResponsable?:  number | null;
  responsable?:    string | null;
}

export interface DistribucionOrdenCompraDto {
  ordenCompra:  OcDistribucionDto;
  aplicaciones: AplicacionDistribucionDto[];
}

export interface DistribuirOrdenCompraSolicitudDto {
  idPropuesta?: number | null;
  monto?:       number | null;
}

export interface ResultadoDistribucionDto {
  idOc:               number;
  idPropuesta:        number;
  propuesta:          string;
  saldoAntes:         number;
  saldoDespues:       number;
  aplicadoAntes:      number;
  aplicadoDespues:    number;
  pendientePropuesta: number;
  estadoCobertura:    string;
}

export interface PropuestaOcComplementariaDto {
  idPropuesta:         number;
  numero:              string;
  version:             number;
  idCliente:           number;
  razonSocial?:        string | null;
  ruc?:                string | null;
  idRequerimiento?:    number | null;
  numeroRq?:           string | null;
  idMoneda:            number;
  moneda?:             string | null;
  monedaSimbolo?:      string | null;
  monedaNombre?:       string | null;
  montoPropuesta:      number;
  montoCubierto:       number;
  faltante:            number;
  coberturaPct:        number;
  vigenciaDiasDefecto: number;
  fechaServidor?:      string | null;
  montoNuevaOc?:       number | null;
  coberturaTotal:      number;
  coberturaTotalPct:   number;
  estadoResultado:     string;
  saldoNuevaOc:        number;
  faltanteDespues:     number;
}

export interface OcExistenteDto {
  idOc:          number;
  numeroOc:      string;
  tipoOc:        string;
  estado:        string;
  montoTotal:    number;
  montoAsignado: number;
  fechaOc?:      string | null;
}

export interface PreparacionOcComplementariaDto {
  propuesta:         PropuestaOcComplementariaDto;
  ordenesExistentes: OcExistenteDto[];
}

export interface RegistrarOcComplementariaSolicitudDto {
  numeroOc?:       string | null;
  fechaOc?:        string | null;
  fechaRecepcion?: string | null;
  monto?:          number | null;
  vigenciaDias?:   number | null;
  observaciones?:  string | null;
  referencia?:     string | null;
}

export interface OcComplementariaRegistradaDto {
  idOc?:            number | null;
  numeroOc:         string;
  estado:           string;
  idOcOrigen:       number;
  numeroOcOrigen?:  string | null;
  montoExistente:   number;
  montoNuevaOc:     number;
  coberturaTotal:   number;
  coberturaTotalPct: number;
  estadoResultado:  string;
  saldoNuevaOc:     number;
  notificados:      number;
}

// ══════════════════════════════════════════════════════════════════════════
// HU-28 — Liberación
// ══════════════════════════════════════════════════════════════════════════

export interface CabeceraLiberacionDto {
  idOc:                      number;
  numeroOc:                  string;
  idCliente:                 number;
  razonSocial?:              string | null;
  idExpediente?:             number | null;
  numeroExpediente?:         string | null;
  etapaExpediente?:          string | null;
  estadoExpediente?:         string | null;
  creaExpediente:            boolean;
  puedeLiberar:              boolean;
  requiereConfirmacion:      boolean;
  bloqueantes:               number;
  alertas:                   number;
  impacto?:                  string | null;
  informacionProceso?:       string | null;
  siguienteEtapaCodigo:      string;
  siguienteEtapa:            string;
  responsableSiguienteEtapa: string;
  slaHoras:                  number;
}

export interface ValidacionLiberacionDto {
  orden:       number;
  codigo:      string;
  descripcion: string;
  estado:      string;   // cumple | alerta | bloqueante
  fecha?:      string | null;
  detalle?:    string | null;
}

export interface PreparacionLiberacionDto {
  cabecera:     CabeceraLiberacionDto;
  validaciones: ValidacionLiberacionDto[];
}

export interface LiberarOrdenCompraSolicitudDto {
  confirmaImpacto: boolean;
  comentario?:     string | null;
}

export interface OrdenCompraLiberadaDto {
  idOc:                     number;
  numeroOc:                 string;
  idExpediente:             number;
  numeroExpediente:         string;
  expedienteCreado:         boolean;
  etapa:                    string;
  estadoExpediente:         string;
  alertasPendientes:        number;
  slaHoras:                 number;
  fechaLimiteProgramacion?: string | null;
  notificados:              number;
}
