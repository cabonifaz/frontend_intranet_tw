// Módulo 11 Control de Campo — Seguimiento Operativo (HU-51 a HU-54)
// Vista del Asistente de Servicio Técnico (observacional). Monitoreo en tiempo real
// de técnicos en campo + servicios en ejecución.
//
// Estos son los modelos de la UI. Los DTOs reales del backend están en
// seguimiento-operativo-api.model.ts y se convierten a estos modelos con las funciones
// puras de core/services/seguimiento-operativo-mapper.ts.
// Auto-refresh: la bandeja usa kpis.refrescoSegundos (SEG_REFRESCO_SEGUNDOS, 30 s por
// defecto) y el detalle cabecera.refrescoSegundos (SEG_DETALLE_REFRESCO_SEGUNDOS, 15 s).

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
  | 'incidente'
  | 'otra'
  ;

export type SeveridadAlerta = 'critica' | 'advertencia' | 'info';

/** Momento en que se registró una demora desde la app: en ruta (llegar a planta) o al ingresar a planta. */
export type FaseDemora = 'llegada' | 'ingreso';

// ─── KPIs de la cabecera ────────────────────────────────────────────────────
export interface KpisSeguimientoOperativo {
  programadas:    number;
  tecnicos:       number;   // técnicos activos del día
  enRuta:         number;   // técnicos en ruta
  enPlanta:       number;
  enEjecucion:    number;
  conDemora:      number;   // con demora o incidente
  finalizados:    number;
  sinSalir:       number;
  incidenciasDia: number;
  refrescoSegundos: number;
}

// ─── Punto del mapa operativo (un pin por técnico) ──────────────────────────
export interface PuntoMapa {
  idServicio:     number | null;   // null si el técnico no tiene servicio asignado hoy
  numero:         string | null;   // OS-000793 / OM-000332
  tipo:           'OS' | 'OM';
  idTecnico:      number;
  tecnico:        string;
  iniciales:      string;          // 'PS' / 'JI'
  estado:         EstadoTecnicoCampo;
  cliente:        string | null;
  direccion:      string;          // dirección de la última posición GPS (puede venir vacía)
  minutosUbicacion: number | null; // hace cuántos minutos llegó la última posición
  hace:           string;          // "hace 5 min" / "Sin posición GPS hoy"
  lat:            number | null;
  lng:            number | null;
}

// ─── Alerta crítica del panel lateral ───────────────────────────────────────
export interface AlertaCampo {
  idAlerta:       string;          // clave del backend (ej. 'gps_parado:12:790')
  tipo:           TipoAlertaCampo;
  tituloCorto:    string;          // "Pérdida de contacto"
  detalle:        string;
  tecnico:        string;
  numeroServicio: string;
  idServicio:     number;
  severidad:      SeveridadAlerta;
  hace:           string;          // "Hace 12 min"
  nueva:          boolean;
}

// ─── Hito esperado ──────────────────────────────────────────────────────────
export interface HitoEsperado {
  idHito:         string;          // `${idOs}:${tipo}`
  tipo:           string;          // salida | llegada | inicio | termino | retorno
  hora:           string;          // "09:50"
  titulo:         string;
  subtitulo:      string;
  idServicio:     number;
  numeroServicio: string;
  requiereAtencion: boolean;       // hito atrasado (su hora esperada ya pasó)
}

// ─── Vista Principal (tab 1) ────────────────────────────────────────────────
export interface VistaPrincipalSeguimiento {
  mapa:           PuntoMapa[];
  alertas:        AlertaCampo[];
  totalAlertas:   number;
  alertasNuevas:  number;
  alertasCriticas: number;
  hitos:          HitoEsperado[];
  todosHitosOcurrieron: boolean;
  hitosPendientes: number;
  ultimaActualizacion: string;     // "10:42"
}

// ─── Servicio en Campo (tab 2) ──────────────────────────────────────────────
export interface ServicioEnCampo {
  idServicio:     number;
  numero:         string;
  tipo:           'OS' | 'OM';
  propuesta:      string | null;
  cliente:        string;
  zona:           string | null;
  idTecnico:      number | null;
  tecnico:        string;
  estado:         EstadoTecnicoCampo;
  horaProgramada: string | null;   // hora de inicio programada
  avancePct:      number;          // 0-100
  nEquipos:       number;
  nEjecutados:    number;
  ultimaUbicacion: string | null;
  ultimaActividad: string;         // "hace 5 min" / "—"
}

