// Módulo 11 Control de Campo — Seguimiento Operativo (HU-51 a HU-54)
// DTOs tal como los devuelve el backend (JSON camelCase) dentro del sobre
// { idTipoMensaje, mensaje, datos }. Espejo de:
//   TW.Intranet.Aplicacion/Dtos/SeguimientoOperativoDtos.cs
//   TW.Intranet.Aplicacion/Dtos/DetalleServicioRutaDtos.cs
// Los modelos de la UI (seguimiento-operativo.model.ts) se arman a partir de estos
// con las funciones puras de seguimiento-operativo-mapper.ts.

export interface RespuestaSeguimientoApi<T> {
  idTipoMensaje: number;     // 1 regla de negocio · 2 éxito · 3 error
  mensaje:       string;
  datos:         T | null;
}

// ═══════════════════════ BANDEJA (HU-51) ═══════════════════════════════════
// GET /api/operaciones/seguimiento · /servicios · /tecnicos · /incidencias

export interface KpisBandejaApi {
  programados:        number;
  tecnicosEnRuta:     number;
  enPlanta:           number;
  enEjecucion:        number;
  conDemoraIncidente: number;
  finalizados:        number;
  sinSalir:           number;
  serviciosFiltrados: number;
  tecnicosActivos:    number;
  incidenciasDelDia:  number;
  actualizado:        string;   // 'HH:mm' (hora de Lima)
  refrescoSegundos:   number;
}

export interface PinMapaApi {
  idUsuario:        number;
  tecnico:          string;
  iniciales:        string;
  estado:           string;
  latitud:          number | null;
  longitud:         number | null;
  direccion:        string;
  minutosUbicacion: number | null;
  idOs:             number | null;
  numeroOs:         string | null;
  cliente:          string | null;
}

export interface AlertaSeguimientoApi {
  clave:     string;
  tipo:      string;   // perdida_contacto | gps_parado | sin_ingreso_post_llegada | sin_iniciar_servicio | proximidad | incidente
  severidad: string;   // critica | advertencia | info
  titulo:    string;
  detalle:   string;
  minutos:   number;
  nueva:     boolean;
  idUsuario: number;
  tecnico:   string;
  idOs:      number;
  numeroOs:  string;
}

export interface TotalesAlertasApi { total: number; nuevas: number; criticas: number; }

export interface HitoEsperadoApi {
  idOs:      number;
  numeroOs:  string;
  tipo:      string;   // salida | llegada | inicio | termino | retorno
  hora:      string;   // 'HH:mm'
  texto:     string;
  detalle:   string;
  atrasado:  boolean;
  idTecnico: number | null;
}

export interface ResumenHitosApi { todosOcurrieron: boolean; pendientes: number; }

export interface ResumenSeguimientoApi {
  kpis:           KpisBandejaApi;
  pines:          PinMapaApi[];
  alertas:        AlertaSeguimientoApi[];
  totalesAlertas: TotalesAlertasApi;
  hitos:          HitoEsperadoApi[];
  resumenHitos:   ResumenHitosApi;
}

export interface ServicioSeguimientoApi {
  idOs:             number;
  numero:           string;
  tipo:             string;
  propuesta:        string | null;
  cliente:          string;
  ruc:              string | null;
  idTecnico:        number | null;
  tecnico:          string | null;
  iniciales:        string | null;
  estado:           string;
  zona:             string | null;
  horaInicio:       string | null;   // hora PROGRAMADA 'HH:mm'
  ultimaUbicacion:  string | null;
  minutosUbicacion: number | null;
  equipos:          number;
  ejecutados:       number;
  avancePct:        number;
}

export interface ServiciosSeguimientoApi {
  total:        number;
  pagina:       number;
  tamano:       number;
  totalPaginas: number;
  actualizado:  string | null;
  filas:        ServicioSeguimientoApi[];
}

export interface ServicioDeTecnicoApi {
  idOs:       number;
  numero:     string;
  cliente:    string;
  estado:     string;
  horaInicio: string | null;
  horaFin:    string | null;
  rol:        string;   // principal | apoyo
  equipos:    number;
  ejecutados: number;
}

export interface TecnicoSeguimientoApi {
  idUsuario:           number;
  tecnico:             string;
  iniciales:           string;
  cargo:               string | null;
  zona:                string | null;
  estado:              string;
  ssoma:               string | null;
  servicios:           number;
  completados:         number;
  enCurso:             number;
  salidaReal:          string | null;   // 'HH:mm'
  salidaProgramada:    string | null;
  diferenciaSalidaMin: number | null;
  ultimaUbicacion:     string | null;
  minutosUbicacion:    number | null;
  serviciosDelDia:     ServicioDeTecnicoApi[];
}

export interface TecnicosSeguimientoApi {
  total:                 number;
  adicionalesSinIniciar: number;
  actualizado:           string | null;
  tecnicos:              TecnicoSeguimientoApi[];
}

