// ═════════════════════════════════════════════════════════════════════════════
// MÓDULO 7 — Expediente Digital (HU-29 a HU-33, Sprint 4)
// Alineado 1:1 con ExpedienteDtos.cs del back (commit ce021ea).
//
// El expediente es de consulta: nace con el RQ, sus etapas avanzan solas según
// el flujo y los documentos y bloqueos se gestionan en los módulos origen.
// ═════════════════════════════════════════════════════════════════════════════

export interface OpcionExpedienteDto {
  codigo: string;
  nombre: string;
}

export interface OpcionIdExpedienteDto {
  id:     number;
  nombre: string;
  codigo?: string | null;
}

/** SLA de la etapa actual: en_plazo, en_riesgo o vencido. */
export interface SlaExpedienteDto {
  inicioEtapa?:    string | null;
  horas?:          number | null;
  fechaLimite?:    string | null;
  estado?:         string | null;
  minutosRestantes?: number | null;
}

/** Archivo binario generado por el back (XLSX, PDF, ZIP). */
export interface ArchivoGeneradoDto {
  contenido:    string; // base64 cuando llegue por JSON; en nuestros clientes HTTP vamos a usar responseType blob directo
  nombreArchivo: string;
  tipoContenido: string;
}

// ─── HU-29 Bandeja ───────────────────────────────────────────────────────────

export interface FiltrosBandejaExpedientesDto {
  /** abiertos (defecto), listo_para_avanzar, bloqueado, con_excepcion, sla_vencido, activo, cerrado o todos. */
  estado?:        string;
  etapa?:         string;
  idCliente?:     number;
  area?:          string;
  tipoPropuesta?: string;
  desde?:         string;
  hasta?:         string;
  /** en_plazo, en_riesgo o vencido. */
  sla?:           string;
  busqueda?:      string;
  pagina?:        number;
  porPagina?:     number;
}

export interface TarjetasExpedientesDto {
  activos:          number;
  listosParaAvanzar: number;
  bloqueados:        number;
  conExcepcion:      number;
  slaVencidos:       number;
}

/** Fila de la tabla de 8 columnas. Estado: activo | bloqueado | con_excepcion | cerrado. */
export interface FilaExpedienteDto {
  idExpediente:        number;
  numero:              string;
  idRequerimiento?:    number | null;
  numeroRq?:           string | null;
  idPropuesta?:        number | null;
  numeroPropuesta?:    string | null;
  versionPropuesta?:   number | null;
  estadoPropuesta?:    string | null;
  propuestasOtras:     number;
  idCliente?:          number | null;
  razonSocial?:        string | null;
  ruc?:                string | null;
  cantidadOc:          number;
  numerosOc?:          string | null;
  numeroOsOm?:         string | null;
  numerosOs?:          string | null;
  numerosOm?:          string | null;
  tipoPropuesta?:      string | null;
  etapa:               string;
  etapaNombre?:        string | null;
  estado:              string;
  listoParaAvanzar:    boolean;
  progreso:            number;
  area?:               string | null;
  areaNombre?:         string | null;
  idResponsable?:      number | null;
  responsable?:        string | null;
  idResponsableEtapa?: number | null;
  responsableEtapa?:   string | null;
  bloqueos:            number;
  excepciones:         number;
  motivoBloqueo?:      string | null;
  sla:                 SlaExpedienteDto;
  fechaCreacion?:      string | null;
  diasTranscurridos:   number;
}

export interface ClienteFiltroExpedienteDto {
  idCliente:    number;
  razonSocial:  string;
  ruc?:         string | null;
}

export interface BandejaExpedientesDto {
  tarjetas:       TarjetasExpedientesDto;
  filas:          FilaExpedienteDto[];
  total:          number;
  pagina:         number;
  porPagina:      number;
  estados:        OpcionExpedienteDto[];
  etapas:         OpcionExpedienteDto[];
  clientes:       ClienteFiltroExpedienteDto[];
  areas:          OpcionExpedienteDto[];
  tiposPropuesta: OpcionExpedienteDto[];
  estadosSla:     OpcionExpedienteDto[];
}

// ─── HU-30 Ficha: cabecera + tab Resumen ─────────────────────────────────────

export interface CabeceraExpedienteDto {
  idExpediente:        number;
  numero:              string;
  /** activo, bloqueado, con_excepcion o cerrado. */
  estado:              string;
  etapa:               string;
  etapaNombre?:        string | null;
  etapaComercial:      boolean;
  progreso:            number;
  idCliente?:          number | null;
  razonSocial?:        string | null;
  ruc?:                string | null;
  areaServicio?:       string | null;
  area?:               string | null;
  areaNombre?:         string | null;
  idResponsable?:      number | null;
  responsable?:        string | null;
  cargoResponsable?:   string | null;
  idResponsableEtapa?: number | null;
  responsableEtapa?:   string | null;
  idRequerimiento?:    number | null;
  numeroRq?:           string | null;
  idPropuesta?:        number | null;
  numeroPropuesta?:    string | null;
  versionPropuesta?:   number | null;
  estadoPropuesta?:    string | null;
  tipoPropuesta?:      string | null;
  montoTotal?:         number | null;
  moneda?:             string | null;
  simboloMoneda?:      string | null;
  fechaCreacion?:      string | null;
  fechaCierre?:        string | null;
  // KPIs
  diasTranscurridos:   number;
  sla:                 SlaExpedienteDto;
  documentosTotales:   number;
  bloqueosActivos:     number;
  excepcionesActivas:  number;
  motivoBloqueo?:      string | null;
  listoParaAvanzar:    boolean;
  // Próximo hito
  siguienteEtapa?:     string | null;
  siguienteEtapaNombre?: string | null;
  proximoPaso?:        string | null;
  // Contadores de tabs
  cantidadPropuestas:  number;
  cantidadOc:          number;
  cantidadVb:          number;
  cantidadOs:          number;
  // Acciones rápidas
  puedeReasignar:      boolean;
  puedeExportar:       boolean;
}