// ─── Técnico Activo (tab 3) ─────────────────────────────────────────────────
export interface ServicioDelDiaTecnico {
  idServicio:   number;
  numero:       string;
  cliente:      string;
  estado:       EstadoTecnicoCampo;
  rol:          string;
  horaInicio:   string | null;
  horaFin:      string | null;
  nEquipos:     number;
  nEjecutados:  number;
}

export interface TecnicoActivo {
  idTecnico:      number;
  nombre:         string;
  cargo:          string | null;
  zona:           string | null;
  iniciales:      string;
  estado:         EstadoTecnicoCampo;
  ssoma:          string | null;
  servicioActual?: {
    idServicio:   number;
    numero:       string;
    cliente:      string;
  } | null;
  servicios:      number;           // cantidad del día
  completados:    number;
  enCurso:        number;
  salidaReal:     string | null;    // 'HH:mm'
  salidaProgramada: string | null;
  diferenciaSalidaMin: number | null;
  tiempoCampo:    string;           // "3 h 25 min" desde la salida real, o '—'
  ultimaUbicacion: string | null;
  ultimaActividad: string;          // "hace 5 min" / "Sin posición GPS hoy"
  /** El backend no envía teléfonos en la bandeja: solo llega en el detalle del servicio. */
  telefono:       string | null;
  serviciosDelDia: ServicioDelDiaTecnico[];
}

// ─── Incidencia del Día (tab 4) ─────────────────────────────────────────────
export type ImpactoIncidencia = 'retrasa' | 'detiene';
export type OrigenIncidencia = 'tecnico' | 'asistente' | 'sistema';

export interface IncidenciaDia {
  idIncidencia:   string;           // clave del backend: d<id> demora · i<id> incidencia · a<id> registro del Asistente
  hora:           string;
  tipoCodigo:     string;
  tipoLabel:      string;           // "Tráfico"
  tecnico:        string;
  numeroServicio: string;
  idServicio:     number;
  cliente:        string;
  impacto:        ImpactoIncidencia;
  origen:         OrigenIncidencia;
  duracionMin:    number | null;
  /** Momento de la demora de la app (null en incidencias y registros del Asistente). */
  momento:        string | null;    // 'En ruta (llegar a planta)' | 'Ingreso a planta'
  fase:           FaseDemora | null;
  detalle:        string;
}

export interface TarjetasIncidencias {
  retrasan:             number;
  detienen:             number;
  registradasTecnico:   number;
  registradasAsistente: number;
  total:                number;
}

// ─── Respuesta completa de la bandeja ───────────────────────────────────────
export interface BandejaSeguimientoOperativo {
  kpis:               KpisSeguimientoOperativo;
  vistaPrincipal:     VistaPrincipalSeguimiento;
  serviciosEnCampo:   ServicioEnCampo[];
  totalServicios:     number;
  tecnicosActivos:    TecnicoActivo[];
  incidenciasDia:     IncidenciaDia[];
  tarjetasIncidencias: TarjetasIncidencias;
  /** Pestañas que fallaron al cargar (el resto sigue funcionando). */
  errores:            Partial<Record<ParteBandeja, string>>;
}

export type ParteBandeja = 'vista_principal' | 'servicios' | 'tecnicos' | 'incidencias';

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
  idTecnico:        number | null;
  tecnico:          string;
  cargoTecnico:     string | null;
  telefono:         string | null;
  estado:           EstadoTecnicoCampo;
  horaProgramada:   string | null;  // '08:00'
  horaFinEstimada:  string | null;  // '12:00'
  salidaReal:       string | null;
  puntualidadSalida: 'puntual' | 'tardia' | null;
  horaLlegada?:     string | null;  // de /mapa (hito llegada)
  horaFin?:         string | null;  // de /cierre
  totalEquipos:     number;
  avancePct:        number;
  esFinalizado:     boolean;        // true → se muestra tab Cierre
  ultimaActualizacion: string;      // '10:42:15'
  refrescoSegundos: number;
}

// ─── Tab 1: Resumen ──────────────────────────────────────────────────────
export interface ResponsableServicio {
  idUsuario: number;
  nombre:    string;
  rol:       'principal' | 'apoyo' | 'supervisor';
  cargo:     string | null;
  nota:      string | null;
}