export interface TarjetasIncidenciasApi {
  retrasan:             number;
  detienen:             number;
  registradasTecnico:   number;
  registradasAsistente: number;
  total:                number;
}

export interface IncidenciaSeguimientoApi {
  clave:       string;
  hora:        string;           // 'HH:mm'
  idUsuario:   number;
  tecnico:     string;
  iniciales:   string;
  idOs:        number;
  numero:      string;
  cliente:     string;
  tipoCodigo:  string;
  tipo:        string;
  descripcion: string | null;
  duracionMin: number | null;
  impacto:     string;           // retrasa | detiene
  origen:      string;           // tecnico | asistente
  momento:     string | null;    // 'En ruta (llegar a planta)' | 'Ingreso a planta' | null
}

export interface IncidenciasSeguimientoApi {
  tarjetas: TarjetasIncidenciasApi;
  filas:    IncidenciaSeguimientoApi[];
}

// ═══════════════════════ DETALLE DEL SERVICIO (HU-52 / HU-54) ═══════════════
// GET /api/operaciones/seguimiento/servicios/{idOs} y subrutas

export interface CabeceraServicioApi {
  idOs:               number;
  numero:             string;
  tipo:               string;
  propuesta:          string | null;
  codigoProgramacion: string | null;
  expediente:         string | null;
  idCliente:          number;
  cliente:            string;
  ruc:                string | null;
  sede:               string | null;
  direccionSede:      string | null;
  tipoServicio:       string | null;
  minutosEstimados:   number | null;
  equiposProgramados: number;
  norma:              string | null;
  notaProcedimiento:  string | null;
  idTecnicoLider:     number | null;
  tecnicoLider:       string | null;
  cargoTecnico:       string | null;
  estadoSsoma:        string | null;
  horaInicio:         string | null;   // programada 'HH:mm'
  horaFin:            string | null;   // programada (estimada) 'HH:mm'
  salidaReal:         string | null;
  puntualidadSalida:  string | null;   // puntual | tardia
  estado:             string;
  fechaEjecucion:     string;
  ultimaActualizacion: string;         // 'HH:mm:ss'
  refrescoSegundos:   number;
  mostrarCierre:      boolean;
  telefonoTecnico:    string | null;
}

