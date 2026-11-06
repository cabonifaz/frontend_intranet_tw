// Módulo 11 Control de Campo — Seguimiento Operativo (HU-51 a HU-54)
// Vista del Asistente de Servicio Técnico (observacional). Monitoreo en tiempo real
// de técnicos en campo + servicios en ejecución. Auto-refresh (HU-51: 30s · HU-52: 15s).

export type EstadoTecnicoCampo =
  | 'sin_salir'          // ⚪ aún no sale de la base
  | 'en_ruta'            // 🔵 en tránsito hacia la planta
  | 'en_planta'          // 🟢 llegó a planta, aún no empieza
  | 'en_ejecucion'       // 🟢 ejecutando servicio
  | 'con_demora'         // 🟡 demora o incidencia menor
  | 'con_incidente'      // 🔴 incidente crítico
  | 'finalizado'         // ✅ terminó
  ;

export type TipoAlertaCampo =
  | 'perdida_contacto'
  | 'gps_parado'
  | 'sin_ingreso_post_llegada'
  | 'proximidad'
  | 'sin_iniciar_servicio'
  | 'retraso_critico'
  | 'incidente'
  ;

export type SeveridadAlerta = 'critica' | 'advertencia' | 'info';

// ─── KPIs de la cabecera ────────────────────────────────────────────────────
export interface KpisSeguimientoOperativo {
  programadas:    number;
  tecnicos:       number;   // técnicos activos del día
  enRuta:         number;
  enPlanta:       number;
  enEjecucion:    number;
  conDemora:      number;
  finalizados:    number;
}

// ─── Punto del mapa operativo ───────────────────────────────────────────────
export interface PuntoMapa {
  idServicio:     number;
  numero:         string;          // OS-000793 / OM-000332
  tipo:           'OS' | 'OM';
  idTecnico:      number;
  tecnico:        string;
  iniciales:      string;          // 'PS' / 'JI'
  estado:         EstadoTecnicoCampo;
  cliente:        string;
  ubicacion:      string;          // "Planta Callao · hace 5 min"
  horaUltima:     string;          // '10:25'
  lat?:           number | null;
  lng?:           number | null;
}

// ─── Alerta crítica del panel lateral ───────────────────────────────────────
export interface AlertaCampo {
  idAlerta:       number;
  tipo:           TipoAlertaCampo;
  tituloCorto:    string;          // "Pérdida de contacto"
  tecnico:        string;
  numeroServicio: string;
  idServicio:     number;
  severidad:      SeveridadAlerta;
  hace:           string;          // "Hace 12 min"
}

// ─── Hito esperado (próximos 60 min) ────────────────────────────────────────
export interface HitoEsperado {
  idHito:         number;
  hora:           string;          // "09:50"
  titulo:         string;
  subtitulo:      string;
  idServicio:     number;
  numeroServicio: string;
  requiereAtencion: boolean;
}

// ─── Vista Principal (tab 1) ────────────────────────────────────────────────
export interface VistaPrincipalSeguimiento {
  mapa:           PuntoMapa[];
  alertas:        AlertaCampo[];
  totalAlertas:   number;
  hitos:          HitoEsperado[];
  ultimaActualizacion: string;     // "10:42"
}

// ─── Servicio en Campo (tab 2) ──────────────────────────────────────────────
export interface ServicioEnCampo {
  idServicio:     number;
  numero:         string;
  tipo:           'OS' | 'OM';
  cliente:        string;
  sede:           string;
  idTecnico:      number;
  tecnico:        string;
  estado:         EstadoTecnicoCampo;
  horaLlegada?:   string | null;
  horaInicio?:    string | null;
  avancePct:      number;          // 0-100
  nEquipos:       number;
  ultimaActividad: string;         // "hace 5 min"
  alertaActiva?:  string | null;
}

// ─── Técnico Activo (tab 3) ─────────────────────────────────────────────────
export interface TecnicoActivo {
  idTecnico:      number;
  nombre:         string;
  cargo:          string;
  iniciales:      string;
  estado:         EstadoTecnicoCampo;
  servicioActual?: {
    idServicio:   number;
    numero:       string;
    cliente:      string;
  } | null;
  servicios:      number;           // cantidad del día
  horasCampo:     number;
  telefono:       string;
}

