// ═════════════════════════════════════════════════════════════════════════════
// MÓDULO 6 — Órdenes de Compra (Sprint 4, refinamiento HU-22 a HU-28)
// Alineado 1:1 con OrdenCompraDtos.cs del back.
//
// Estados de la OC:    autogenerada | validada | validada_parcial | observada | pendiente_reemplazo | anulada
// Estado vinculación:  pendiente | validada | observada
// Resultado IA:        ok | advertencia | critico
// Decisión al guardar: validar | observar | correccion_cliente | nueva_version
//
// Reemplazo: una OC autogenerada o pendiente_reemplazo se reemplaza por la OC real
// del cliente. La reemplazada queda marcada con reemplazadaPor y se oculta de la
// bandeja salvo con incluirReemplazadas=true (auditoría).
// ═════════════════════════════════════════════════════════════════════════════

/** Estados posibles de la OC. */
export type OrdenCompraEstado =
  | 'autogenerada'
  | 'validada'
  | 'validada_parcial'
  | 'observada'
  | 'pendiente_reemplazo'
  | 'anulada';

export interface OpcionFiltro {
  id:     number;
  nombre: string;
  codigo?: string | null;
}

// ─── Datos de la ficha (los lee la IA del PDF; el comercial puede corregirlos) ──

export interface ConceptoOrdenCompraDto {
  descripcion:    string;
  cantidad?:      number | null;
  precioUnitario?: number | null;
  subtotal?:      number | null;
}

export interface CampoCorregidoDto {
  campo:      string;
  valorIa?:   string | null;
  valorNuevo?: string | null;
}

export interface DatosOrdenCompraDto {
  numeroOc?:        string | null;
  fechaEmision?:    string | null;
  /** Fecha en que llegó la OC (siempre editable, no la lee la IA). */
  fechaRecepcion?:  string | null;
  idMoneda?:        number | null;
  montoTotal?:      number | null;
  /** Num1 del catálogo CONDICION_PAGO (39). */
  idCondicionPago?: number | null;
  formaPago?:       string | null;
  igvIncluido?:     boolean | null;
  igvPct?:          number | null;
  descuento?:       number | null;
  /** Tipo de cambio aplicable cuando la OC cubre propuestas de distinta moneda que la OC (ticket E). */
  tipoCambio?:      number | null;
  ruc?:             string | null;
  razonSocial?:     string | null;
  numeroPropuesta?: string | null;
  vigenciaHasta?:   string | null;
  referencia?:      string | null;
  observaciones?:   string | null;
  /** "¿La factura tendrá lo mismo que la OC?" (marcado por defecto). */
  facturaIgualOc:   boolean;
  conceptos:        ConceptoOrdenCompraDto[];
  /** Valores que leyó la IA (campo → valor). Los campos presentes se muestran bloqueados con el ícono IA. */
  camposIa?:        Record<string, string | null>;
  /** Campos que el comercial corrigió a mano (valor original IA y valor nuevo). */
  camposManuales:   CampoCorregidoDto[];
}

export interface VinculacionOrdenCompraDto {
  idPropuesta:   number;
  montoAsignado: number;
}

// ─── Evaluación IA (la arma el back con Gemini; no la envía la pantalla) ──

export interface ConceptoEvaluadoDto {
  descripcion:     string;
  montoOc?:        number | null;
  montoPropuesta?: number | null;
  /** coincide · falta_en_oc · adicional_en_oc · monto_distinto */
  estado:          string;
  /** Otras propuestas vinculadas que tienen el mismo ítem (descripción normalizada), en multi-propuesta (ticket C). */
  compartidoConPropuestas?: number[];
}

export interface InsightIaDto {
  campo?:      string | null;
  titulo:      string;
  explicacion: string;
  accion?:     string | null;
  recomendado: boolean;
}

export interface EvaluacionIaPropuestaDto {
  idPropuesta: number;
  conceptos:   ConceptoEvaluadoDto[];
  dictamen?:   string | null;
  insights:    InsightIaDto[];
  confianza?:  number | null;
  motor?:      string | null;
}

// ─── Solicitudes ──