/** Etapa del stepper. Estado: completado | en_curso | bloqueado | pendiente | cancelado | no_aplica. */
export interface EtapaExpedienteDto {
  orden:         number;
  etapa:         string;
  nombre:        string;
  estado:        string;
  area?:         string | null;
  areaNombre?:   string | null;
  inicio?:       string | null;
  fin?:          string | null;
  idResponsable?: number | null;
  responsable?:  string | null;
  slaHoras?:     number | null;
  horasReales?:  number | null;
  cumpleSla?:    boolean | null;
}

/** Responsable actual por rol: comercial, operaciones, ssoma o tecnico. */
export interface ResponsableActualExpedienteDto {
  rol:        string;
  idUsuario?: number | null;
  nombre?:    string | null;
  cargo?:     string | null;
}

/** Nodo del árbol de entidades. EntidadTipo: requerimiento | propuesta | orden_compra | orden_servicio | orden_metrologia. */
export interface EntidadExpedienteDto {
  clave:            string;
  clavePadre?:      string | null;
  nivel:            number;
  entidadTipo:      string;
  idEntidad:        number;
  codigo?:          string | null;
  version?:         number | null;
  estado?:          string | null;
  monto?:           number | null;
  simboloMoneda?:   string | null;
  idResponsable?:   number | null;
  responsable?:     string | null;
  fecha?:           string | null;
  fechaEnvio?:      string | null;
  fechaCierre?:     string | null;
  detalle?:         string | null;
  activa:           boolean;
  esPropuestaActiva: boolean;
}

/** Alerta activa. Clase: bloqueo | excepcion | alerta. */
export interface AlertaExpedienteDto {
  clave:        string;
  clase:        string;
  tipo?:        string | null;
  tipoNombre?:  string | null;
  etapa?:       string | null;
  etapaNombre?: string | null;
  entidadTipo?: string | null;
  idEntidad?:   number | null;
  entidad?:     string | null;
  motivo?:      string | null;
  impacto?:     string | null;
  critico:      boolean;
  fecha?:       string | null;
  origen?:      string | null;
  idUsuario?:   number | null;
  usuario?:     string | null;
}

export interface EventoExpedienteDto {
  fecha:        string;
  tipoEvento?:  string | null;
  accion?:      string | null;
  titulo?:      string | null;
  descripcion?: string | null;
  etapa?:       string | null;
  etapaNombre?: string | null;
  idUsuario?:   number | null;
  usuario:      string;
  entidad?:     string | null;
  referencia?:  string | null;
  urgente:      boolean;
  origen?:      string | null;
}

export interface DetalleExpedienteDto {
  cabecera:          CabeceraExpedienteDto;
  etapas:            EtapaExpedienteDto[];
  responsables:      ResponsableActualExpedienteDto[];
  entidades:         EntidadExpedienteDto[];
  alertas:           AlertaExpedienteDto[];
  actividadReciente: EventoExpedienteDto[];
}

// ─── HU-30 Tabs (carga perezosa) ─────────────────────────────────────────────

export interface EventoTabDto {
  fecha?:       string | null;
  tipo?:        string | null;
  titulo?:      string | null;
  descripcion?: string | null;
  idUsuario?:   number | null;
  usuario?:     string | null;
}

/** Archivo que se descarga con GET /api/expedientes/{id}/documentos/{clave}. */
export interface ArchivoTabDto {
  clave:         string;
  nombreArchivo?: string | null;
  tipo?:         string | null;
  tamanoBytes?:  number | null;
  fecha?:        string | null;
  usuario?:      string | null;
}

// Tab RQ
export interface DatosRqExpedienteDto {
  idRequerimiento:   number;
  numero:            string;
  estado?:           string | null;
  estadoNombre?:     string | null;
  origen?:           string | null;
  gradoNecesidad?:   string | null;
  areaServicio?:     string | null;
  descripcion?:      string | null;
  fechaRequerida?:   string | null;
  fechaRegistro?:    string | null;
  fechaCierre?:      string | null;
  requiereVisita:    boolean;
  esInacal:          boolean;
  idResponsable?:    number | null;
  responsable?:      string | null;
  cargoResponsable?: string | null;
  idCliente?:        number | null;
  razonSocial?:      string | null;
  ruc?:              string | null;
  contactoNombre?:   string | null;
  contactoCargo?:    string | null;
  contactoArea?:     string | null;
  contactoCorreo?:   string | null;
  contactoTelefono?: string | null;
  sedeNombre?:       string | null;
  sedeUbicacion?:    string | null;
  sedeDireccion?:    string | null;
}