export interface ContactoPlanta {
  nombre:      string;
  cargo:       string | null;
  telefono:    string | null;
  correo:      string | null;
  confirmadoA: string | null;       // hora de la llegada ('HH:mm')
  haceMinutos: number | null;
}

export interface MetricasServicio {
  avancePct:          number;
  equiposCompletados: number;
  equiposTotal:       number;
  demorasIncidencias: number;
  minutosDemora:      number;
  motivoDemora:       string | null;
  alertasActivas:     number;
  minutosServicio:    number;
  minutosEstimados:   number | null;
}

export interface EquipoResumen {
  idEquipo:       number;
  codigo:         string;
  modelo:         string | null;
  serie:          string | null;
  estado:         EstadoEquipoServicio;
  etapaActual:    string | null;
  horaCompletado: string | null;
  observado:      boolean;
}

export interface ResumenServicio {
  codigoProgramacion: string | null;
  expediente:         string | null;
  tipoServicio:       string | null;
  norma:              string | null;
  estadoSsoma:        string | null;
  minutosEstimados:   number | null;
  equiposProgramados: number;
  responsables:       ResponsableServicio[];
  contacto:           ContactoPlanta | null;
  metricas:           MetricasServicio;
  equipos:            EquipoResumen[];
  notaProcedimiento?: string | null;
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
  marca:            string;        // el backend no la envía: queda vacía
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
  nDocumentos:      number;        // certificado preliminar
  nObservaciones:   number;
  nMediciones:      number;
  activo:           boolean;                       // true = equipo En Ejecución (expandido)
}

// ─── Tab 3: Mapa GPS ─────────────────────────────────────────────────────
export type ConexionGps = 'sin_senal' | 'gps_parado' | 'gps_activo';
export type TipoHitoGps = 'salida' | 'pre_llegada' | 'llegada';

export interface PuntoRutaGps {
  lat:  number;
  lng:  number;
  hora: string;                    // 'HH:mm:ss'
}

export interface HitoGps {
  tipo:     TipoHitoGps;
  hora:     string | null;         // null = aún no ocurre
  evento:   string;                // "Salida registrada"
  detalle?: string | null;         // "Total Weight HQ Surco"
  lat:      number | null;         // posición del hito, tomada de la ruta (puede ser null)
  lng:      number | null;
}

export interface DemoraGps {
  lat:         number;
  lng:         number;
  hora:        string;             // 'HH:mm'
  fase:        FaseDemora;
  faseLabel:   string;             // "Demora en ruta" | "Demora en ingreso a planta"
  motivo:      string;
  duracionMin: number;
}

export interface EstadoSenalGps {
  conexion:             ConexionGps;
  activo:               boolean;
  estable:              boolean;
  haceSegundos:         number | null;
  hace:                 string;       // "hace 15 seg" / "Sin posiciones GPS hoy"
  ultimaActualizacion:  string | null;// 'HH:mm:ss'
  precisionMetros:      number | null;
  satelites:            number | null;
  latenciaMs:           number | null;
  mensajeEstado:        string;
}

export interface UltimaUbicacion {
  nombreLugar:      string;           // dirección de la última posición o "lat, lng"
  direccion:        string;           // sede + dirección del cliente
  dentroDelRadio:   boolean;
  distanciaAlCliente: number | null;  // metros
  velocidadKmh:     number | null;
  altitudMsnm:      number | null;
  tiempoEnPunto:    string | null;    // "2h 02min"
  lat:              number | null;
  lng:              number | null;
}

export interface PlantaGps {
  lat:          number;
  lng:          number;
  nombre:       string;
  direccion:    string | null;
  radioM:       number;
  mostrarRadio: boolean;
}

export interface MapaGpsServicio {
  estadoSenal:      EstadoSenalGps;
  ultimaUbicacion:  UltimaUbicacion;
  planta:           PlantaGps | null;
  ruta:             PuntoRutaGps[];
  cronograma:       HitoGps[];
  demoras:          DemoraGps[];
  tienePosiciones:  boolean;
  resumenRuta:      string;
  chipEstadoMapa:   string;           // "En Planta" / "En Ruta"
  estadoServicio:   EstadoTecnicoCampo;
}