export interface CompararOrdenCompraSolicitudDto {
  idOc?:         number | null;
  idPropuesta?:  number | null;
  idOcReemplaza?: number | null;
  datos:         DatosOrdenCompraDto;
  vinculaciones: VinculacionOrdenCompraDto[];
  /** validar | observar | correccion_cliente | nueva_version */
  decision?:     string | null;
}

export interface RegistrarOrdenCompraSolicitudDto {
  idOcReemplaza?: number | null;
  datos:          DatosOrdenCompraDto;
  vinculaciones:  VinculacionOrdenCompraDto[];
  decision?:      string | null;
}

export interface EditarOrdenCompraSolicitudDto {
  datos:         DatosOrdenCompraDto;
  vinculaciones: VinculacionOrdenCompraDto[];
  decision?:     string | null;
  /** reemplazo | oc_corregida */
  tipoPdf?:      string | null;
  motivoPdf?:    string | null;
}

export interface RevalidarOrdenCompraSolicitudDto {
  /** null = todas las propuestas vinculadas. */
  idPropuesta?: number | null;
}

export interface AnularOrdenCompraSolicitudDto {
  idMotivo?:       number | null;
  justificacion?:  string | null;
  confirmaImpacto: boolean;
}

export interface FiltrosBandejaOrdenesCompraDto {
  /** todas | autogenerada | validada | validada_parcial | observada | pendiente_reemplazo | anulada | sin_asignar */
  estado?:        string;
  /** true = incluye OC ya reemplazadas por la OC del cliente (auditoría). */
  incluirReemplazadas?: boolean;
  idCliente?:     number;
  idResponsable?: number;
  idPropuesta?:   number;
  fechaDesde?:    string;
  fechaHasta?:    string;
  busqueda?:      string;
  pagina?:        number;
  porPagina?:     number;
}

// ─── Catálogos y propuestas ──

export interface MonedaOrdenCompraDto {
  id:      number;
  nombre:  string;
  simbolo?: string | null;
  codigo?:  string | null;
}

export interface CondicionPagoDto {
  id:      number;
  nombre:  string;
  codigo?: string | null;
}

export interface PropuestaDisponibleOcDto {
  idPropuesta:    number;
  numero:         string;
  version:        number;
  idCliente?:     number | null;
  razonSocial?:   string | null;
  ruc?:           string | null;
  idRequerimiento?: number | null;
  numeroRq?:      string | null;
  idContacto?:    number | null;
  contacto?:      string | null;
  total:          number;
  saldo:          number;
  idMoneda:       number;
  moneda?:        string | null;
  monedaSimbolo?: string | null;
  fechaAceptacion?: string | null;
  responsable?:   string | null;
  tipoServicio?:  string | null;
  tieneOc:        boolean;
  /** OC-AUTO vigente de la propuesta (ticket A/B): si existe se reemplaza al registrar la OC real. */
  idOcAutogenerada?:    number | null;
  numeroOcAutogenerada?: string | null;
  /** Cantidad de ítems (servicios) de la propuesta — columna SERVICIOS. */
  items?:         number;
}

export interface PropuestaOrigenOcDto {
  idPropuesta:    number;
  numero:         string;
  version:        number;
  idCliente:      number;
  razonSocial:    string;
  ruc?:           string | null;
  idRequerimiento?: number | null;
  numeroRq?:      string | null;
  idContacto?:    number | null;
  contacto?:      string | null;
  cargoContacto?: string | null;
  total:          number;
  saldo:          number;
  idMoneda:       number;
  moneda?:        string | null;
  monedaSimbolo?: string | null;
  idCondicionPago?: number | null;
  condicionPago?: string | null;
  aplicaIgv:      boolean;
  igvPct?:        number | null;
  fechaExpiracion?: string | null;
  fechaAceptacion?: string | null;
  idResponsable?: number | null;
  responsable?:   string | null;
  tipoServicio?:  string | null;
  items:          number;
  fechaServidor?: string | null;
}

export interface OcAReemplazarDto {
  idOc:           number;
  numeroOc:       string;
  montoTotal:     number;
  fechaRegistro?: string | null;
  esAutogenerada: boolean;
  /** autogenerada | pendiente_reemplazo */
  estado:         string;
}