export interface PropuestaGeneradaDto {
  idPropuesta:     number;
  numero:          string;
  version:         number;
  estado:          string;
  total?:          number | null;
  simboloMoneda?:  string | null;
  idResponsable?:  number | null;
  responsable?:    string | null;
  fechaCreacion?:  string | null;
  fechaEnvio?:     string | null;
  fechaAceptacion?: string | null;
  fechaRechazo?:   string | null;
  motivoRechazo?:  string | null;
}

export interface TabRqExpedienteDto {
  datos:       DatosRqExpedienteDto;
  adjuntos:    ArchivoTabDto[];
  timeline:    EventoTabDto[];
  propuestas:  PropuestaGeneradaDto[];
}

// Tab Propuestas
export interface VersionPropuestaExpedienteDto {
  idPropuesta:    number;
  numero:         string;
  version:        number;
  estado:         string;
  total?:         number | null;
  simboloMoneda?: string | null;
  fechaCreacion?: string | null;
  esUltima:       boolean;
  esActiva:       boolean;
  seleccionada:   boolean;
}

export interface DetallePropuestaExpedienteDto {
  idPropuesta:         number;
  numero:              string;
  version:             number;
  estado:              string;
  tipoPropuesta?:      string | null;
  referencia?:         string | null;
  idResponsable?:      number | null;
  responsable?:        string | null;
  moneda?:             string | null;
  simboloMoneda?:      string | null;
  subtotal?:           number | null;
  descuentoMonto?:     number | null;
  descuentoPct?:       number | null;
  aplicaIgv:           boolean;
  igvPct?:             number | null;
  igvMonto?:           number | null;
  total?:              number | null;
  condicionPago?:      string | null;
  plazoEntregaDias?:   number | null;
  vigenciaDias?:       number | null;
  fechaExpiracion?:    string | null;
  fechaCreacion?:      string | null;
  fechaEnvio?:         string | null;
  fechaAceptacion?:    string | null;
  descripcionCambios?: string | null;
  motivoNuevaVersion?: string | null;
  /** JSON string de secciones incluidas. */
  seccionesActivas?:   string | null;
  clavePdf:            string;
  nombrePdf?:          string | null;
  numeroRq?:           string | null;
}

export interface FormaPagoExpedienteDto {
  porcentaje?: number | null;
  condicion?:  string | null;
  orden:       number;
}

export interface ItemPropuestaExpedienteDto {
  idItem:         number;
  seccion:        string;
  descripcion?:   string | null;
  cantidad?:      number | null;
  precioUnitario?: number | null;
  descuento?:     number | null;
  subtotal?:      number | null;
  alcance?:       string | null;
  puntosCalibracion?: string | null;
  frecuencia?:    number | null;
}

export interface EquipoPropuestaExpedienteDto {
  idEquipo?:     number | null;
  tipo?:         string | null;
  subtipo?:      string | null;
  marca?:        string | null;
  modelo?:       string | null;
  numeroSerie?:  string | null;
  codigoCliente?: string | null;
  codigoTw?:     string | null;
  localSede?:    string | null;
}

export interface VistoBuenoVersionDto {
  idVb:            number;
  estado:          string;
  idAprobador?:    number | null;
  aprobador?:      string | null;
  cargoAprobador?: string | null;
  fechaSolicitud?: string | null;
  fechaRespuesta?: string | null;
  idResueltoPor?:  number | null;
  resueltoPor?:    string | null;
  comentario?:     string | null;
  motivoRechazo?:  string | null;
}

export interface TabPropuestasExpedienteDto {
  versiones:    VersionPropuestaExpedienteDto[];
  detalle?:     DetallePropuestaExpedienteDto | null;
  formasPago:   FormaPagoExpedienteDto[];
  items:        ItemPropuestaExpedienteDto[];
  equipos:      EquipoPropuestaExpedienteDto[];
  vistosBuenos: VistoBuenoVersionDto[];
  timeline:     EventoTabDto[];
}

// Pill reutilizable en VB / Seguimiento
export interface PropuestaPillDto {
  numero:       string;
  version:      number;
  seleccionada: boolean;
}

// Tab Visto Bueno
export interface EstadoVistoBuenoExpDto {
  numero?:             string | null;
  idPropuestaRevision?: number | null;
  versionRevision?:    number | null;
  estadoPropuesta?:    string | null;
  /** sin_solicitud, pendiente, aprobado, rechazado, devuelto… */
  estadoVb?:           string | null;
  idAprobador?:        number | null;
  aprobador?:          string | null;
  cargoAprobador?:     string | null;
  areaAprobador?:      string | null;
  correoAprobador?:    string | null;
  telefonoAprobador?:  string | null;
  idPropuestaAprobada?: number | null;
  versionAprobada?:    number | null;
  montoAprobado?:      number | null;
  simboloMoneda?:      string | null;
  fechaAprobacion?:    string | null;
  fechaSolicitud?:     string | null;
  slaHoras?:           number | null;
  horasHabiles?:       number | null;
  dentroSla?:          boolean | null;
  comentario?:         string | null;
}

