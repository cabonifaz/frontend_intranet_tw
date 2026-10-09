// ─────────────────────────────────────────────────────────────────────────────
// Sprint 3 — Módulo 4: Visto Bueno (HU-13, HU-14, HU-15, HU-16)
// Modelo del front. Los endpoints reales están pendientes de Bryan.
// Mientras tanto, VistoBuenoService usa mocks internos (USAR_MOCK = true).
// ─────────────────────────────────────────────────────────────────────────────

/** Estado del registro de visto_bueno (tabla visto_bueno del back). */
export type EstadoVb = 'pendiente' | 'aprobado' | 'rechazado' | 'en_correccion' | 'reasignado';

/** Fila de la tabla de la bandeja de VB (HU-13). */
export interface VbListaItem {
  idVb:            number;
  idPropuesta:     number;
  codigoPropuesta: string;      // ej. "PROP-002590"
  version:         number;      // ej. 1
  codigoRq:        string;      // ej. "RQ-2024-002"
  idCliente:       number;
  razonSocial:     string;
  ruc:             string;
  referencia:      string;      // "Mantenimiento Planta..."
  monto:           number;
  moneda:          'PEN' | 'USD';
  monedaSimbolo:   string;      // "S/" | "US$"
  /** Porcentaje de descuento aplicado (0 si no tiene). Badge color: verde ≤5, ámbar ≤15, rojo >15. */
  descuentoPct:    number;
  /** Porcentaje de margen de utilidad calculado por el back. Puede ser null si aún no se calcula. */
  margenPct:       number | null;
  idComercial:     number;
  nombreComercial: string;      // autor de la propuesta
  idAprobador:     number;
  nombreAprobador: string;      // jefe asignado actualmente
  estado:          EstadoVb;
  slaHoras:        number;
  slaHorasRestantes: number;    // negativo si vencido
  slaVencido:      boolean;
  fechaSolicitud:  string;      // ISO
}

/** Cards KPI superiores de la bandeja. */
export interface KpisVb {
  pendientes:       number;
  proximosVencer:   number;  // SLA entre 0% y 25% restante
  vencidos:         number;
  aprobadasHoy:     number;
  devueltas:        number;  // estado 'en_correccion' hoy
}

/** Paginado del listado. */
export interface VbPaginado {
  items:     VbListaItem[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

// ─── HU-14: Comparar Versiones ────────────────────────────────────────────

/** Datos para el modal de "Comparar Versiones" (HU-14). */
export interface CompararVersionesData {
  idPropuesta:     number;
  codigoPropuesta: string;
  referencia:      string;
  versiones:       VersionDisponible[];
  base:            VersionCompleta;      // la versión seleccionada como base
  destino:         VersionCompleta;      // la versión seleccionada como destino
  diferencia:      DiferenciaResumen;
}

export interface VersionDisponible {
  idPropuesta: number;
  version:     number;
  estado:      string;
  fechaEmision: string;
  esActual:    boolean;
}

export interface VersionCompleta {
  idPropuesta:   number;
  version:       number;
  estado:        string;
  fechaEmision:  string;
  subtotal:      number;
  igvPct:        number;
  igvMonto:      number;
  descuentoMonto: number;
  total:         number;
  monedaSimbolo: string;
  items:         ItemVersion[];
  condiciones:   CondicionVersion[];
  equipos:       EquipoVersion[];
  textos:        TextoVersion[];
}

export interface ItemVersion       { descripcion: string; cantidad: number; precioUnitario: number; subtotal: number; }
export interface CondicionVersion  { tipo: string; valor: string; }
export interface EquipoVersion     { numSerie: string; marca: string; modelo: string; }
export interface TextoVersion      { seccion: string; texto: string; }

/** Resumen diferencial entre dos versiones (cards KPIs). */
export interface DiferenciaResumen {
  diferenciaTotal:      number;     // destino.total - base.total
  diferenciaPct:        number;     // porcentaje
  itemsAgregados:       number;
  itemsModificados:     number;
  itemsEliminados:      number;
  cambiosItems:         string;     // "5 vs 4"
  riesgoFinanciero:     'BAJO' | 'MODERADO' | 'ALTO';
}

/** Validaciones previas (HU-14 panel). */
export interface ValidacionesPrevias {
  limiteCredito: ValidacionItem;
  margen:        ValidacionItem;
  stock:         ValidacionItem;
}

export interface ValidacionItem {
  estado:  'ok' | 'warning' | 'error';
  mensaje: string;
}

// ─── HU-15: Decisiones ─────────────────────────────────────────────────────

/** Request para aprobar VB. */
export interface AprobarVbRequest {
  idVb:       number;
  comentario?: string;
  confirmoRevision: boolean;    // checkbox obligatorio
}

/** Request para rechazar propuesta. */
export interface RechazarVbRequest {
  idVb:          number;
  idMotivo:      number;
  justificacion: string;        // mínimo 20 chars
}

/** Área a corregir en el modal "Solicitar Corrección". */
export type AreaCorreccion =
  | 'configuracion' | 'items_precios' | 'descuento' | 'detalle'
  | 'forma_pago'    | 'condiciones'   | 'equipos'   | 'documentos';

/** Request para solicitar corrección. */
export interface SolicitarCorreccionRequest {
  idVb:          number;
  areas:         AreaCorreccion[];        // al menos 1
  observaciones: string;                  // mínimo 20 chars
  fechaLimite:   string;                  // ISO datetime
}

// ─── HU-16: Reasignar Aprobador ────────────────────────────────────────────

/** Opción del autocomplete de aprobadores. */
export interface AprobadorOpcion {
  idUsuario:      number;
  nombreCompleto: string;
  cargo:          string;
  area:           string;
  areaLabel:      string;
  rolSistema:     string;      // 'supervisor' | 'administrador'
  nivel:          number;      // 1=admin, 2=supervisor
}

/** Request para reasignar aprobador. */
export interface ReasignarAprobadorRequest {
  idVb:              number;
  idNuevoAprobador:  number;
  idMotivo:          number;
  comentario?:       string;
  reiniciarSla:      boolean;
}

// ─── Filtros + catálogos ──────────────────────────────────────────────────

/** Filtros de la bandeja (HU-13). */
export interface FiltrosVb {
  idComercial?:  number;
  estado?:       EstadoVb | 'todos';
  moneda?:       'PEN' | 'USD' | 'todas';
  dias?:         number;         // últimos N días (default 30)
  pagina?:       number;
  porPagina?:    number;
}

export interface ComercialOpcion {
  idUsuario:      number;
  nombreCompleto: string;
}

export const ESTADOS_VB_TABS: { codigo: EstadoVb | 'todos'; label: string }[] = [
  { codigo: 'todos',          label: 'Todos' },
  { codigo: 'pendiente',      label: 'Pendientes' },
  { codigo: 'aprobado',       label: 'Aprobados' },
  { codigo: 'rechazado',      label: 'Rechazados' },
  { codigo: 'en_correccion',  label: 'En corrección' },
];

export const AREAS_CORRECCION: { codigo: AreaCorreccion; label: string }[] = [
  { codigo: 'configuracion',  label: 'Configuración'  },
  { codigo: 'items_precios',  label: 'Ítems y precios' },
  { codigo: 'descuento',      label: 'Descuento'      },
  { codigo: 'detalle',        label: 'Detalle'        },
  { codigo: 'forma_pago',     label: 'Forma de Pago'  },
  { codigo: 'condiciones',    label: 'Condiciones'    },
  { codigo: 'equipos',        label: 'Equipos'        },
  { codigo: 'documentos',     label: 'Documentos'     },
];