export interface PreparacionOrdenCompraDto {
  propuesta:              PropuestaOrigenOcDto;
  ocAReemplazar?:         OcAReemplazarDto | null;
  otrasPropuestas:        PropuestaDisponibleOcDto[];
  monedas:                MonedaOrdenCompraDto[];
  condicionesPago:        CondicionPagoDto[];
  extraccionIaDisponible: boolean;
}

export interface VinculacionEdicionOcDto {
  idPropuesta:              number;
  numero:                   string;
  version:                  number;
  total:                    number;
  saldo:                    number;
  idMoneda:                 number;
  montoAsignado:            number;
  estadoValidacion:         string;
  tipoObservacion?:         string | null;
  resultadoIa?:             string | null;
  idContacto?:              number | null;
  contacto?:                string | null;
  idRequerimiento?:         number | null;
  numeroRq?:                string | null;
  idPropuestaNuevaVersion?: number | null;
  numeroNuevaVersion?:      string | null;
  versionNuevaVersion?:     number | null;
  estadoNuevaVersion?:      string | null;
  nuevaVersionAceptada:     boolean;
  /** Ticket E: montoAsignado convertido a la moneda de la propuesta (null = misma moneda que la OC). */
  montoCubierto?:          number | null;
}

export interface OrdenCompraEdicionDto {
  idOc:                number;
  numeroOc:            string;
  estado:              string;
  idCliente:           number;
  razonSocial:         string;
  ruc?:                string | null;
  idPropuesta?:        number | null;
  datos:               DatosOrdenCompraDto;
  nombreArchivoPdf?:   string | null;
  tamanoPdfBytes?:     number | null;
  tienePdf:            boolean;
  urlPdf?:             string | null;
  pendienteCorreccion: boolean;
  fechaRegistro?:      string | null;
}

export interface PreparacionEdicionOrdenCompraDto {
  oc:                     OrdenCompraEdicionDto;
  vinculaciones:          VinculacionEdicionOcDto[];
  otrasPropuestas:        PropuestaDisponibleOcDto[];
  monedas:                MonedaOrdenCompraDto[];
  condicionesPago:        CondicionPagoDto[];
  extraccionIaDisponible: boolean;
}

// ─── Extracción con IA ──

export interface ExtraccionOrdenCompraDto {
  datos:        DatosOrdenCompraDto;
  monedaLeida?: string | null;
  confianza?:   number | null;
  motor:        string;
  advertencias: string[];
}

// ─── Comparación / validación ──

export interface ResumenComparacionOcDto {
  resultado:                string;
  sugerencia:               string;
  criticas:                 number;
  advertencias:             number;
  puedeValidar:             boolean;
  puedeObservar:            boolean;
  puedeSolicitarCorreccion: boolean;
  puedeNuevaVersion:        boolean;
}

/** Hito de pago de la propuesta (ticket D). DiasCredito: 0 al contado, N en CREDITO_N, null en otras condiciones. */
export interface HitoPagoPropuestaDto {
  porcentaje:   number;
  condicion:    string;
  diasCredito?: number | null;
  codigo?:      string | null;
}

export interface ComparacionPropuestaOcDto {
  orden:         number;
  idPropuesta:   number;
  numero:        string;
  montoAsignado: number;
  resultado:     string;
  coincidencias: number;
  advertencias:  number;
  criticas:      number;
  totalCampos:   number;
  sugerencia:    string;
  /** Ticket E: montoAsignado convertido a la moneda de la propuesta con el TC. null = misma moneda o falta TC. */
  montoCubierto?: number | null;
  idMoneda?:      number;
  moneda?:        string | null;
  monedaSimbolo?: string | null;
  /** Ticket D: hitos de pago de la propuesta (comparar contra la condición de pago de la OC). */
  hitosPago?:    HitoPagoPropuestaDto[];
}

/**
 * Ticket C — Pool consolidado de ítems para el tab Resumen de validación multi-propuesta.
 * Severidad: ok (está en la OC y coincide) · advertencia (falta, adicional o cantidad distinta).
 */
