// ─────────────────────────────────────────────────────────────────────────────
// Sprint 3 — Módulo 4: Visto Bueno (HU-13, HU-14, HU-15, HU-16)
// Mapea 1:1 con los DTOs del back (ver src/TW.Intranet.Aplicacion/Dtos/VistoBuenoDtos.cs).
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════ HU-13 — Bandeja ══════════════════════

/** Filtros de la bandeja. */
export interface FiltrosBandejaVb {
  idComercial?: number;
  /** pendiente | aprobado | devuelto | rechazado (vacío = todos) */
  estado?:      string;
  idMoneda?:    number;
  /** en_plazo | proximo | vencido | cumplido | fuera_de_plazo */
  sla?:         string;
  /** 0 = todo; los pendientes se ven siempre */
  dias?:        number;
  pagina?:      number;
  porPagina?:   number;
}

export interface KpisVb {
  pendientes:     number;
  proximosVencer: number;
  vencidos:       number;
  aprobadasHoy:   number;
  devueltas:      number;
}

export interface ItemBandejaVb {
  idVb:                        number;
  idPropuesta:                 number;
  numero:                      string;   // ej. "PROP-002590"
  version:                     number;
  idRequerimiento?:            number | null;
  numeroRq?:                   string | null;
  idCliente:                   number;
  razonSocial:                 string;
  ruc?:                        string | null;
  referencia?:                 string | null;
  total:                       number;
  idMoneda:                    number;
  moneda?:                     string | null;
  monedaSimbolo?:              string | null;
  descuentoPct:                number;
  idComercial:                 number;
  comercial:                   string;
  idAprobador?:                number | null;
  aprobador?:                  string | null;
  aprobadorEsSuplente:         boolean;
  /** pendiente | aprobado | devuelto | rechazado */
  estadoVb:                    string;
  fechaSolicitud?:             string | null;
  fechaRespuesta?:             string | null;
  venceEn?:                    string | null;
  slaHoras:                    number;
  horasTranscurridas:          number;
  horasRestantes:              number;
  /** en_plazo | proximo | vencido (pendientes) · cumplido | fuera_de_plazo (resueltos) */
  slaEstado:                   string;
  requiereAprobacionEspecial:  boolean;
  comentarioSolicitud?:        string | null;
  comentarioRespuesta?:        string | null;
  puedeResolver:               boolean;
}

export interface OpcionFiltro {
  id:      number;
  nombre:  string;
  codigo?: string | null;
}

export interface PoliticasVb {
  descuentoAprobacionEspecialPct: number;
  margenMinimoPct:                number;
  slaHorasHabiles:                number;
  jornadaInicio:                  number;
  jornadaFin:                     number;
  proximoVencerPct:               number;
}

export interface BandejaVb {
  kpis:        KpisVb;
  items:       ItemBandejaVb[];
  total:       number;
  pagina:      number;
  porPagina:   number;
  comerciales: OpcionFiltro[];
  monedas:     OpcionFiltro[];
  politicas:   PoliticasVb;
}

// ══════════════════════ HU-15 — Resolver ══════════════════════

export type AccionResolver = 'aprobar' | 'corregir' | 'rechazar';

export interface ResolverVbRequest {
  accion:                   AccionResolver;
  comentario?:              string;
  validacionesConfirmadas?: string[];
  idMotivoRechazo?:         number | null;
  areas?:                   string[];
  fechaLimite?:             string | null;    // ISO
}

export interface ResultadoResolverVb {
  idPropuesta:   number;
  estado:        string;
  estadoVb:      string;
  idCorreccion?: number | null;
  fechaLimite?:  string | null;
}

// ══════════════════════ HU-15 — Preparar modales de decisión ══════════════════════

export interface ValidacionRequerida {
  codigo:      string;
  texto:       string;
  obligatoria: boolean;
}

export interface OpcionCatalogoVb {
  id:     number;
  nombre: string;
}

export interface AreaCorreccion {
  codigo:   string;
  etiqueta: string;
}

