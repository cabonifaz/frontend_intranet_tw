// Modelo del Centro de Notificaciones (HU-90, Módulo 16).
// El back real aún no tiene la bandeja completa — el service corre contra un
// mock local que simula los endpoints hasta que Bryan los entregue (ver
// mensaje-back-modulo-16-notificaciones.md).

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

export type EstadoFiltro = 'no_leidas' | 'leidas' | 'archivadas' | 'todas';
export type RangoFecha   = 'hoy' | 'esta_semana' | 'este_mes' | 'custom' | 'todas';

export interface NotificacionBandeja {
  idNotificacion:     number;
  tipo:               TipoNotificacion;
  tipoLabel:          string;
  moduloCodigo:       ModuloCodigo;
  moduloLabel:        string;
  titulo:             string;
  cuerpo:             string;
  tipoDot:            string;   // color hex del dot (ya lo da el back)
  tiempo:             string;   // "Hace 5m", "Ayer 14:30"
  creadoEn:           string;   // ISO
  leida:              boolean;
  archivada:          boolean;
  esAlertaOperativa:  boolean;
  idRemitente:        number | null;
  remitente:          string | null;   // null = "Sistema"
  entidadTipo:        string | null;
  entidadId:          number | null;
  entidadCodigo:      string | null;
}

export interface BandejaNotificaciones {
  total:    number;
  noLeidas: number;
  items:    NotificacionBandeja[];
}

export interface FiltrosBandejaNotif {
  estado?:      EstadoFiltro;
  modulo?:      ModuloCodigo[] | null;
  tipo?:        TipoNotificacion[] | null;
  idRemitente?: number | null;
  fechaDesde?:  string | null;
  fechaHasta?:  string | null;
  busqueda?:    string | null;
  rango?:       RangoFecha;
  pagina?:      number;
  porPagina?:   number;
}

/** Grupo visual de la lista izquierda del centro: Hoy / Ayer / Esta semana / Más antiguas. */
export interface GrupoNotificaciones {
  clave:  'hoy' | 'ayer' | 'esta_semana' | 'mas_antiguas';
  label:  string;
  items:  NotificacionBandeja[];
}

/** Payload de link profundo. Cada tipo entidad define su ruta destino. */
export interface LinkDestinoNotif {
  entidadTipo:   string;
  entidadId:     number;
  rutaDestino:   string[];     // ej. ['/operaciones/ordenes-servicio'] + queryParams
  queryParams?:  Record<string, string | number>;
}