export interface ItemConsolidadoOcDto {
  descripcionNormalizada: string;
  descripcion:            string;
  /** Precio unitario (parte de la clave de identidad descripción + precio + alcance). */
  precioUnitario?:        number | null;
  /** Alcance del ítem (ej. "200kg", "100kg"). Parte de la clave de identidad. */
  alcance?:               string | null;
  /** IDs de propuestas vinculadas donde aparece este ítem. */
  enPropuestas:   number[];
  cantidadTotal:  number;
  enOc:           boolean;
  cantidadOc?:    number | null;
  severidad:      string;
  mensaje?:       string | null;
  /** Precio unitario que trae la OC para este ítem (puede diferir del del pool). */
  precioUnitarioOc?: number | null;
  /** Cuánto aporta cada propuesta al pool: "15 unidades: 10 de PROP-A, 5 de PROP-B". */
  aportesPorPropuesta?: ItemAporteOcDto[];
  /** true = ítem de la sección Opcionales de la propuesta (validación suave/informativa). */
  esOpcional:     boolean;
  /** Estado detallado:
   *  Obligatorios: ok · faltan_unidades · sobran_unidades · falta_en_oc · adicional_en_oc.
   *  Opcionales:   confirmado_opcional · parcial_opcional · no_solicitado. */
  estado:         string;
  /** false en los opcionales: no suman advertencias ni cambian el resultado global. */
  cuentaParaResultadoGlobal: boolean;
}

/** Aporte de una propuesta vinculada al pool consolidado. */
export interface ItemAporteOcDto {
  idPropuesta:     number;
  numero:          string;
  cantidad:        number;
  precioUnitario?: number | null;
}

/** Fila de la comparación campo por campo. Severidad: ok · advertencia · critico · sin_dato. */
export interface CampoComparadoOcDto {
  idPropuesta:    number;
  orden:          number;
  campo:          string;
  etiqueta:       string;
  valorOc?:       string | null;
  valorPropuesta?: string | null;
  severidad:      string;
  mensaje?:       string | null;
  accion?:        string | null;
}

export interface ComparacionOrdenCompraDto {
  resumen:         ResumenComparacionOcDto;
  propuestas:      ComparacionPropuestaOcDto[];
  campos:          CampoComparadoOcDto[];
  evaluacionesIa:  EvaluacionIaPropuestaDto[];
  /** Ticket C: pool consolidado de ítems de todas las propuestas vinculadas vs los conceptos de la OC. */
  itemsConsolidados?: ItemConsolidadoOcDto[];
}

// ─── Resultado de registrar / editar / reemplazar PDF ──

/** OC que fue reemplazada al registrar (ticket B: OC-AUTO automáticas + la indicada por idOcReemplaza). */
export interface OcReemplazadaDto {
  idOc:     number;
  numeroOc: string;
  estado:   string;
}

export interface OrdenCompraGuardadaDto {
  idOc:                number;
  numeroOc:            string;
  estado:              string;
  montoTotal:          number;
  idOcReemplazada?:    number | null;
  numeroOcReemplazada?: string | null;
  notificados:         number;
  /** Ticket B: todas las OC que se reemplazaron (OC-AUTO automáticas + la indicada por idOcReemplaza). */
  ocsReemplazadas?: OcReemplazadaDto[];
  /** Ticket E: TC aplicado al registrar (si cubrió propuestas de otra moneda). */
  tipoCambio?: number | null;
}

export interface VinculacionGuardadaOcDto {
  idPropuesta:              number;
  numero:                   string;
  version:                  number;
  montoAsignado:            number;
  estadoValidacion:         string;
  tipoObservacion?:         string | null;
  resultadoIa?:             string | null;
  idPropuestaNuevaVersion?: number | null;
  sugerencia?:              string | null;
  coincidencias?:           number | null;
  advertencias?:            number | null;
  criticas?:                number | null;
}

export interface NuevaVersionGeneradaOcDto {
  idPropuesta:       number;
  idPropuestaNueva?: number | null;
  numero?:           string | null;
  version?:          number | null;
  error?:            string | null;
}

export interface ResultadoGuardarOrdenCompraDto {
  oc:              OrdenCompraGuardadaDto;
  vinculaciones:   VinculacionGuardadaOcDto[];
  nuevasVersiones: NuevaVersionGeneradaOcDto[];
  avisoIa?:        string | null;
}

export interface OcAutogeneradaDto {
  idOc:       number;
  numeroOc:   string;
  estado:     string;
  montoTotal: number;
  idMoneda:   number;
}