export interface DecisionVbExpedienteDto {
  idVb:            number;
  idPropuesta:     number;
  version:         number;
  estado:          string;
  idAprobador?:    number | null;
  aprobador?:      string | null;
  cargoAprobador?: string | null;
  idRevisor?:      number | null;
  revisor?:        string | null;
  cargoRevisor?:   string | null;
  fechaSolicitud?: string | null;
  fechaRespuesta?: string | null;
  comentario?:     string | null;
  motivoRechazo?:  string | null;
  horasRevision?:  number | null;
  slaHoras?:       number | null;
}

export interface ReasignacionAprobadorDto {
  idVb:              number;
  version:           number;
  fecha?:            string | null;
  idAnterior?:       number | null;
  aprobadorAnterior?: string | null;
  idNuevo?:          number | null;
  aprobadorNuevo?:   string | null;
  motivo?:           string | null;
  comentario?:       string | null;
  ejecutadoPor?:     string | null;
}

export interface MetricasVistoBuenoDto {
  versionesTotales:     number;
  versionesDevueltas:   number;
  diasTotales?:         number | null;
  diasPromedioRevision?: number | null;
  decisionesEnSla:      number;
  decisiones:           number;
}

export interface TabVistoBuenoExpedienteDto {
  propuestas:     PropuestaPillDto[];
  estado?:        EstadoVistoBuenoExpDto | null;
  decisiones:     DecisionVbExpedienteDto[];
  reasignaciones: ReasignacionAprobadorDto[];
  metricas?:      MetricasVistoBuenoDto | null;
}

// Tab Seguimiento
export interface EstadoSeguimientoExpedienteDto {
  numero?:            string | null;
  idPropuesta?:       number | null;
  version?:           number | null;
  estadoPropuesta?:   string | null;
  /** sin_seguimiento, activo, cerrado_aceptacion o cerrado_rechazo. */
  estadoSeguimiento?: string | null;
  fechaEnvio?:        string | null;
  fechaCierre?:       string | null;
  diasSeguimiento?:   number | null;
  idComercial?:       number | null;
  comercial?:         string | null;
  cargoComercial?:    string | null;
  correoComercial?:   string | null;
  telefonoComercial?: string | null;
  contacto?:          string | null;
  cargoContacto?:     string | null;
  correoContacto?:    string | null;
  ultimaInteraccion?: string | null;
  totalInteracciones: number;
  slaHoras?:          number | null;
  slaCumplido?:       boolean | null;
}

export interface InteraccionSeguimientoDto {
  fecha?:              string | null;
  tipo:                string;
  titulo?:             string | null;
  canal?:              string | null;
  resultado?:          string | null;
  asunto?:             string | null;
  detalle?:            string | null;
  duracionMinutos?:    number | null;
  proximaAccionFecha?: string | null;
  proximaAccion?:      string | null;
  version?:            number | null;
  idUsuario?:          number | null;
  usuario?:            string | null;
  adjuntos:            ArchivoTabDto[];
}

export interface ResultadoSeguimientoDto {
  resultado:          string;
  fechaCierre?:       string | null;
  idRegistradoPor?:   number | null;
  registradoPor?:     string | null;
  tipoEvidencia?:     string | null;
  motivoRechazo?:     string | null;
  canal?:             string | null;
  comentario?:        string | null;
  montoComprometido?: number | null;
  simboloMoneda?:     string | null;
  diasHastaCierre?:   number | null;
  permiteReactivacion: boolean;
}

export interface TabSeguimientoExpedienteDto {
  propuestas:    PropuestaPillDto[];
  estado?:       EstadoSeguimientoExpedienteDto | null;
  interacciones: InteraccionSeguimientoDto[];
  resultado?:    ResultadoSeguimientoDto | null;
  evidencias:    ArchivoTabDto[];
}

// Tab OC
export interface OcPillExpedienteDto {
  idOc:           number;
  numeroOc:       string;
  estado:         string;
  esAutogenerada: boolean;
  vigente:        boolean;
  idPropuesta?:   number | null;
  propuesta?:     string | null;
  seleccionada:   boolean;
}

export interface DatosOcExpedienteDto {
  idOc:                   number;
  numeroOc:               string;
  estado:                 string;
  esAutogenerada:         boolean;
  referencia?:            string | null;
  fechaEmision?:          string | null;
  fechaRecepcion?:        string | null;
  fechaRegistro?:         string | null;
  vigenciaHasta?:         string | null;
  moneda?:                string | null;
  simboloMoneda?:         string | null;
  montoTotal?:            number | null;
  montoAsignado?:         number | null;
  saldo?:                 number | null;
  formaPago?:             string | null;
  igvIncluido:            boolean;
  igvPct?:                number | null;
  facturaIgualOc:         boolean;
  observaciones?:         string | null;
  clavePdf?:              string | null;
  nombreArchivoPdf?:      string | null;
  tamanoPdfBytes?:        number | null;
  reemplazadaPor?:        string | null;
  fechaReemplazo?:        string | null;
  fechaAnulacion?:        string | null;
  motivoAnulacion?:       string | null;
  justificacionAnulacion?: string | null;
  idResponsable?:         number | null;
  responsable?:           string | null;
  idRegistradoPor?:       number | null;
  registradoPor?:         string | null;
}