export interface MetricasServicioApi {
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

export interface EquipoResumenApi {
  idEquipo:        number;
  codigo:          string;
  modelo:          string | null;
  serie:           string | null;
  estadoEjecucion: string;          // pendiente | en_proceso | ejecutado | observado
  etapaActual:     string | null;
  horaCompletado:  string | null;
  observado:       boolean;
}

export interface ResponsableServicioApi {
  idUsuario: number;
  nombre:    string;
  rol:       string;                // principal | apoyo | supervisor
  cargo:     string | null;
  nota:      string | null;
}

export interface ContactoPlantaApi {
  nombre:      string;
  cargo:       string | null;
  telefono:    string | null;
  correo:      string | null;
  confirmadoA: string | null;
  haceMinutos: number | null;
}

export interface DetalleServicioApi {
  cabecera:     CabeceraServicioApi;
  metricas:     MetricasServicioApi;
  equipos:      EquipoResumenApi[];
  responsables: ResponsableServicioApi[];
  contacto:     ContactoPlantaApi | null;
}

// ─── /avance ────────────────────────────────────────────────────────────────
export interface EtapaEquipoApi {
  etapa:  string;                   // limpieza | desmontaje | pruebas | montaje | cierre
  orden:  number;
  estado: string;                   // pendiente | en_curso | completada
  hora:   string | null;
}

export interface EquipoAvanceApi {
  idEquipo:              number;
  codigo:                string;
  modelo:                string | null;
  serie:                 string | null;
  estado:                string;    // pendiente | en_proceso | ejecutado | observado
  fotos:                 number;
  ensayos:               number;
  certificadoPreliminar: number;
  observaciones:         number;
  mediciones:            number;
  iniciado:              string | null;
  finalizado:            string | null;
  minutos:               number | null;
  etapas:                EtapaEquipoApi[];
}

export interface AvanceServicioApi {
  equiposCompletados: number;
  equiposTotal:       number;
  equipos:            EquipoAvanceApi[];
}

// ─── /mapa ──────────────────────────────────────────────────────────────────
export interface PanelGpsApi {
  idOs:                number;
  estado:              string;
  tecnico:             string | null;
  cliente:             string | null;
  sede:                string | null;
  direccionSede:       string | null;
  latSede:             number | null;
  lonSede:             number | null;
  radioProximidadM:    number;
  mostrarRadio:        boolean;
  latitud:             number | null;
  longitud:            number | null;
  ultimaUbicacion:     string | null;
  distanciaM:          number | null;
  ultimaActualizacion: string | null;   // 'HH:mm:ss'
  segundosDesdeUltima: number | null;
  conexion:            string;          // sin_senal | gps_parado | gps_activo
  minutosEnPunto:      number;
  precisionM:          number | null;
  velocidadKmh:        number | null;
  altitudM:            number | null;
  satelites:           number | null;
  latenciaMs:          number | null;
}

export interface PuntoRutaApi { latitud: number; longitud: number; hora: string; }  // hora 'HH:mm:ss', orden cronológico
export interface HitoGpsApi   { hito: string; hora: string | null; }                // salida | pre_llegada | llegada
export interface DemoraMapaApi {
  latitud:     number;
  longitud:    number;
  hora:        string;
  fase:        string;             // llegada (en ruta) | ingreso (ingreso a planta)
  motivo:      string;
  duracionMin: number;
}

export interface MapaServicioApi {
  panel:      PanelGpsApi;
  ruta:       PuntoRutaApi[];
  cronograma: HitoGpsApi[];
  demoras?:   DemoraMapaApi[] | null;
}

// ─── /timeline ──────────────────────────────────────────────────────────────
export interface ConteoTimelineApi { hitos: number; alertas: number; incidencias: number; asistente: number; total: number; }
export interface EventoTimelineApi {
  hora:        string;             // 'HH:mm'
  categoria:   string;             // hito | alerta | incidencia | asistente
  origen:      string;             // tecnico | sistema | asistente
  titulo:      string;
  detalle:     string | null;
  clave:       string;
  badge:       string | null;
  registrador: string | null;
  vinculo:     string | null;
}
export interface TimelineServicioApi { conteos: ConteoTimelineApi; eventos: EventoTimelineApi[]; }

// ─── /incidencias ───────────────────────────────────────────────────────────
export interface KpisIncidenciasServicioApi { total: number; retrasan: number; detienen: number; porTecnico: number; porAsistente: number; }
export interface IncidenciaServicioApi {
  clave:         string;
  hora:          string;
  tipoCodigo:    string;
  tipo:          string;
  descripcion:   string | null;
  duracionMin:   number | null;
  impacto:       string;           // retrasa | detiene
  origen:        string;           // tecnico | asistente
  registrador:   string | null;
  evidencia:     string | null;
  tieneEvidencia: boolean;
  momento:       string | null;
  latitud:       number | null;
  longitud:      number | null;
}
export interface IncidenciasServicioApi { kpis: KpisIncidenciasServicioApi; filas: IncidenciaServicioApi[]; }

// ─── /cierre ────────────────────────────────────────────────────────────────
export interface CabeceraCierreApi {
  resultado:           string;     // completado | parcial | cancelado
  resultadoTexto:      string;
  finalizadoHora:      string | null;
  duracionMin:         number | null;
  minutosEstimados:    number | null;
  diferenciaMin:       number | null;
  idTecnico:           number | null;
  tecnico:             string | null;
  iniciales:           string | null;
  rol:                 string;
  cerradoPor:          string;     // tecnico | asistente
  subtitulo:           string;
  equiposFinalizados:  number;
  equiposTotal:        number;
  informes:            number;
  demorasIncidencias:  number;
  registrosAsistente:  number;
  equiposParciales:    number;
  equiposPendientes:   number;
  equiposReprogramados: number;
  equiposAnulados:     number;
  estadoCabecera:      string;
  modoAuditoria:       boolean;
  registrarHabilitado: boolean;
  tooltipRegistrar:    string;
  chipModo:            string;
  textoActualizacion:  string;
}

export interface EquipoCierreApi {
  idEquipo:        number;
  nombre:          string;
  serie:           string | null;
  tipoServicio:    string | null;
  estado:          string;         // finalizado | parcial | pendiente | reprogramado | anulado
  estadoTexto:     string;
  hora:            string | null;
  informe:         string | null;
  urlInforme:      string | null;
  conObservaciones: boolean;
  info:            string | null;
  vinculo:         string | null;
  destacado:       boolean;
}

export interface ActaConformidadApi {
  hora:          string | null;
  estado:        string;
  chip:          string;
  firmante:      string | null;
  cargo:         string | null;
  metodo:        string;
  tipo:          string;
  gpsVerificado: boolean;
  gps:           string;
  urlFirma:      string | null;
  observaciones: string | null;
  nota:          string;
}

export interface PieCierreApi { idExpediente: number | null; expediente: string | null; documentos: number; eventosAuditoria: number; }
export interface OrdenCierreApi { numero: string; estado: string; certificado: string | null; fechaEmision: string | null; }

export interface CierreServicioApi {
  cabecera: CabeceraCierreApi;
  equipos:  EquipoCierreApi[];
  acta:     ActaConformidadApi | null;
  pie:      PieCierreApi;
  ordenes:  OrdenCierreApi[];
}