export interface RevalidacionOrdenCompraDto {
  idValidacion:    number;
  idPropuesta:     number;
  numero:          string;
  corrida:         number;
  resultado:       string;
  coincidencias:   number;
  advertencias:    number;
  criticas:        number;
  totalCampos:     number;
  sugerencia?:     string | null;
  fechaValidacion?: string | null;
}

// ─── Bandeja ──

export interface TarjetasOrdenesCompraDto {
  total:                   number;
  registradasMes:          number;
  validadas:               number;
  validadasParcial:        number;
  observadas:              number;
  parcialUObservadas:      number;
  autogeneradasPendientes: number;
  /** OC marcadas por el comercial como "pendiente_reemplazo" esperando la OC corregida del cliente. */
  pendientesReemplazo:     number;
  sinAsignar:              number;
  anuladas:                number;
}

export interface MontoMonedaDto {
  idMoneda:       number;
  moneda?:        string | null;
  monedaSimbolo?: string | null;
  monto:          number;
}

export interface ItemBandejaOrdenCompraDto {
  idOc:                   number;
  numeroOc:               string;
  esAutogenerada:         boolean;
  reemplazadaPor?:        number | null;
  numeroOcReemplazo?:     string | null;
  fechaOc?:               string | null;
  fechaRecepcion?:        string | null;
  fechaRegistro?:         string | null;
  idCliente:              number;
  razonSocial:            string;
  ruc?:                   string | null;
  idRequerimiento?:       number | null;
  numeroRq?:              string | null;
  idPropuesta?:           number | null;
  numeroPropuesta?:       string | null;
  versionPropuesta?:      number | null;
  propuestasVinculadas:   number;
  propuestasAdicionales:  number;
  idMoneda:               number;
  moneda?:                string | null;
  monedaSimbolo?:         string | null;
  montoOc:                number;
  montoAsignado:          number;
  saldoOc:                number;
  asignadoPct:            number;
  estado:                 string;
  estadoVisual:           string;
  resultadoIa?:           string | null;
  alertasIa:              number;
  idResponsable?:         number | null;
  responsable?:           string | null;
  tienePdf:               boolean;
  urlPdf?:                string | null;
  puedeAnular:            boolean;
  /** Se puede registrar la OC del cliente que la reemplaza (autogenerada o pendiente_reemplazo). */
  puedeReemplazar:        boolean;
}

export interface BandejaOrdenesCompraDto {
  tarjetas:         TarjetasOrdenesCompraDto;
  montoValidadoMes: MontoMonedaDto[];
  items:            ItemBandejaOrdenCompraDto[];
  total:            number;
  pagina:           number;
  porPagina:        number;
  clientes:         OpcionFiltro[];
  responsables:     OpcionFiltro[];
}

// ─── Detalle (HU-25) ──

export interface CabeceraDetalleOcDto {
  idOc:                    number;
  numeroOc:                string;
  estado:                  string;
  estadoVisual:            string;
  esAutogenerada:          boolean;
  pendienteReemplazo:      boolean;
  reemplazadaPor?:         number | null;
  numeroOcReemplazo?:      string | null;
  fechaReemplazo?:         string | null;
  idOcReemplazada?:        number | null;
  numeroOcReemplazada?:    string | null;
  idCliente:               number;
  razonSocial:             string;
  ruc?:                    string | null;
  fechaRegistro?:          string | null;
  registradoPor?:          string | null;
  idResponsable?:          number | null;
  responsable?:            string | null;
  idMoneda:                number;
  monedaNombre?:           string | null;
  monedaSimbolo?:          string | null;
  moneda?:                 string | null;
  montoOc:                 number;
  propuestasVinculadas:    number;
  montoAsignado:           number;
  saldoOc:                 number;
  asignadoPct:             number;
  resultadoIa?:            string | null;
  alertasIa:               number;
  vinculacionesValidadas:  number;
  vinculacionesObservadas: number;
  pendientesCorreccion:    number;
  rucClienteOc?:           string | null;
  razonSocialOc?:          string | null;
  numeroPropuestaRef?:     string | null;
  idCondicionPago?:        number | null;
  condicionPago?:          string | null;
  formaPago?:              string | null;
  igvIncluido?:            boolean | null;
  igvPct?:                 number | null;
  descuentoMonto?:         number | null;
  /** Ticket E: TC usado si la OC cubre propuestas en moneda distinta. */
  tipoCambio?:             number | null;
  fechaOc?:                string | null;
  fechaRecepcion?:         string | null;
  vigenciaHasta?:          string | null;
  facturaIgualOc:          boolean;
  referencia?:             string | null;
  observaciones?:          string | null;
  conceptos:               ConceptoOrdenCompraDto[];
  camposIa?:               Record<string, string | null>;
  camposManuales:          CampoCorregidoDto[];
  tienePdf:                boolean;
  nombreArchivoPdf?:       string | null;
  tamanoPdfBytes?:         number | null;
  urlPdf?:                 string | null;
  idMotivoAnulacion?:      number | null;
  motivoAnulacion?:        string | null;
  justificacionAnulacion?: string | null;
  fechaAnulacion?:         string | null;
  anuladoPor?:             string | null;
  idExpediente?:           number | null;
  numeroExpediente?:       string | null;
  puedeEditar:             boolean;
  puedeReemplazarPdf:      boolean;
  puedeSubirCorregida:     boolean;
  puedeAgregarPropuesta:   boolean;
  puedeRevalidar:          boolean;
  puedeAnular:             boolean;
  /** Alias legacy de puedeReemplazar (se mantiene por compatibilidad). */
  puedeReemplazarAuto:     boolean;
  /** "Registrar OC del cliente" en reemplazo de esta (autogenerada o pendiente_reemplazo). */
  puedeReemplazar:         boolean;
}