// ─── Incidencia del Día (tab 4) ─────────────────────────────────────────────
export interface IncidenciaDia {
  idIncidencia:   number;
  hora:           string;
  tipo:           TipoAlertaCampo;
  tipoLabel:      string;           // "GPS parado"
  tecnico:        string;
  numeroServicio: string;
  idServicio:     number;
  severidad:      SeveridadAlerta;
  detalle:        string;
  resuelta:       boolean;
}

// ─── Respuesta completa de la bandeja ───────────────────────────────────────
export interface BandejaSeguimientoOperativo {
  kpis:               KpisSeguimientoOperativo;
  vistaPrincipal:     VistaPrincipalSeguimiento;
  serviciosEnCampo:   ServicioEnCampo[];
  tecnicosActivos:    TecnicoActivo[];
  incidenciasDia:     IncidenciaDia[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HU-52 — Detalle del Servicio en Ruta (Modal grande con 7 tabs)
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoEquipoServicio =
  | 'pendiente' | 'en_ejecucion' | 'finalizado' | 'parcial' | 'reprogramado' | 'anulado';

export interface CabeceraServicio {
  idServicio:       number;
  numero:           string;         // OS-000793
  tipo:             'OS' | 'OM';
  numeroPropuesta?: string | null;  // PROP-000240 v3
  cliente:          string;
  sede:             string;
  direccion?:       string | null;
  idTecnico:        number;
  tecnico:          string;
  cargoTecnico:     string;
  telefono:         string;
  estado:           EstadoTecnicoCampo;
  horaProgramada:   string;         // '08:00'
  horaFinEstimada:  string;         // '12:00'
  horaLlegada?:     string | null;
  horaInicio?:      string | null;
  horaFin?:         string | null;
  totalEquipos:     number;
  avancePct:        number;
  esFinalizado:     boolean;        // true → se muestra tab Cierre
  ultimaActualizacion: string;      // '10:42'
}

// ─── Tab 1: Resumen ──────────────────────────────────────────────────────
export interface ResumenServicio {
  checklistSalida: boolean;         // OK / pendiente
  viaticos: {
    asignado:   number;
    simbolo:    string;
    estado:     'depositado' | 'pendiente';
  };
  equipoTrabajo: {
    idUsuario: number;
    nombre:    string;
    rol:       'principal' | 'apoyo';
  }[];
  tareasPendientes: string[];
  observaciones?:   string | null;
}

// ─── Tab 2: Avance por Equipos ────────────────────────────────────────────
export type NombreEtapaEquipo = 'LIMPIEZA' | 'DESMONTAJE' | 'PRUEBAS' | 'MONTAJE' | 'CIERRE';
export type EstadoEtapaEquipo = 'pendiente' | 'en_curso' | 'completada';

export interface EtapaEquipo {
  nombre:      NombreEtapaEquipo;
  estado:      EstadoEtapaEquipo;
  hora?:       string | null;      // hora en la que ocurrió (si aplicable)
  enCursoDesde?: string | null;    // '10:48'
}

export interface EquipoAvance {
  idEquipo:         number;
  codigoTw:         string;
  marca:            string;
  modelo:           string;
  numeroSerie:      string;
  estado:           EstadoEquipoServicio;
  horaInicio?:      string | null;
  horaFin?:         string | null;
  etapaActual:      NombreEtapaEquipo | null;      // 'PRUEBAS' si está en ejecución
  tiempoResumen?:   string | null;                 // "1h 15min" o "17 min transcurridos"
  progresoPct:      number;
  etapas:           EtapaEquipo[];                 // 5 etapas
  nFotos:           number;
  nEnsayos:         number;
  nDocumentos:      number;
  nObservaciones:   number;
  nMediciones:      number;
  activo:           boolean;                       // true = equipo En Ejecución (expandido)
  // Datos opcionales usados por el tab Cierre
  tipoServicioEquipo?: string | null;              // "Calibración" / "Mantenimiento" / "Verificación"
  codigoInforme?:      string | null;              // "INF-245-A"
  motivoPendiente?:    string | null;              // "Esperando decisión J.Ops"
}

// ─── Tab 3: Mapa GPS ─────────────────────────────────────────────────────
export interface PuntoGpsTecnico {
  hora:         string;
  lat:          number;
  lng:          number;
  evento?:      string | null;    // "Salida base", "Llegada planta", ...
  detalle?:     string | null;    // "A 300m del destino en Ventanilla"
  tipo:         'salida' | 'pre_llegada' | 'llegada' | 'punto';
}

export interface EstadoSenalGps {
  activo:               boolean;
  haceSegundos:         number;       // 15
  precisionMetros:      number;       // 3
  satelitesConectados:  number;       // 9
  satelitesDisponibles: number;       // 12
  latenciaMs:           number;       // 342
  mensajeEstado:        string;       // "Señal estable sin desconexiones desde las 08:00"
  estable:              boolean;
}

export interface UltimaUbicacion {
  nombreLugar:      string;           // "Planta Concentradora Ventanilla"
  direccion:        string;           // "Av. Néstor Gambetta km 11, Callao"
  dentroDelRadio:   boolean;
  distanciaAlCliente: number;         // 0 metros
  velocidadKmh:     number;           // 0
  direccionBrujula: string | null;    // "N" / "NE" / null
  altitudMsnm:      number;           // 25
  tiempoEnPunto:    string;           // "2h 02min"
}

export interface MapaGpsServicio {
  estadoSenal:      EstadoSenalGps;
  ultimaUbicacion:  UltimaUbicacion;
  cronograma:       PuntoGpsTecnico[];
  resumenRuta:      string;           // "Pedro Salazar llegó a Planta Ventanilla a las 08:50..."
  chipEstadoMapa:   string;           // "En Planta" / "En Ruta"
}

// ─── Tab 4: Timeline del Día ──────────────────────────────────────────────
export type TipoEventoTimeline =
  | 'hito_tecnico'       // verde: avances del técnico
  | 'alerta_sistema'     // ámbar: alertas automáticas
  | 'demora_incidente'   // rojo: demoras/incidencias
  | 'registro_asistente' // azul: registros del asistente
  ;

export interface EventoTimeline {
  idEvento:   number;
  hora:       string;
  tipo:       TipoEventoTimeline;
  titulo:     string;
  descripcion?: string | null;
  autor?:     string | null;
}

// ─── Tab 5: Demoras / Incidencias ─────────────────────────────────────────
export interface KpisDemoras {
  total:       number;
  retrasan:    number;
  detienen:    number;
  porTecnico:  number;
  porAsistente: number;
}
export interface DemoraIncidenciaServicio {
  idDemora:    number;
  hora:        string;
  tipo:        string;
  motivo:      string;
  duracionMin: number;
  origen:      'tecnico' | 'asistente' | 'sistema';
  detalle?:    string | null;
  retrasa:     boolean;
  detiene:     boolean;
  nFotos?:     number;             // evidencia adjunta (opcional)
}

// ─── Tab 6: Registrar (HU-53) ─────────────────────────────────────────────
export type ModoRegistro = 'observacion' | 'demora_incidente' | 'cambio_estado_critico';

// ─── Tab 7: Cierre (HU-54, condicional si FINALIZADO) ─────────────────────
export interface CierreServicio {
  horaFin:         string;
  duracionReal:    string;             // "4h 35min"
  demoraMinutos?:  number;              // +35 (vs programado)
  esCompletadoParcial: boolean;         // true si hay equipos sin ejecutar
  avanceFinalPct:  number;
  equiposFinalizados: number;
  equiposPendientes: number;
  nInformes:       number;              // informes generados
  nRegAsistente:   number;              // registros del asistente en el día
  observacionesTecnico?: string | null;
  firmadoPorCliente:    boolean;
  nombreQuienFirma?:    string | null;
  cargoQuienFirma?:     string | null;
  horaFirma?:           string | null;
}

// ─── Respuesta completa del detalle ───────────────────────────────────────
export interface DetalleServicioSeguimiento {
  cabecera:       CabeceraServicio;
  resumen:        ResumenServicio;
  equipos:        EquipoAvance[];
  gps:            MapaGpsServicio;
  timeline:       EventoTimeline[];
  kpisDemoras:    KpisDemoras;
  demoras:        DemoraIncidenciaServicio[];
  cierre?:        CierreServicio | null;  // solo si esFinalizado
}