/** Validación de una vinculación OC ↔ propuesta. Confianza 0–100. */
export interface ValidacionOcExpedienteDto {
  idPropuesta:      number;
  propuesta:        string;
  estadoPropuesta?: string | null;
  deEsteExpediente: boolean;
  montoAsignado?:   number | null;
  porcentajeOc?:    number | null;
  estadoValidacion?: string | null;
  tipoObservacion?: string | null;
  resultadoIa?:     string | null;
  fechaDecision?:   string | null;
  corrida?:         number | null;
  coincidencias?:   number | null;
  advertencias?:    number | null;
  criticas?:        number | null;
  totalCampos?:     number | null;
  confianza?:       number | null;
  motor?:           string | null;
  dictamen?:        string | null;
  sugerencia?:      string | null;
  fechaValidacion?: string | null;
}

export interface CampoValidacionOcDto {
  orden?:         number | null;
  campo?:         string | null;
  etiqueta?:      string | null;
  valorOc?:       string | null;
  valorPropuesta?: string | null;
  severidad?:     string | null;
  mensaje?:       string | null;
}

export interface EventoOcExpedienteDto {
  fecha?:         string | null;
  accion?:        string | null;
  titulo?:        string | null;
  descripcion?:   string | null;
  estadoAnterior?: string | null;
  estadoNuevo?:   string | null;
  idUsuario?:     number | null;
  usuario?:       string | null;
  automaticoIa:   boolean;
}

export interface TabOrdenesCompraExpedienteDto {
  ordenesCompra: OcPillExpedienteDto[];
  datos?:        DatosOcExpedienteDto | null;
  validaciones:  ValidacionOcExpedienteDto[];
  campos:        CampoValidacionOcDto[];
  timeline:      EventoOcExpedienteDto[];
}

// Tab OS
export interface OsPillExpedienteDto {
  idOs:            number;
  numero:          string;
  estado:          string;
  fechaEjecucion?: string | null;
  seleccionada:    boolean;
}

export interface DatosOsExpedienteDto {
  idOs:                   number;
  numero:                 string;
  estado:                 string;
  fechaCreacion?:         string | null;
  fechaEjecucion?:        string | null;
  horaInicio?:            string | null;
  horaFinEstimada?:       string | null;
  horaLlegadaReal?:       string | null;
  horaFinReal?:           string | null;
  costoTotalEstimado?:    number | null;
  tipoServicio?:          string | null;
  sede?:                  string | null;
  sedeDireccion?:         string | null;
  idTecnicoPrincipal?:    number | null;
  tecnicoPrincipal?:      string | null;
  idResponsableComercial?: number | null;
  responsableComercial?:  string | null;
  confirmacionCliente:    boolean;
  fechaConfirmacion?:     string | null;
  canalConfirmacion?:     string | null;
  contactoConfirma?:      string | null;
  notasOperativas?:       string | null;
  generadoPor?:           string | null;
}

export interface PersonalOsDto {
  idUsuario:      number;
  nombre?:        string | null;
  cargo?:         string | null;
  rolEnServicio?: string | null;
  estadoSsoma?:   string | null;
}

export interface EquipoOsDto {
  idEquipo:         number;
  codigoTw?:        string | null;
  codigoCliente?:   string | null;
  marca?:           string | null;
  modelo?:          string | null;
  numeroSerie?:     string | null;
  ubicacion?:       string | null;
  tipoIntervencion?: string | null;
  ingresadoEnCampo: boolean;
}

export interface GastoOsDto {
  idGasto:        number;
  tipo?:          string | null;
  concepto?:      string | null;
  monto?:         number | null;
  simboloMoneda?: string | null;
  descripcion?:   string | null;
  estado?:        string | null;
  fechaSolicitud?: string | null;
  usuario?:       string | null;
}

export interface OrdenMetrologiaExpedienteDto {
  idOm:                    number;
  numero:                  string;
  estado?:                 string | null;
  fechaCalibracion?:       string | null;
  numeroCertificado?:      string | null;
  fechaEmisionCertificado?: string | null;
  metrologo?:              string | null;
}

export interface TabOrdenServicioExpedienteDto {
  ordenesServicio:   OsPillExpedienteDto[];
  datos?:            DatosOsExpedienteDto | null;
  personal:          PersonalOsDto[];
  equipos:           EquipoOsDto[];
  gastos:            GastoOsDto[];
  ordenesMetrologia: OrdenMetrologiaExpedienteDto[];
}