export interface PropuestaVinculadaOcDto {
  idPropuesta:              number;
  numero:                   string;
  version:                  number;
  estadoPropuesta?:         string | null;
  aceptada:                 boolean;
  montoPropuesta:           number;
  montoAsignado:            number;
  /** Ticket E: lo asignado convertido a la moneda de la propuesta (null = misma moneda que la OC). */
  montoCubierto?:           number | null;
  idMonedaPropuesta?:       number | null;
  monedaSimboloPropuesta?:  string | null;
  pctOc:                    number;
  saldoPropuesta:           number;
  idContacto?:              number | null;
  contacto?:                string | null;
  cargoContacto?:           string | null;
  idRequerimiento?:         number | null;
  numeroRq?:                string | null;
  servicios:                number;
  serviciosDetalle?:        string | null;
  estadoValidacion:         string;
  tipoObservacion?:         string | null;
  resultadoIa?:             string | null;
  fechaDecision?:           string | null;
  idValidacion?:            number | null;
  corrida?:                 number | null;
  coincidencias?:           number | null;
  advertencias?:            number | null;
  criticas?:                number | null;
  totalCampos?:             number | null;
  sugerencia?:              string | null;
  dictamen?:                string | null;
  fechaValidacion?:         string | null;
  idPropuestaNuevaVersion?: number | null;
  numeroNuevaVersion?:      string | null;
  versionNuevaVersion?:     number | null;
  estadoNuevaVersion?:      string | null;
  nuevaVersionAceptada:     boolean;
  facturacionHabilitada:    boolean;
}

export interface DetalleOrdenCompraDto {
  cabecera:    CabeceraDetalleOcDto;
  propuestas:  PropuestaVinculadaOcDto[];
  diferencias: CampoComparadoOcDto[];
}

// ─── Validación IA (HU-24) ──

export interface CabeceraValidacionOcDto {
  idOc:                 number;
  numeroOc:             string;
  fechaOc?:             string | null;
  razonSocial?:         string | null;
  ruc?:                 string | null;
  nombreArchivoPdf?:    string | null;
  tamanoPdfBytes?:      number | null;
  tienePdf:             boolean;
  idPropuesta:          number;
  numeroPropuesta:      string;
  versionPropuesta:     number;
  estadoPropuesta?:     string | null;
  fechaAceptacion?:     string | null;
  numeroExpediente?:    string | null;
  estadoValidacion:     string;
  tipoObservacion?:     string | null;
  idValidacion?:        number | null;
  corrida?:             number | null;
  origen?:              string | null;
  resultado?:           string | null;
  coincidencias?:       number | null;
  advertencias?:        number | null;
  criticas?:            number | null;
  totalCampos?:         number | null;
  validacionesCorridas: number;
  dictamen?:            string | null;
  confianza?:           number | null;
  motor?:               string | null;
  sugerencia?:          string | null;
  fechaValidacion?:     string | null;
}