export interface DecisionVb {
  idPropuesta:            number;
  numero:                 string;
  version:                number;
  estado:                 string;
  total:                  number;
  monedaSimbolo?:         string | null;
  monedaCodigo?:          string | null;
  cliente?:               string | null;
  idComercial?:           number | null;
  nombreComercial?:       string | null;
  idVistoBueno?:          number | null;
  puedeResolver:          boolean;
  motivoBloqueo?:         string | null;
  fechaLimiteSugerida?:   string | null;
  validacionesRequeridas: ValidacionRequerida[];
  motivosRechazo:         OpcionCatalogoVb[];
  areasCorreccion:        AreaCorreccion[];
}

export interface CorreccionPropuesta {
  idCorreccion:      number;
  estado:            string;
  observaciones:     string;
  fechaLimite?:      string | null;
  vencida:           boolean;
  solicitadoEn?:     string | null;
  solicitadoPor?:    string | null;
  idResponsable?:    number | null;
  nombreResponsable?: string | null;
  atendidaEn?:       string | null;
  areas:             AreaCorreccion[];
}

// ══════════════════════ HU-14 — Validaciones previas ══════════════════════

export type NivelValidacion = 'ok' | 'alerta' | 'error' | 'no_disponible';

export interface ValidacionPrevia {
  codigo:   string;
  etiqueta: string;
  nivel:    NivelValidacion;
  detalle:  string;
}

export interface ResumenEconomicoVb {
  idMoneda:         number;
  monedaSimbolo?:   string | null;
  total:            number;
  lineaCredito?:    number | null;
  creditoConsumido: number;
  ventaConCosto?:   number | null;
  costo?:           number | null;
  margenPct?:       number | null;
  margenMinimoPct:  number;
  items:            number;
  itemsSinCosto:    number;
  descuentoPct:     number;
  veCostos:         boolean;
}

export interface ValidacionesVb {
  validaciones:     ValidacionPrevia[];
  resumen:          ResumenEconomicoVb;
  /** BAJO | MODERADO | ALTO */
  riesgoFinanciero: string;
}

// ══════════════════════ HU-14 — Comparar versiones ══════════════════════

export interface CabeceraVersion {
  idPropuesta:        number;
  numero:             string;
  version:            number;
  estado:             string;
  fechaEmision?:      string | null;
  referencia?:        string | null;
  tipoServicio?:      string | null;
  cliente?:           string | null;
  idMoneda:           number;
  moneda?:            string | null;
  monedaSimbolo?:     string | null;
  subtotal:           number;
  descuentoMonto:     number;
  descuentoPct:       number;
  igvPct:             number;
  igvMonto:           number;
  total:              number;
  aplicaIgv:          boolean;
  plazoEntregaDias?:  number | null;
  vigenciaDias?:      number | null;
  condicionPago?:     string | null;
  formaPago?:         string | null;
  descripcionCambios?: string | null;
  motivoNuevaVersion?: string | null;
}

/** Estado: agregado | modificado | eliminado | igual */
export interface DiferenciaItem {
  estado:               string;
  seccion:              string;
  descripcion:          string;
  cantidadBase?:        number | null;
  cantidadDestino?:     number | null;
  precioUnitarioBase?:  number | null;
  precioUnitarioDestino?: number | null;
  subtotalBase?:        number | null;
  subtotalDestino?:     number | null;
  camposModificados:    string[];
}

export interface DiferenciaCampo {
  campo:        string;
  etiqueta:     string;
  valorBase?:   string | null;
  valorDestino?: string | null;
  estado:       string;
}

export interface DiferenciaElemento {
  estado:      string;
  descripcion: string;
  detalle?:    string | null;
}

export interface ResumenComparacion {
  diferenciaTotal:  number;
  diferenciaPct:    number;
  itemsBase:        number;
  itemsDestino:     number;
  itemsAgregados:   number;
  itemsModificados: number;
  itemsEliminados:  number;
  /** BAJO | MODERADO | ALTO */
  riesgoFinanciero: string;
  motivosRiesgo:    string[];
}

export interface VersionDisponible {
  idPropuesta:   number;
  version:       number;
  estado:        string;
  fechaEmision?: string | null;
}

export interface ComparacionVersiones {
  base:                CabeceraVersion;
  destino:             CabeceraVersion;
  resumen:             ResumenComparacion;
  financiero:          DiferenciaCampo[];
  items:               DiferenciaItem[];
  condiciones:         DiferenciaCampo[];
  equipos:             DiferenciaElemento[];
  textos:              DiferenciaElemento[];
  validacionesDestino: ValidacionPrevia[];
  versiones:           VersionDisponible[];
}

