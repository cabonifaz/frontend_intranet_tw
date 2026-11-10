// Modelo del Centro de Notificaciones (HU-90, Módulo 16).
// Schema alineado al contrato del back (ver mensaje-back-modulo-16-notificaciones.md).

export type TipoNotificacion =
  | 'recordatorio'
  | 'aprobacion_pendiente'
  | 'alerta_operativa'
  | 'cambio_estado'
  | 'ssoma'
  | 'sistema';

export type ModuloCodigo =
  | 'propuestas' | 'vb' | 'oc' | 'os' | 'seguimiento'
  | 'programacion' | 'control_campo' | 'ssoma' | 'revision_tecnica'
  | 'expedientes' | 'sistema';

export type PrioridadNotif = 'critica' | 'alta' | 'normal';

/** Grupo temporal: lo devuelve ya calculado el back por fila. */
export type GrupoNotifClave = 'hoy' | 'ayer' | 'semana' | 'antiguas';

export type EstadoFiltro = 'activas' | 'no_leida' | 'leida' | 'archivada' | 'todas';
export type RangoFecha   = 'hoy' | 'semana' | 'mes' | 'custom';

/** Remitente de la notificación. Si vino del sistema, `idUsuario = 0`. */
export interface RemitenteNotif {
  idUsuario: number;
  nombre:    string;
  iniciales: string;
}

/**
 * Destino navegable para el botón "Ir al elemento origen".
 * El back lo manda armado — el front solo hace el mapeo accion → ruta Angular.
 * Si `destino` es null, no hay link profundo (botón deshabilitado).
 */
export interface DestinoNotif {
  accion:       string;   // ej. "os.detalle", "seguimiento.servicio", "propuesta.precotizacion"
  entidadTipo:  string;
  idEntidad:    number;
  tab?:         string | null;
}

export interface NotificacionBandeja {
  idNotificacion:    number;
  titulo:            string;
  resumen:           string;
  modulo:            ModuloCodigo;
  moduloLabel:       string;
  tipo:              TipoNotificacion;
  tipoLabel:         string;
  prioridad:         PrioridadNotif;
  esAlertaOperativa: boolean;
  leida:             boolean;
  archivada:         boolean;
  remitente:         RemitenteNotif;
  fechaCreacion:     string;         // ISO en hora Lima
  grupo:             GrupoNotifClave;
  destino:           DestinoNotif | null;
}

/** Respuesta de GET /resumen (badge + popover del bell). */
export interface ResumenNotificaciones {
  noLeidas: number;
  ultimas:  NotificacionBandeja[];   // 5 filas
}

/** Respuesta de GET /bandeja. */
export interface BandejaNotificaciones {
  total:     number;
  noLeidas:  number;
  pagina:    number;
  porPagina: number;
  items:     NotificacionBandeja[];
}

export interface FiltrosBandejaNotif {
  estado?:     EstadoFiltro;
  modulos?:    ModuloCodigo[] | null;
  tipos?:      TipoNotificacion[] | null;
  rango?:      RangoFecha;
  fechaDesde?: string | null;    // yyyy-MM-dd (solo con rango='custom')
  fechaHasta?: string | null;    // yyyy-MM-dd
  remitente?:  number | null;    // 0 = Sistema
  busqueda?:   string | null;
  pagina?:     number;
  porPagina?:  number;
}

/** Opciones para los combos de filtro (GET /filtros con conteos). */
export interface OpcionesFiltroNotif {
  modulos:  Array<{ codigo: ModuloCodigo;    label: string; cantidad: number }>;
  tipos:    Array<{ codigo: TipoNotificacion; label: string; cantidad: number }>;
  estados:  Array<{ codigo: EstadoFiltro;    label: string; cantidad: number }>;
  rangos:   Array<{ codigo: RangoFecha;      label: string; cantidad: number }>;
  remitentes: Array<{ idUsuario: number; nombre: string; iniciales: string; cantidad: number }>;
}

/** Respuesta del GET /{id} (abre y marca leída). */
export interface DetalleNotificacion {
  notificacion:     NotificacionBandeja;
  mensaje:          string;              // texto completo del body
  fechaLectura:     string | null;
  fechaArchivado:   string | null;
  puedeArchivar:    boolean;
  noLeidas:         number;
}

/** Grupo visual agrupado localmente para la lista izquierda del centro. */
export interface GrupoNotificaciones {
  clave: GrupoNotifClave;
  label: string;
  items: NotificacionBandeja[];
}

/** Resultado de mapear destino del back → ruta Angular. */
export interface RutaDestinoNotif {
  rutaDestino:  string[];
  queryParams?: Record<string, string | number>;
}

// ─── Eventos SignalR del hub /hubs/notificaciones ─────────────────────────────

export interface EnvolventeEventoNotif<T> {
  evento: string;
  fecha:  string;
  datos:  T;
}

export interface EventoNotifCreada {
  notificacion: NotificacionBandeja;
  noLeidas:     number;
}

export interface EventoNotifActualizada {
  ids?:     number[];
  todas?:   boolean;
  estado:   'leida' | 'archivada';
  noLeidas: number;
}

export interface EventoRefrescoOc {
  idOc:         number;
  numeroOc:     string;
  estado:       string;
  idsPropuesta: number[];
  autogenerada: boolean;
}

export interface EventoRefrescoVb {
  idPropuesta: number;
  numero:      string;
  estado:      string;
  estadoVb:    string;
  accion:      string;
}

export interface EventoRefrescoOs {
  idOs:        number;
  numero:      string;
  tipo:        string;
  estado:      string;
  reemitida?:  boolean;
}

export interface EventoRefrescoPrecotizacion {
  idPrecotizacion: number;
  numero:          string;
  estado:          string;
  idInforme?:      number | null;
}