// Tab Programación
export interface CalendarioOsDto {
  idOs:              number;
  numero:            string;
  estado:            string;
  fechaEjecucion?:   string | null;
  horaInicio?:       string | null;
  horaFinEstimada?:  string | null;
  idTecnicoPrincipal?: number | null;
  tecnicoPrincipal?: string | null;
  sede?:             string | null;
  confirmacionCliente: boolean;
  fechaConfirmacion?: string | null;
}

export interface RecursoReservadoDto {
  os?:         string | null;
  tipoRecurso: string;
  recurso?:    string | null;
  detalle?:    string | null;
  estado?:     string | null;
}

export interface BacklogProgramacionDto {
  idBacklog:       number;
  os?:             string | null;
  om?:             string | null;
  prioridad?:      string | null;
  tecnicoSugerido?: string | null;
  fechaLimite?:    string | null;
  estado?:         string | null;
  notas?:          string | null;
  creado?:         string | null;
  modificado?:     string | null;
}

export interface PresalidaDto {
  os?:           string | null;
  descripcion?:  string | null;
  confirmado:    boolean;
  confirmadoEn?: string | null;
  confirmadoPor?: string | null;
}

export interface TabProgramacionExpedienteDto {
  calendario: CalendarioOsDto[];
  recursos:   RecursoReservadoDto[];
  backlog:    BacklogProgramacionDto[];
  presalida:  PresalidaDto[];
}

// Tab SSOMA
export interface ResumenSsomaDto {
  personal:     number;
  habilitados:  number;
  pendientes:   number;
  bloqueados:   number;
  observados:   number;
  vencidos:     number;
  estadoGlobal: string;
}

export interface ChecklistSsomaDto {
  os?:              string | null;
  idUsuario:        number;
  tecnico?:         string | null;
  rolEnServicio?:   string | null;
  estadoSsoma?:     string | null;
  idRequisito?:     number | null;
  requisito?:       string | null;
  estadoDocumento?: string | null;
  fechaVencimiento?: string | null;
}

export interface DocumentoSsomaDto {
  clave:            string;
  os?:              string | null;
  tecnico?:         string | null;
  tipo?:            string | null;
  nombreArchivo?:   string | null;
  estado?:          string | null;
  version:          number;
  fechaCarga?:      string | null;
  fechaVencimiento?: string | null;
  motivoObservacion?: string | null;
  aprobadoPor?:     string | null;
}

export interface RequisitoSsomaExpedienteDto {
  idRequisito:    number;
  requisito?:     string | null;
  esObligatorio:  boolean;
  bloqueaServicio: boolean;
  sede?:          string | null;
}

export interface TabSsomaExpedienteDto {
  resumen?:          ResumenSsomaDto | null;
  checklist:         ChecklistSsomaDto[];
  documentos:        DocumentoSsomaDto[];
  requisitosCliente: RequisitoSsomaExpedienteDto[];
}

// Tab Ejecución
export interface ResumenEjecucionOsDto {
  idOs:            number;
  numero:          string;
  estado:          string;
  fechaEjecucion?: string | null;
  horaInicio?:     string | null;
  horaLlegadaReal?: string | null;
  horaFinReal?:    string | null;
  latitud?:        number | null;
  longitud?:       number | null;
  tecnicoPrincipal?: string | null;
}

export interface EventoCampoDto {
  idEvento:     number;
  os?:          string | null;
  fecha?:       string | null;
  idTipoEvento: number;
  tipoEvento?:  string | null;
  latitud?:     number | null;
  longitud?:    number | null;
  notas?:       string | null;
  sincronizado: boolean;
  usuario?:     string | null;
}

export interface EvidenciaEjecucionDto {
  clave:            string;
  os?:              string | null;
  tipoEvidencia?:   string | null;
  nombreArchivo?:   string | null;
  fecha?:           string | null;
  latitud?:         number | null;
  longitud?:        number | null;
  validacionIa?:    string | null;
  overrideAprobado: boolean;
  usuario?:         string | null;
}

export interface IncidenciaExpedienteDto {
  idIncidencia:  number;
  os?:           string | null;
  tipo?:         string | null;
  descripcion?:  string | null;
  nivelAlerta?:  string | null;
  estado?:       string | null;
  fechaRegistro?: string | null;
  usuario?:      string | null;
}

export interface DemoraExpedienteDto {
  idDemora:        number;
  os?:             string | null;
  motivo?:         string | null;
  descripcion?:    string | null;
  duracionMinutos?: number | null;
  fechaRegistro?:  string | null;
  usuario?:        string | null;
}

export interface TabEjecucionExpedienteDto {
  ordenesServicio: ResumenEjecucionOsDto[];
  eventosCampo:    EventoCampoDto[];
  evidencias:      EvidenciaEjecucionDto[];
  incidencias:     IncidenciaExpedienteDto[];
  demoras:         DemoraExpedienteDto[];
}

// Tab Cierre
export interface ResumenCierreDto {
  estadoCierre:     string;
  fechaCierre?:     string | null;
  informes:         number;
  informesAprobados: number;
  conformes:        number;
  observadas:       number;
}