export interface HistorialValidacionOcDto {
  fecha?:        string | null;
  tipo:          string;
  titulo:        string;
  descripcion?:  string | null;
  resultado?:    string | null;
  coincidencias?: number | null;
  advertencias?: number | null;
  criticas?:     number | null;
  usuario?:      string | null;
}

export interface PropuestaPillOcDto {
  idPropuesta:      number;
  numero:           string;
  version:          number;
  resultadoIa?:     string | null;
  estadoValidacion: string;
  seleccionada:     boolean;
}

export interface ValidacionOrdenCompraDto {
  cabecera:   CabeceraValidacionOcDto;
  campos:     CampoComparadoOcDto[];
  conceptos:  ConceptoEvaluadoDto[];
  insights:   InsightIaDto[];
  historial:  HistorialValidacionOcDto[];
  propuestas: PropuestaPillOcDto[];
}

// ─── Timeline (HU-26) ──

export interface CabeceraTimelineOcDto {
  idOc:              number;
  numeroOc:          string;
  estado:            string;
  estadoVisual?:     string | null;
  esAutogenerada:    boolean;
  idCliente?:        number | null;
  razonSocial?:      string | null;
  ruc?:              string | null;
  idPropuesta?:      number | null;
  numeroPropuesta?:  string | null;
  versionPropuesta?: number | null;
  generadoEn?:       string | null;
  generadoPor?:      string | null;
}

/** Categoria: validacion_ia · comercial · documental. Nivel: exito · alerta · critico · info · neutro. */
export interface EventoTimelineOcDto {
  idEvento:        number;
  fecha?:          string | null;
  accion:          string;
  titulo:          string;
  descripcion?:    string | null;
  categoria:       string;
  nivel:           string;
  estadoAnterior?: string | null;
  estadoNuevo?:    string | null;
  metadata?:       string | null;
  url?:            string | null;
  idUsuario?:      number | null;
  usuario?:        string | null;
  area?:           string | null;
  rol?:            string | null;
  automaticoIa:    boolean;
}

export interface TimelineOrdenCompraDto {
  cabecera: CabeceraTimelineOcDto;
  eventos:  EventoTimelineOcDto[];
}

// ─── Anulación (HU-28) ──

export interface ImpactoAnulacionOcDto {
  idOc:                 number;
  numeroOc:             string;
  esAutogenerada:       boolean;
  razonSocial?:         string | null;
  idMoneda:             number;
  monedaSimbolo?:       string | null;
  montoOc:              number;
  montoAsignado:        number;
  propuestasVinculadas: number;
  osEnEjecucion:        number;
  impactoCritico:       boolean;
  fechaServidor?:       string | null;
}

export interface PropuestaAfectadaOcDto {
  idPropuesta:       number;
  numero:            string;
  version:           number;
  montoAsignado:     number;
  estadoValidacion?: string | null;
  saldoActual:       number;
  saldoDespues:      number;
  /** La propuesta aceptada se queda sin OC vigente: al anular se le generará una OC-AUTO sola. */
  generaraOcAutogenerada: boolean;
}

export interface OsEnEjecucionDto {
  idOs:             number;
  numero:           string;
  estado:           string;
  fechaEjecucion?:  string | null;
  numeroExpediente?: string | null;
}

export interface PreparacionAnulacionOcDto {
  impacto:         ImpactoAnulacionOcDto;
  propuestas:      PropuestaAfectadaOcDto[];
  ordenesServicio: OsEnEjecucionDto[];
  motivos:         OpcionFiltro[];
}

export interface PropuestaSaldoOcDto {
  idPropuesta:            number;
  numero:                 string;
  version:                number;
  montoAsignado:          number;
  saldo:                  number;
  /** OC-AUTO generada al anular para mantener la cobertura de esta propuesta (si aplicó). */
  idOcAutogenerada?:      number | null;
  numeroOcAutogenerada?:  string | null;
}

export interface AnulacionOrdenCompraDto {
  idOc:            number;
  numeroOc:        string;
  estado:          string;
  fechaAnulacion?: string | null;
  motivo?:         string | null;
  justificacion?:  string | null;
  propuestas:      PropuestaSaldoOcDto[];
}