// ─── Tab 4: Timeline del Día ──────────────────────────────────────────────
export type TipoEventoTimeline =
  | 'hito_tecnico'       // verde: avances del técnico
  | 'alerta_sistema'     // ámbar: alertas automáticas
  | 'demora_incidente'   // rojo: demoras/incidencias
  | 'registro_asistente' // azul: registros del asistente
  ;

export interface EventoTimeline {
  idEvento:   string;               // clave del backend
  hora:       string;
  tipo:       TipoEventoTimeline;
  titulo:     string;               // incluye "Demora en ruta: …" / "Demora en ingreso a planta: …"
  descripcion?: string | null;
  autor?:     string | null;
  badge?:     string | null;
  vinculo?:   string | null;
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
  idDemora:    string;              // clave del backend (d<id> · i<id> · a<id>)
  hora:        string;
  tipo:        string;
  motivo:      string;              // descripción registrada
  duracionMin: number | null;
  origen:      'tecnico' | 'asistente' | 'sistema';
  detalle?:    string | null;       // quién la registró
  retrasa:     boolean;
  detiene:     boolean;
  nFotos?:     number;              // evidencia adjunta (0 o 1: el backend solo informa si existe)
  /** Momento de la demora de la app ('En ruta (llegar a planta)' | 'Ingreso a planta'); null si no aplica. */
  momento:     string | null;
  fase:        FaseDemora | null;
  /** GPS del técnico al registrar la demora (null si no se envió). */
  lat:         number | null;
  lng:         number | null;
}

// ─── Tab 6: Registrar (HU-53) ─────────────────────────────────────────────
export type ModoRegistro = 'observacion' | 'demora_incidente' | 'cambio_estado_critico';

// ─── Tab 7: Cierre (HU-54, condicional si FINALIZADO) ─────────────────────
export type EstadoEquipoCierre = 'finalizado' | 'parcial' | 'pendiente' | 'reprogramado' | 'anulado';

export interface EquipoCierre {
  idEquipo:        number;
  nombre:          string;          // "EQ-TW-2026-0001 PDX50"
  serie:           string | null;
  tipoServicio:    string | null;
  estado:          EstadoEquipoCierre;
  estadoTexto:     string;
  hora:            string | null;
  informe:         string | null;
  urlInforme:      string | null;
  conObservaciones: boolean;
  info:            string | null;   // "Esperando decisión J.Ops"
  destacado:       boolean;
}

export interface ActaConformidad {
  firmada:       boolean;
  chip:          string;            // "Firmada 12:40" / "Pendiente de firma"
  hora:          string | null;
  firmante:      string | null;
  cargo:         string | null;
  metodo:        string;
  gpsVerificado: boolean;
  gps:           string;
  observaciones: string | null;
}

export interface CierreServicio {
  resultado:       'completado' | 'parcial' | 'cancelado';
  resultadoTexto:  string;          // "COMPLETADO PARCIAL"
  horaFin:         string | null;
  duracionReal:    string;          // "4h 35min" o '—'
  demoraMinutos?:  number | null;   // +35 (vs programado)
  esCompletadoParcial: boolean;     // true si hay equipos sin ejecutar
  equiposFinalizados: number;
  equiposTotal:    number;
  equiposPendientes: number;
  nInformes:       number;
  nDemoras:        number;
  nRegAsistente:   number;
  rol:             string;          // "Líder" | "Asistente"
  tecnico:         string | null;
  subtitulo:       string;          // quién y cómo cerró el servicio
  chipModo:        string;
  equipos:         EquipoCierre[];
  acta:            ActaConformidad | null;
}

// ─── Respuesta completa del detalle ───────────────────────────────────────
export type ParteDetalle = 'resumen' | 'equipos' | 'mapa' | 'timeline' | 'demoras' | 'cierre';

export interface DetalleServicioSeguimiento {
  cabecera:       CabeceraServicio;
  resumen:        ResumenServicio;
  equipos:        EquipoAvance[];
  gps:            MapaGpsServicio;
  timeline:       EventoTimeline[];
  kpisDemoras:    KpisDemoras;
  demoras:        DemoraIncidenciaServicio[];
  cierre?:        CierreServicio | null;  // solo si esFinalizado
  /** Secciones que fallaron al cargar (la cabecera sí cargó); el mensaje viene del backend. */
  errores:        Partial<Record<ParteDetalle, string>>;
}