export interface InformeTecnicoExpedienteDto {
  idInforme:            number;
  numero:               string;
  os?:                  string | null;
  version:              number;
  estado:               string;
  diagnosticoPrincipal?: string | null;
  hallazgos?:           string | null;
  fechaCreacion?:       string | null;
  fechaEnvioCliente?:   string | null;
  clavePdf?:            string | null;
  tecnico?:             string | null;
  revisor?:             string | null;
}

export interface ConformidadExpedienteDto {
  idConformidad:  number;
  informe?:       string | null;
  os?:            string | null;
  tipo?:          string | null;
  estado?:        string | null;
  observaciones?: string | null;
  registradoEn?:  string | null;
  contacto?:      string | null;
  cargoContacto?: string | null;
}

export interface CertificadoExpedienteDto {
  clave?:           string | null;
  numero:           string;
  numeroCertificado?: string | null;
  fechaEmision?:    string | null;
  estado?:          string | null;
}

export interface TabCierreExpedienteDto {
  resumen?:       ResumenCierreDto | null;
  informes:       InformeTecnicoExpedienteDto[];
  conformidades:  ConformidadExpedienteDto[];
  certificados:   CertificadoExpedienteDto[];
}

// ─── HU-31 Repositorio de documentos ─────────────────────────────────────────

export interface FiltrosDocumentosExpedienteDto {
  /** todos (defecto), comerciales, operativos, ssoma o tecnicos. */
  categoria?: string;
  busqueda?:  string;
  desde?:     string;
  hasta?:     string;
  estado?:    string;
  /** PDF, XLSX, DOCX, EML, JPG, PNG u OTRO. */
  formato?:   string;
  /** desc (defecto, más recientes primero) o asc. */
  orden?:     string;
}

export interface PestanaDocumentosDto {
  codigo:   string;
  nombre:   string;
  cantidad: number;
}

export interface DocumentoExpedienteDto {
  clave:          string;
  nombre:         string;
  nombreArchivo?: string | null;
  tipo?:          string | null;
  categoria:      string;
  /** Módulo + etapa consolidados, ej. "Propuesta — VB". */
  origen?:        string | null;
  modulo?:        string | null;
  etapaOrigen?:   string | null;
  etapa?:         string | null;
  etapaNombre?:   string | null;
  version:        number;
  estado:         string;
  fecha?:         string | null;
  idUsuario?:     number | null;
  usuario?:       string | null;
  cargoUsuario?:  string | null;
  areaUsuario?:   string | null;
  tamanoBytes?:   number | null;
  tipoContenido?: string | null;
  formato?:       string | null;
  descripcion?:   string | null;
  visibilidad?:   string | null;
  esInterno:      boolean;
  descargable:    boolean;
  previsualizable: boolean;
}

export interface DocumentosExpedienteDto {
  idExpediente:    number;
  numero:          string;
  razonSocial?:    string | null;
  ruc?:            string | null;
  totalDocumentos: number;
  pestanas:        PestanaDocumentosDto[];
  documentos:      DocumentoExpedienteDto[];
  estados:         OpcionExpedienteDto[];
  formatos:        OpcionExpedienteDto[];
}

// ─── HU-32 Historial de auditoría ────────────────────────────────────────────

export interface FiltrosHistorialExpedienteDto {
  busqueda?:  string;
  idUsuario?: number;
  etapa?:     string;
  tipoEvento?: string;
  desde?:     string;
  hasta?:     string;
}

export interface UsuarioFiltroDto {
  idUsuario: number;
  nombre:    string;
}

export interface TabAuditoriaDto {
  codigo:   string;
  nombre:   string;
  cantidad: number;
}

export interface ReasignacionHistorialDto {
  idReasignacion?: number | null;
  fecha?:          string | null;
  modo?:           string | null;
  alcance?:        string | null;
  entidades?:      string | null;
  idDe?:           number | null;
  de?:             string | null;
  idA?:            number | null;
  a?:              string | null;
  motivo?:         string | null;
  comentario?:     string | null;
  gestionSla?:     string | null;
  decisionSla?:    string | null;
  idEjecutadoPor?: number | null;
  ejecutadoPor?:   string | null;
  etapa?:          string | null;
}

export interface BloqueoHistorialDto {
  clave:           string;
  fecha?:          string | null;
  clase:           string;
  tipo?:           string | null;
  tipoNombre?:     string | null;
  etapa?:          string | null;
  etapaNombre?:    string | null;
  entidadTipo?:    string | null;
  entidad?:        string | null;
  motivo?:         string | null;
  impacto?:        string | null;
  fechaResolucion?: string | null;
  resolucion?:     string | null;
  activo:          boolean;
  duracionHoras?:  number | null;
  idUsuario?:      number | null;
  usuario?:        string | null;
  origen?:         string | null;
}

/** Alerta de SLA. Nivel: advertencia (50 %), riesgo (ventana de alerta) o vencido. */
export interface AlertaSlaHistorialDto {
  fecha?:         string | null;
  etapa:          string;
  etapaNombre?:   string | null;
  nivel:          string;
  slaHoras?:      number | null;
  horasReales?:   number | null;
  desvioHoras?:   number | null;
  idResponsable?: number | null;
  responsable?:   string | null;
  accionTomada?:  string | null;
}

export interface HistorialExpedienteDto {
  idExpediente:    number;
  numero:          string;
  razonSocial?:    string | null;
  ruc?:            string | null;
  idResponsable?:  number | null;
  responsable?:    string | null;
  tabs:            TabAuditoriaDto[];
  timeline:        EventoExpedienteDto[];
  reasignaciones:  ReasignacionHistorialDto[];
  bloqueos:        BloqueoHistorialDto[];
  alertasSla:      AlertaSlaHistorialDto[];
  tiposEvento:     OpcionExpedienteDto[];
  usuarios:        UsuarioFiltroDto[];
  etapas:          OpcionExpedienteDto[];
}

// ─── HU-33 Reasignación ──────────────────────────────────────────────────────

export interface DatosReasignacionExpedienteDto {
  idExpediente:    number;
  numero:          string;
  razonSocial?:    string | null;
  ruc?:            string | null;
  etapa:           string;
  etapaNombre?:    string | null;
  idResponsable?:  number | null;
  responsable?:    string | null;
  cargoResponsable?: string | null;
  areaResponsable?: string | null;
  sla:             SlaExpedienteDto;
  notaImpacto:     string;
}

export interface PreparacionReasignacionExpedienteDto {
  datos:        DatosReasignacionExpedienteDto;
  entidades:    EntidadExpedienteDto[];
  motivos:      OpcionIdExpedienteDto[];
  gestionesSla: OpcionExpedienteDto[];
}

export interface ResumenCarteraComercialDto {
  idResponsable:    number;
  responsable?:     string | null;
  cargoResponsable?: string | null;
  areaResponsable?: string | null;
  totalEntidades:   number;
  expedientes:      number;
  requerimientos:   number;
  propuestas:       number;
  ordenesCompra:    number;
  ordenesServicio:  number;
}

export interface EntidadCarteraDto {
  idExpediente: number;
  entidadTipo:  string;
  idEntidad:    number;
  codigo?:      string | null;
  estado?:      string | null;
  detalle?:     string | null;
}

export interface ExpedienteCarteraDto {
  idExpediente:        number;
  numero:              string;
  cliente?:            string | null;
  etapa:               string;
  etapaNombre?:        string | null;
  slaEstado?:          string | null;
  slaMinutosRestantes?: number | null;
  fechaLimite?:        string | null;
  entidades:           number;
  detalle:             EntidadCarteraDto[];
}

export interface CarteraComercialExpedienteDto {
  resumen:     ResumenCarteraComercialDto;
  expedientes: ExpedienteCarteraDto[];
}

export interface CandidatoResponsableDto {
  idUsuario:     number;
  nombre:        string;
  correo?:       string | null;
  cargo?:        string | null;
  area?:         string | null;
  areaNombre?:   string | null;
  rol?:          string | null;
  sedeOperativa?: string | null;
}

export interface ReasignarResponsableExpedienteDto {
  /** entidad (Opción A), cascada (Opción B) o global (Opción C). */
  modo?:              string;
  /** requerimiento | propuesta | orden_compra | orden_servicio. Para A y B. */
  entidadTipo?:       string;
  idEntidad?:         number;
  /** Para B personalizada: claves de las entidades desmarcadas (ej. "oc-12"). */
  excluidos?:         string[];
  /** Para C: comercial cuya cartera se reasigna. */
  idResponsableActual?: number;
  idNuevoResponsable?: number;
  idMotivo?:          number;
  /** Obligatorio, mínimo 20 caracteres. */
  comentario?:        string;
  /** mantener | reiniciar */
  gestionSla?:        string;
}

export interface EntidadReasignadaDto {
  idExpediente:         number;
  numeroExpediente:     string;
  cliente?:             string | null;
  entidadTipo:          string;
  idEntidad:            number;
  codigo?:              string | null;
  idResponsableAnterior?: number | null;
  responsableAnterior?: string | null;
}

export interface ResponsableAnteriorDto {
  idUsuario: number;
  nombre:    string;
  correo?:   string | null;
  cantidad:  number;
  codigos?:  string | null;
}

export interface ReasignacionExpedienteDto {
  idReasignacion:         number;
  modo:                   string;
  alcance?:               string | null;
  totalEntidades:         number;
  totalExpedientes:       number;
  idExpediente:           number;
  numeroExpediente?:      string | null;
  idResponsable:          number;
  responsable:            string;
  correoResponsable?:     string | null;
  motivo?:                string | null;
  comentario?:            string | null;
  gestionSla?:            string | null;
  reasignadoPor?:         string | null;
  entidades:              EntidadReasignadaDto[];
  responsablesAnteriores: ResponsableAnteriorDto[];
  correosEnviados:        number;
  correosConError:        string[];
}

// ─── Comparar versiones de propuesta ─────────────────────────────────────────

export interface ComparacionVersionesExpedienteDto {
  // El contrato no está documentado explícitamente en el DTO; se completará al tocar el componente
  // que lo use. Dejo el type como placeholder hasta ver el endpoint en acción.
  [k: string]: unknown;
}
