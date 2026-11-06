// Mapper del Módulo 11 Control de Campo — Seguimiento Operativo (HU-51 a HU-54).
//
// Funciones PURAS (sin Angular, sin HTTP, sin fecha del sistema) que convierten los DTOs
// del backend (seguimiento-operativo-api.model.ts) en los modelos de la UI
// (seguimiento-operativo.model.ts). Están separadas del servicio para poder probarlas solas.

import {
  AlertaSeguimientoApi, AvanceServicioApi, CierreServicioApi, DemoraMapaApi, DetalleServicioApi,
  EquipoAvanceApi, EventoTimelineApi, HitoEsperadoApi, IncidenciaSeguimientoApi, IncidenciaServicioApi,
  IncidenciasSeguimientoApi, IncidenciasServicioApi, MapaServicioApi, PinMapaApi, ResumenSeguimientoApi,
  ServicioSeguimientoApi, ServiciosSeguimientoApi, TecnicoSeguimientoApi, TecnicosSeguimientoApi,
  TimelineServicioApi,
} from '../models/seguimiento-operativo-api.model';
import {
  ActaConformidad, AlertaCampo, BandejaSeguimientoOperativo, CabeceraServicio, CierreServicio,
  ConexionGps, DemoraGps, DemoraIncidenciaServicio, DetalleServicioSeguimiento, EquipoAvance,
  EquipoCierre, EquipoResumen, EstadoEquipoCierre, EstadoEquipoServicio, EstadoEtapaEquipo,
  EstadoTecnicoCampo, EtapaEquipo, EventoTimeline, FaseDemora, HitoEsperado, HitoGps,
  IncidenciaDia, ImpactoIncidencia, KpisDemoras, KpisSeguimientoOperativo, MapaGpsServicio,
  NombreEtapaEquipo, OrigenIncidencia, ParteBandeja, ParteDetalle, PlantaGps, PuntoMapa,
  PuntoRutaGps, ResumenServicio, SeveridadAlerta, ServicioDelDiaTecnico, ServicioEnCampo,
  TarjetasIncidencias, TecnicoActivo, TipoAlertaCampo, TipoEventoTimeline, TipoHitoGps,
  VistaPrincipalSeguimiento,
} from '../models/seguimiento-operativo.model';

// ═══════════════════════════════════════════════════════════════════════════
// Constantes visuales (las usan el mapa y las leyendas)
// ═══════════════════════════════════════════════════════════════════════════

/** Colores de la leyenda de la pantalla: en ruta azul, en planta/ejecución verde, con demora ámbar,
 *  con incidente crítico rojo, finalizado gris oscuro, sin salir gris claro. */
export const COLOR_ESTADO_CAMPO: Readonly<Record<EstadoTecnicoCampo, string>> = {
  sin_salir:     '#9CA3AF',
  en_ruta:       '#2563EB',
  en_planta:     '#10B981',
  en_ejecucion:  '#10B981',
  con_demora:    '#F59E0B',
  con_incidente: '#DC2626',
  finalizado:    '#4B5563',
};

export const COLOR_DEMORA_EN_RUTA = '#F59E0B';
export const COLOR_DEMORA_INGRESO = '#7C3AED';

const ESTADOS_CAMPO: readonly EstadoTecnicoCampo[] =
  ['sin_salir', 'en_ruta', 'en_planta', 'en_ejecucion', 'con_demora', 'con_incidente', 'finalizado'];

const ETAPAS: readonly NombreEtapaEquipo[] = ['LIMPIEZA', 'DESMONTAJE', 'PRUEBAS', 'MONTAJE', 'CIERRE'];

/** Si el hito GPS no tiene una posición de la ruta a menos de estos minutos, no se dibuja en el mapa. */
const TOLERANCIA_HITO_MIN = 10;

// ═══════════════════════════════════════════════════════════════════════════
// Utilidades de formato
// ═══════════════════════════════════════════════════════════════════════════

/** Convierte a número finito o null (el JSON del backend puede traer decimales como número o texto). */
export function numeroONulo(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizarEstadoCampo(s: string | null | undefined): EstadoTecnicoCampo {
  const v = (s ?? '').trim().toLowerCase() as EstadoTecnicoCampo;
  return ESTADOS_CAMPO.includes(v) ? v : 'sin_salir';
}

export function etiquetaEstadoCampo(e: EstadoTecnicoCampo): string {
  switch (e) {
    case 'sin_salir':     return 'Sin salir';
    case 'en_ruta':       return 'En ruta';
    case 'en_planta':     return 'En planta';
    case 'en_ejecucion':  return 'En ejecución';
    case 'con_demora':    return 'Con demora';
    case 'con_incidente': return 'Incidente crítico';
    case 'finalizado':    return 'Finalizado';
  }
}

/** 'HH:mm' o 'HH:mm:ss' → minutos desde medianoche (null si no tiene ese formato). */
export function horaAMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** "hace 5 min", "hace 1 h 5 min". Sin dato → `sinDato`. */
export function formatearHaceMinutos(min: number | null | undefined, sinDato = 'Sin posición GPS hoy'): string {
  if (min === null || min === undefined || !Number.isFinite(min)) return sinDato;
  const m = Math.max(0, Math.floor(min));
  if (m < 1) return 'hace menos de 1 min';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `hace ${h} h` : `hace ${h} h ${r} min`;
}

/** "hace 15 seg", y desde 1 minuto "hace 3 min". Sin dato → "Sin posiciones GPS hoy". */
export function formatearHaceSegundos(seg: number | null | undefined): string {
  if (seg === null || seg === undefined || !Number.isFinite(seg)) return 'Sin posiciones GPS hoy';
  const s = Math.max(0, Math.floor(seg));
  if (s < 60) return `hace ${s} seg`;
  return formatearHaceMinutos(Math.floor(s / 60));
}

/** "Hace 12 min" (para las alertas). */
export function formatearHaceAlerta(min: number | null | undefined): string {
  const t = formatearHaceMinutos(min, '—');
  return t === '—' ? t : t.charAt(0).toUpperCase() + t.slice(1);
}

/** Duración: 45 → "45 min", 122 → "2h 02min". Sin dato → "—". */
export function formatearDuracionMin(min: number | null | undefined): string {
  if (min === null || min === undefined || !Number.isFinite(min)) return '—';
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}min`;
}

/** Distancia al cliente: 250 → "250 m", 1530 → "1.5 km". Sin dato → "—". */
export function formatearDistancia(m: number | null | undefined): string {
  if (m === null || m === undefined || !Number.isFinite(m)) return '—';
  const v = Math.max(0, Math.round(m));
  return v < 1000 ? `${v} m` : `${(v / 1000).toFixed(1)} km`;
}

/** Tiempo en campo desde la salida real ('HH:mm') hasta "ahora" ('HH:mm', hora de Lima). */
export function calcularTiempoCampo(salidaReal: string | null | undefined, ahora: string | null | undefined): string {
  const ini = horaAMinutos(salidaReal), fin = horaAMinutos(ahora);
  if (ini === null || fin === null || fin < ini) return '—';
  const m = fin - ini;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export function tipoDesdeNumero(numero: string | null | undefined): 'OS' | 'OM' {
  return (numero ?? '').trim().toUpperCase().startsWith('OM') ? 'OM' : 'OS';
}

function normalizarTipoOsOm(tipo: string | null | undefined, numero: string | null | undefined): 'OS' | 'OM' {
  const t = (tipo ?? '').trim().toUpperCase();
  return t === 'OM' || t === 'OS' ? t : tipoDesdeNumero(numero);
}

function texto(v: string | null | undefined, porDefecto = ''): string {
  const t = (v ?? '').trim();
  return t === '' ? porDefecto : t;
}

function textoONulo(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

function faseDesdeMomento(momento: string | null | undefined): FaseDemora | null {
  const m = (momento ?? '').toLowerCase();
  if (m.includes('ingreso')) return 'ingreso';
  if (m.includes('ruta') || m.includes('llegar')) return 'llegada';
  return null;
}

export function etiquetaFaseDemora(fase: FaseDemora): string {
  return fase === 'ingreso' ? 'Demora en ingreso a planta' : 'Demora en ruta';
}

// ═══════════════════════════════════════════════════════════════════════════
// BANDEJA (HU-51)
// ═══════════════════════════════════════════════════════════════════════════

export function adaptarPin(p: PinMapaApi): PuntoMapa {
  const lat = numeroONulo(p.latitud), lng = numeroONulo(p.longitud);
  const conGps = lat !== null && lng !== null && !(lat === 0 && lng === 0);
  return {
    idServicio: p.idOs ?? null,
    numero:     textoONulo(p.numeroOs),
    tipo:       tipoDesdeNumero(p.numeroOs),
    idTecnico:  p.idUsuario,
    tecnico:    texto(p.tecnico, 'Técnico'),
    iniciales:  texto(p.iniciales, iniciales(p.tecnico)),
    estado:     normalizarEstadoCampo(p.estado),
    cliente:    textoONulo(p.cliente),
    direccion:  texto(p.direccion),
    minutosUbicacion: p.minutosUbicacion ?? null,
    hace:       formatearHaceMinutos(p.minutosUbicacion, 'Sin posición GPS hoy'),
    lat:        conGps ? lat : null,
    lng:        conGps ? lng : null,
  };
}

export function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const a = partes[0][0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] ?? '');
  return (a + b).toUpperCase();
}

function normalizarTipoAlerta(t: string | null | undefined): TipoAlertaCampo {
  const v = (t ?? '').trim().toLowerCase();
  const validos: readonly TipoAlertaCampo[] = [
    'perdida_contacto', 'gps_parado', 'sin_ingreso_post_llegada', 'proximidad', 'sin_iniciar_servicio', 'incidente',
  ];
  return (validos as readonly string[]).includes(v) ? (v as TipoAlertaCampo) : 'otra';
}

function normalizarSeveridad(s: string | null | undefined): SeveridadAlerta {
  const v = (s ?? '').trim().toLowerCase();
  return v === 'critica' || v === 'advertencia' ? v : 'info';
}

export function adaptarAlerta(a: AlertaSeguimientoApi): AlertaCampo {
  return {
    idAlerta:       a.clave,
    tipo:           normalizarTipoAlerta(a.tipo),
    tituloCorto:    texto(a.titulo, 'Alerta'),
    detalle:        texto(a.detalle),
    tecnico:        texto(a.tecnico),
    numeroServicio: texto(a.numeroOs),
    idServicio:     a.idOs,
    severidad:      normalizarSeveridad(a.severidad),
    hace:           formatearHaceAlerta(a.minutos),
    nueva:          !!a.nueva,
  };
}

export function adaptarHito(h: HitoEsperadoApi): HitoEsperado {
  return {
    idHito:           `${h.idOs}:${h.tipo}`,
    tipo:             h.tipo,
    hora:             texto(h.hora, '—'),
    titulo:           texto(h.texto),
    subtitulo:        texto(h.detalle),
    idServicio:       h.idOs,
    numeroServicio:   texto(h.numeroOs),
    requiereAtencion: !!h.atrasado,
  };
}

/** KPIs + Vista Principal (GET /api/operaciones/seguimiento). */
export function adaptarResumenBandeja(api: ResumenSeguimientoApi): {
  kpis: KpisSeguimientoOperativo; vistaPrincipal: VistaPrincipalSeguimiento;
} {
  const k = api.kpis;
  const kpis: KpisSeguimientoOperativo = {
    programadas:      k.programados,
    tecnicos:         k.tecnicosActivos,
    enRuta:           k.tecnicosEnRuta,
    enPlanta:         k.enPlanta,
    enEjecucion:      k.enEjecucion,
    conDemora:        k.conDemoraIncidente,
    finalizados:      k.finalizados,
    sinSalir:         k.sinSalir,
    incidenciasDia:   k.incidenciasDelDia,
    refrescoSegundos: k.refrescoSegundos > 0 ? k.refrescoSegundos : 30,
  };
  const totales = api.totalesAlertas ?? { total: api.alertas.length, nuevas: 0, criticas: 0 };
  const rh = api.resumenHitos ?? { todosOcurrieron: api.hitos.length === 0, pendientes: api.hitos.length };
  const vistaPrincipal: VistaPrincipalSeguimiento = {
    mapa:                 api.pines.map(adaptarPin),
    alertas:              api.alertas.map(adaptarAlerta),
    totalAlertas:         totales.total,
    alertasNuevas:        totales.nuevas,
    alertasCriticas:      totales.criticas,
    hitos:                api.hitos.map(adaptarHito),
    todosHitosOcurrieron: !!rh.todosOcurrieron,
    hitosPendientes:      rh.pendientes,
    ultimaActualizacion:  texto(k.actualizado, '—'),
  };
  return { kpis, vistaPrincipal };
}

export function adaptarServicio(s: ServicioSeguimientoApi): ServicioEnCampo {
  return {
    idServicio:      s.idOs,
    numero:          texto(s.numero),
    tipo:            normalizarTipoOsOm(s.tipo, s.numero),
    propuesta:       textoONulo(s.propuesta),
    cliente:         texto(s.cliente),
    zona:            textoONulo(s.zona),
    idTecnico:       s.idTecnico ?? null,
    tecnico:         texto(s.tecnico, 'Sin técnico'),
    estado:          normalizarEstadoCampo(s.estado),
    horaProgramada:  textoONulo(s.horaInicio),
    avancePct:       Math.min(100, Math.max(0, Math.round(s.avancePct ?? 0))),
    nEquipos:        s.equipos,
    nEjecutados:     s.ejecutados,
    ultimaUbicacion: textoONulo(s.ultimaUbicacion),
    ultimaActividad: formatearHaceMinutos(s.minutosUbicacion, '—'),
  };
}

export function adaptarServicios(api: ServiciosSeguimientoApi): ServicioEnCampo[] {
  return api.filas.map(adaptarServicio);
}

function adaptarServicioDelDia(s: TecnicoSeguimientoApi['serviciosDelDia'][number]): ServicioDelDiaTecnico {
  return {
    idServicio:  s.idOs,
    numero:      texto(s.numero),
    cliente:     texto(s.cliente),
    estado:      normalizarEstadoCampo(s.estado),
    rol:         texto(s.rol, 'principal'),
    horaInicio:  textoONulo(s.horaInicio),
    horaFin:     textoONulo(s.horaFin),
    nEquipos:    s.equipos,
    nEjecutados: s.ejecutados,
  };
}

/** El servicio "actual" del técnico es el más urgente de su día: el primero con su mismo estado
 *  (el backend ordena por hora de inicio), o el primero si ninguno coincide. */
export function servicioActualDeTecnico(
  estadoTecnico: EstadoTecnicoCampo, servicios: ServicioDelDiaTecnico[],
): { idServicio: number; numero: string; cliente: string } | null {
  const s = servicios.find(x => x.estado === estadoTecnico) ?? servicios[0];
  return s ? { idServicio: s.idServicio, numero: s.numero, cliente: s.cliente } : null;
}

export function adaptarTecnico(t: TecnicoSeguimientoApi, ahora: string | null): TecnicoActivo {
  const estado = normalizarEstadoCampo(t.estado);
  const serviciosDelDia = (t.serviciosDelDia ?? []).map(adaptarServicioDelDia);
  return {
    idTecnico:           t.idUsuario,
    nombre:              texto(t.tecnico, 'Técnico'),
    cargo:               textoONulo(t.cargo),
    zona:                textoONulo(t.zona),
    iniciales:           texto(t.iniciales, iniciales(t.tecnico)),
    estado,
    ssoma:               textoONulo(t.ssoma),
    servicioActual:      servicioActualDeTecnico(estado, serviciosDelDia),
    servicios:           t.servicios,
    completados:         t.completados,
    enCurso:             t.enCurso,
    salidaReal:          textoONulo(t.salidaReal),
    salidaProgramada:    textoONulo(t.salidaProgramada),
    diferenciaSalidaMin: t.diferenciaSalidaMin ?? null,
    tiempoCampo:         calcularTiempoCampo(t.salidaReal, ahora),
    ultimaUbicacion:     textoONulo(t.ultimaUbicacion),
    ultimaActividad:     formatearHaceMinutos(t.minutosUbicacion),
    telefono:            null,
    serviciosDelDia,
  };
}

export function adaptarTecnicos(api: TecnicosSeguimientoApi): TecnicoActivo[] {
  return api.tecnicos.map(t => adaptarTecnico(t, api.actualizado));
}

function normalizarImpacto(i: string | null | undefined): ImpactoIncidencia {
  return (i ?? '').trim().toLowerCase() === 'detiene' ? 'detiene' : 'retrasa';
}

function normalizarOrigen(o: string | null | undefined): OrigenIncidencia {
  const v = (o ?? '').trim().toLowerCase();
  return v === 'asistente' || v === 'sistema' ? v : 'tecnico';
}

export function adaptarIncidencia(i: IncidenciaSeguimientoApi): IncidenciaDia {
  return {
    idIncidencia:   i.clave,
    hora:           texto(i.hora, '—'),
    tipoCodigo:     texto(i.tipoCodigo),
    tipoLabel:      texto(i.tipo, 'Incidencia'),
    tecnico:        texto(i.tecnico),
    numeroServicio: texto(i.numero),
    idServicio:     i.idOs,
    cliente:        texto(i.cliente),
    impacto:        normalizarImpacto(i.impacto),
    origen:         normalizarOrigen(i.origen),
    duracionMin:    i.duracionMin ?? null,
    momento:        textoONulo(i.momento),
    fase:           faseDesdeMomento(i.momento),
    detalle:        texto(i.descripcion),
  };
}

export function adaptarIncidencias(api: IncidenciasSeguimientoApi): {
  filas: IncidenciaDia[]; tarjetas: TarjetasIncidencias;
} {
  const t = api.tarjetas;
  return {
    filas: api.filas.map(adaptarIncidencia),
    tarjetas: {
      retrasan: t.retrasan, detienen: t.detienen, registradasTecnico: t.registradasTecnico,
      registradasAsistente: t.registradasAsistente, total: t.total,
    },
  };
}

export interface PartesBandejaApi {
  resumen:     ResumenSeguimientoApi;
  servicios?:  ServiciosSeguimientoApi | null;
  tecnicos?:   TecnicosSeguimientoApi | null;
  incidencias?: IncidenciasSeguimientoApi | null;
  errores?:    Partial<Record<ParteBandeja, string>>;
}

/** Arma la bandeja completa a partir de las 4 respuestas. Las pestañas que no llegaron quedan vacías
 *  (y su mensaje de error en `errores`); el resumen es obligatorio porque trae los KPIs. */
export function ensamblarBandeja(p: PartesBandejaApi): BandejaSeguimientoOperativo {
  const { kpis, vistaPrincipal } = adaptarResumenBandeja(p.resumen);
  const inc = p.incidencias ? adaptarIncidencias(p.incidencias) : null;
  return {
    kpis,
    vistaPrincipal,
    serviciosEnCampo:    p.servicios ? adaptarServicios(p.servicios) : [],
    totalServicios:      p.servicios?.total ?? 0,
    tecnicosActivos:     p.tecnicos ? adaptarTecnicos(p.tecnicos) : [],
    incidenciasDia:      inc?.filas ?? [],
    tarjetasIncidencias: inc?.tarjetas ?? { retrasan: 0, detienen: 0, registradasTecnico: 0, registradasAsistente: 0, total: 0 },
    errores:             p.errores ?? {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE DEL SERVICIO (HU-52)
// ═══════════════════════════════════════════════════════════════════════════

export function normalizarEstadoEquipo(e: string | null | undefined): EstadoEquipoServicio {
  switch ((e ?? '').trim().toLowerCase()) {
    case 'ejecutado':
    case 'finalizado':    return 'finalizado';
    case 'en_proceso':
    case 'en_ejecucion':  return 'en_ejecucion';
    case 'observado':
    case 'parcial':       return 'parcial';
    case 'reprogramado':  return 'reprogramado';
    case 'anulado':       return 'anulado';
    default:              return 'pendiente';
  }
}

function normalizarEstadoEquipoCierre(e: string | null | undefined): EstadoEquipoCierre {
  const v = (e ?? '').trim().toLowerCase();
  return v === 'finalizado' || v === 'parcial' || v === 'reprogramado' || v === 'anulado' ? v : 'pendiente';
}

function normalizarRol(r: string | null | undefined): 'principal' | 'apoyo' | 'supervisor' {
  const v = (r ?? '').trim().toLowerCase();
  return v === 'apoyo' || v === 'supervisor' ? v : 'principal';
}

function adaptarEquipoResumen(e: DetalleServicioApi['equipos'][number]): EquipoResumen {
  return {
    idEquipo:       e.idEquipo,
    codigo:         texto(e.codigo),
    modelo:         textoONulo(e.modelo),
    serie:          textoONulo(e.serie),
    estado:         normalizarEstadoEquipo(e.estadoEjecucion),
    etapaActual:    textoONulo(e.etapaActual),
    horaCompletado: textoONulo(e.horaCompletado),
    observado:      !!e.observado,
  };
}

/** Cabecera fija del modal. `horaLlegada` (de /mapa) y `horaFin` (de /cierre) son opcionales. */
export function adaptarCabecera(
  d: DetalleServicioApi, extras: { horaLlegada?: string | null; horaFin?: string | null } = {},
): CabeceraServicio {
  const c = d.cabecera;
  const puntualidad = (c.puntualidadSalida ?? '').toLowerCase();
  return {
    idServicio:        c.idOs,
    numero:            texto(c.numero),
    tipo:              normalizarTipoOsOm(c.tipo, c.numero),
    numeroPropuesta:   textoONulo(c.propuesta),
    cliente:           texto(c.cliente),
    sede:              texto(c.sede, '—'),
    direccion:         textoONulo(c.direccionSede),
    idTecnico:         c.idTecnicoLider ?? null,
    tecnico:           texto(c.tecnicoLider, 'Sin técnico asignado'),
    cargoTecnico:      textoONulo(c.cargoTecnico),
    telefono:          textoONulo(c.telefonoTecnico),
    estado:            normalizarEstadoCampo(c.estado),
    horaProgramada:    textoONulo(c.horaInicio),
    horaFinEstimada:   textoONulo(c.horaFin),
    salidaReal:        textoONulo(c.salidaReal),
    puntualidadSalida: puntualidad === 'puntual' || puntualidad === 'tardia' ? puntualidad : null,
    horaLlegada:       extras.horaLlegada ?? null,
    horaFin:           extras.horaFin ?? null,
    totalEquipos:      d.metricas.equiposTotal,
    avancePct:         d.metricas.avancePct,
    esFinalizado:      !!c.mostrarCierre,
    ultimaActualizacion: texto(c.ultimaActualizacion, '—'),
    refrescoSegundos:  c.refrescoSegundos > 0 ? c.refrescoSegundos : 15,
  };
}

export function adaptarResumenServicio(d: DetalleServicioApi): ResumenServicio {
  const c = d.cabecera, m = d.metricas;
  return {
    codigoProgramacion: textoONulo(c.codigoProgramacion),
    expediente:         textoONulo(c.expediente),
    tipoServicio:       textoONulo(c.tipoServicio),
    norma:              textoONulo(c.norma),
    estadoSsoma:        textoONulo(c.estadoSsoma),
    minutosEstimados:   c.minutosEstimados ?? null,
    equiposProgramados: c.equiposProgramados,
    responsables: d.responsables.map(r => ({
      idUsuario: r.idUsuario, nombre: texto(r.nombre), rol: normalizarRol(r.rol),
      cargo: textoONulo(r.cargo), nota: textoONulo(r.nota),
    })),
    contacto: d.contacto ? {
      nombre: texto(d.contacto.nombre), cargo: textoONulo(d.contacto.cargo), telefono: textoONulo(d.contacto.telefono),
      correo: textoONulo(d.contacto.correo), confirmadoA: textoONulo(d.contacto.confirmadoA),
      haceMinutos: d.contacto.haceMinutos ?? null,
    } : null,
    metricas: {
      avancePct: m.avancePct, equiposCompletados: m.equiposCompletados, equiposTotal: m.equiposTotal,
      demorasIncidencias: m.demorasIncidencias, minutosDemora: m.minutosDemora, motivoDemora: textoONulo(m.motivoDemora),
      alertasActivas: m.alertasActivas, minutosServicio: m.minutosServicio, minutosEstimados: m.minutosEstimados ?? null,
    },
    equipos:           d.equipos.map(adaptarEquipoResumen),
    notaProcedimiento: textoONulo(c.notaProcedimiento),
  };
}

// ─── Avance por equipos ─────────────────────────────────────────────────────

function normalizarEtapa(e: string | null | undefined): NombreEtapaEquipo | null {
  const v = (e ?? '').trim().toUpperCase() as NombreEtapaEquipo;
  return ETAPAS.includes(v) ? v : null;
}

function normalizarEstadoEtapa(e: string | null | undefined): EstadoEtapaEquipo {
  const v = (e ?? '').trim().toLowerCase();
  return v === 'completada' || v === 'en_curso' ? v : 'pendiente';
}

export function adaptarEquipoAvance(e: EquipoAvanceApi): EquipoAvance {
  const estado = normalizarEstadoEquipo(e.estado);
  const etapas: EtapaEquipo[] = [];
  for (const et of [...(e.etapas ?? [])].sort((a, b) => a.orden - b.orden)) {
    const nombre = normalizarEtapa(et.etapa);
    if (!nombre) continue;
    const estadoEtapa = normalizarEstadoEtapa(et.estado);
    etapas.push({
      nombre,
      estado:       estadoEtapa,
      hora:         estadoEtapa === 'completada' ? textoONulo(et.hora) : null,
      enCursoDesde: estadoEtapa === 'en_curso' ? textoONulo(et.hora) : null,
    });
  }
  const enCurso = etapas.find(x => x.estado === 'en_curso');
  const completadas = etapas.filter(x => x.estado === 'completada').length;
  const progresoPct = estado === 'finalizado' ? 100
    : etapas.length === 0 ? 0 : Math.round((completadas * 100) / etapas.length);
  const activo = estado === 'en_ejecucion' || !!enCurso;

  let tiempoResumen: string | null = null;
  if (e.minutos !== null && e.minutos !== undefined) {
    tiempoResumen = estado === 'finalizado'
      ? formatearDuracionMin(e.minutos)
      : `${formatearDuracionMin(e.minutos)} transcurridos`;
  }
  return {
    idEquipo:       e.idEquipo,
    codigoTw:       texto(e.codigo),
    marca:          '',
    modelo:         texto(e.modelo),
    numeroSerie:    texto(e.serie, '—'),
    estado,
    horaInicio:     textoONulo(e.iniciado),
    horaFin:        textoONulo(e.finalizado),
    etapaActual:    enCurso?.nombre ?? null,
    tiempoResumen,
    progresoPct,
    etapas,
    nFotos:         e.fotos,
    nEnsayos:       e.ensayos,
    nDocumentos:    e.certificadoPreliminar,
    nObservaciones: e.observaciones,
    nMediciones:    e.mediciones,
    activo,
  };
}

export function adaptarAvance(api: AvanceServicioApi): EquipoAvance[] {
  return api.equipos.map(adaptarEquipoAvance);
}

// ─── Mapa GPS ───────────────────────────────────────────────────────────────

export function adaptarRuta(ruta: MapaServicioApi['ruta']): PuntoRutaGps[] {
  const puntos: PuntoRutaGps[] = [];
  for (const p of ruta ?? []) {
    const lat = numeroONulo(p.latitud), lng = numeroONulo(p.longitud);
    if (lat === null || lng === null || (lat === 0 && lng === 0)) continue;
    puntos.push({ lat, lng, hora: texto(p.hora) });
  }
  return puntos;
}

/** Posición de la ruta más cercana (en tiempo) a una hora 'HH:mm' del día: la primera a partir de esa
 *  hora, con tolerancia. La ruta llega en orden cronológico. Null si no hay punto razonable. */
export function buscarPuntoRutaPorHora(
  ruta: PuntoRutaGps[], hora: string | null | undefined, toleranciaMin = TOLERANCIA_HITO_MIN,
): PuntoRutaGps | null {
  const objetivo = horaAMinutos(hora);
  if (objetivo === null || ruta.length === 0) return null;
  let mejor: PuntoRutaGps | null = null;
  let mejorDif = Number.POSITIVE_INFINITY;
  for (const p of ruta) {
    const t = horaAMinutos(p.hora);
    if (t === null) continue;
    const dif = Math.abs(t - objetivo);
    // Primera posición dentro del mismo minuto (o la más cercana): empata a favor de la más temprana
    if (dif < mejorDif) { mejor = p; mejorDif = dif; }
  }
  return mejor && mejorDif <= toleranciaMin ? mejor : null;
}

function etiquetaHito(tipo: TipoHitoGps, hayHora: boolean, planta: PlantaGps | null): { evento: string; detalle: string | null } {
  switch (tipo) {
    case 'salida':
      return { evento: hayHora ? 'Salida registrada' : 'Salida (aún no registrada)', detalle: null };
    case 'pre_llegada':
      return {
        evento:  hayHora ? 'Pre-llegada detectada' : 'Pre-llegada (aún no detectada)',
        detalle: planta ? `A menos de ${planta.radioM} m del cliente` : null,
      };
    case 'llegada':
      return {
        evento:  hayHora ? 'Llegada confirmada' : 'Llegada (aún no registrada)',
        detalle: hayHora && planta ? `Ingreso al perímetro de ${planta.nombre}` : null,
      };
  }
}

function adaptarDemoraMapa(d: DemoraMapaApi): DemoraGps | null {
  const lat = numeroONulo(d.latitud), lng = numeroONulo(d.longitud);
  if (lat === null || lng === null) return null;
  const fase: FaseDemora = (d.fase ?? '').trim().toLowerCase() === 'ingreso' ? 'ingreso' : 'llegada';
  return {
    lat, lng, hora: texto(d.hora), fase, faseLabel: etiquetaFaseDemora(fase),
    motivo: texto(d.motivo, 'Demora'), duracionMin: d.duracionMin ?? 0,
  };
}

function normalizarConexion(c: string | null | undefined): ConexionGps {
  const v = (c ?? '').trim().toLowerCase();
  return v === 'gps_activo' || v === 'gps_parado' ? v : 'sin_senal';
}

export function adaptarMapa(api: MapaServicioApi): MapaGpsServicio {
  const p = api.panel;
  const ruta = adaptarRuta(api.ruta);
  const conexion = normalizarConexion(p.conexion);
  const estadoServicio = normalizarEstadoCampo(p.estado);

  const latSede = numeroONulo(p.latSede), lonSede = numeroONulo(p.lonSede);
  const planta: PlantaGps | null = latSede !== null && lonSede !== null
    ? {
        lat: latSede, lng: lonSede,
        nombre:       texto(p.sede, texto(p.cliente, 'Cliente')),
        direccion:    textoONulo(p.direccionSede),
        radioM:       p.radioProximidadM > 0 ? p.radioProximidadM : 300,
        mostrarRadio: !!p.mostrarRadio,
      }
    : null;

  // Posición actual: la del panel; si no vino pero hay ruta, la última de la ruta
  let lat = numeroONulo(p.latitud), lng = numeroONulo(p.longitud);
  if ((lat === null || lng === null) && ruta.length > 0) {
    lat = ruta[ruta.length - 1].lat;
    lng = ruta[ruta.length - 1].lng;
  }
  const tienePosiciones = lat !== null && lng !== null;

  const cronograma: HitoGps[] = [];
  for (const h of api.cronograma ?? []) {
    const tipo = (h.hito ?? '').trim().toLowerCase() as TipoHitoGps;
    if (tipo !== 'salida' && tipo !== 'pre_llegada' && tipo !== 'llegada') continue;
    const hora = textoONulo(h.hora);
    const punto = hora ? buscarPuntoRutaPorHora(ruta, hora) : null;
    let hLat = punto?.lat ?? null, hLng = punto?.lng ?? null;
    // La llegada sin posición cercana en la ruta se ubica en la planta del cliente
    if (hora && tipo === 'llegada' && !punto && planta) { hLat = planta.lat; hLng = planta.lng; }
    const et = etiquetaHito(tipo, hora !== null, planta);
    cronograma.push({ tipo, hora, evento: et.evento, detalle: et.detalle, lat: hLat, lng: hLng });
  }

  const demoras = (api.demoras ?? []).map(adaptarDemoraMapa).filter((x): x is DemoraGps => x !== null);

  const hace = formatearHaceSegundos(p.segundosDesdeUltima);
  let mensajeEstado: string;
  if (!tienePosiciones)               mensajeEstado = 'Sin posiciones GPS hoy';
  else if (conexion === 'sin_senal')  mensajeEstado = `Sin señal GPS · última posición ${hace}`;
  else if (conexion === 'gps_parado') mensajeEstado = `GPS detenido en el mismo punto hace ${formatearDuracionMin(p.minutosEnPunto)}`;
  else                                mensajeEstado = 'Señal GPS activa';

  const direccionCliente = [textoONulo(p.sede), textoONulo(p.direccionSede)].filter(Boolean).join(' · ');
  const nombreLugar = textoONulo(p.ultimaUbicacion)
    ?? (tienePosiciones ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : 'Sin ubicación registrada');

  const distancia = p.distanciaM ?? null;
  const radio = planta?.radioM ?? (p.radioProximidadM > 0 ? p.radioProximidadM : 300);

  const tecnico = texto(p.tecnico, 'El técnico');
  const partes = cronograma.filter(h => h.hora).map(h =>
    `${h.tipo === 'salida' ? 'Salida' : h.tipo === 'pre_llegada' ? 'Pre-llegada' : 'Llegada'} ${h.hora}`);
  const resumenRuta = !tienePosiciones
    ? `${tecnico} · sin posiciones GPS hoy`
    : partes.length > 0 ? `${tecnico} · ${partes.join(' · ')}` : `${tecnico} · ${etiquetaEstadoCampo(estadoServicio)}`;

  return {
    estadoSenal: {
      conexion,
      activo:              conexion === 'gps_activo',
      estable:             conexion === 'gps_activo',
      haceSegundos:        p.segundosDesdeUltima ?? null,
      hace,
      ultimaActualizacion: textoONulo(p.ultimaActualizacion),
      precisionMetros:     p.precisionM ?? null,
      satelites:           p.satelites ?? null,
      latenciaMs:          p.latenciaMs ?? null,
      mensajeEstado,
    },
    ultimaUbicacion: {
      nombreLugar,
      direccion:          direccionCliente || '—',
      dentroDelRadio:     distancia !== null && distancia <= radio,
      distanciaAlCliente: distancia,
      velocidadKmh:       numeroONulo(p.velocidadKmh),
      altitudMsnm:        numeroONulo(p.altitudM),
      tiempoEnPunto:      p.minutosEnPunto > 0 ? formatearDuracionMin(p.minutosEnPunto) : null,
      lat, lng,
    },
    planta,
    ruta,
    cronograma,
    demoras,
    tienePosiciones,
    resumenRuta,
    chipEstadoMapa: etiquetaEstadoCampo(estadoServicio),
    estadoServicio,
  };
}

/** Mapa vacío para cuando /mapa no respondió (la pestaña muestra el aviso del error). */
export function mapaVacio(estado: EstadoTecnicoCampo = 'sin_salir'): MapaGpsServicio {
  return {
    estadoSenal: {
      conexion: 'sin_senal', activo: false, estable: false, haceSegundos: null, hace: 'Sin posiciones GPS hoy',
      ultimaActualizacion: null, precisionMetros: null, satelites: null, latenciaMs: null, mensajeEstado: 'Sin posiciones GPS hoy',
    },
    ultimaUbicacion: {
      nombreLugar: 'Sin ubicación registrada', direccion: '—', dentroDelRadio: false, distanciaAlCliente: null,
      velocidadKmh: null, altitudMsnm: null, tiempoEnPunto: null, lat: null, lng: null,
    },
    planta: null, ruta: [], cronograma: [], demoras: [], tienePosiciones: false,
    resumenRuta: 'Sin posiciones GPS hoy', chipEstadoMapa: etiquetaEstadoCampo(estado), estadoServicio: estado,
  };
}

// ─── Timeline ───────────────────────────────────────────────────────────────

export function tipoEventoTimeline(categoria: string | null | undefined): TipoEventoTimeline {
  switch ((categoria ?? '').trim().toLowerCase()) {
    case 'alerta':     return 'alerta_sistema';
    case 'incidencia': return 'demora_incidente';
    case 'asistente':  return 'registro_asistente';
    default:           return 'hito_tecnico';
  }
}

export function adaptarEventoTimeline(e: EventoTimelineApi, nombreTecnico: string): EventoTimeline {
  const origen = (e.origen ?? '').trim().toLowerCase();
  const autor = textoONulo(e.registrador)
    ?? (origen === 'sistema' ? 'Sistema' : origen === 'asistente' ? 'Asistente' : nombreTecnico);
  return {
    idEvento:    texto(e.clave, `${e.hora}-${e.titulo}`),
    hora:        texto(e.hora, '—'),
    tipo:        tipoEventoTimeline(e.categoria),
    titulo:      texto(e.titulo),
    descripcion: textoONulo(e.detalle),
    autor,
    badge:       textoONulo(e.badge),
    vinculo:     textoONulo(e.vinculo),
  };
}

/** Eventos en el orden que mandó el backend (se pide `orden=antiguo`, o sea cronológico). */
export function adaptarTimeline(api: TimelineServicioApi, nombreTecnico: string): EventoTimeline[] {
  return api.eventos.map(e => adaptarEventoTimeline(e, nombreTecnico));
}

// ─── Demoras / Incidencias ──────────────────────────────────────────────────

export function adaptarDemoraIncidencia(i: IncidenciaServicioApi): DemoraIncidenciaServicio {
  const impacto = normalizarImpacto(i.impacto);
  const lat = numeroONulo(i.latitud), lng = numeroONulo(i.longitud);
  return {
    idDemora:    i.clave,
    hora:        texto(i.hora, '—'),
    tipo:        texto(i.tipo, 'Incidencia'),
    motivo:      texto(i.descripcion, texto(i.tipo, 'Sin descripción')),
    duracionMin: i.duracionMin ?? null,
    origen:      normalizarOrigen(i.origen),
    detalle:     textoONulo(i.registrador),
    retrasa:     impacto === 'retrasa',
    detiene:     impacto === 'detiene',
    nFotos:      i.tieneEvidencia ? 1 : 0,
    momento:     textoONulo(i.momento),
    fase:        faseDesdeMomento(i.momento),
    lat, lng,
  };
}

export function adaptarIncidenciasServicio(api: IncidenciasServicioApi): {
  kpis: KpisDemoras; demoras: DemoraIncidenciaServicio[];
} {
  const k = api.kpis;
  return {
    kpis: { total: k.total, retrasan: k.retrasan, detienen: k.detienen, porTecnico: k.porTecnico, porAsistente: k.porAsistente },
    demoras: api.filas.map(adaptarDemoraIncidencia),
  };
}

// ─── Cierre ─────────────────────────────────────────────────────────────────

export function adaptarCierre(api: CierreServicioApi): CierreServicio {
  const c = api.cabecera;
  const resultado = (['completado', 'parcial', 'cancelado'] as const).find(r => r === (c.resultado ?? '').toLowerCase()) ?? 'completado';
  const equipos: EquipoCierre[] = api.equipos.map(e => ({
    idEquipo:        e.idEquipo,
    nombre:          texto(e.nombre),
    serie:           textoONulo(e.serie),
    tipoServicio:    textoONulo(e.tipoServicio),
    estado:          normalizarEstadoEquipoCierre(e.estado),
    estadoTexto:     texto(e.estadoTexto),
    hora:            textoONulo(e.hora),
    informe:         textoONulo(e.informe),
    urlInforme:      textoONulo(e.urlInforme),
    conObservaciones: !!e.conObservaciones,
    info:            textoONulo(e.info),
    destacado:       !!e.destacado,
  }));
  const a = api.acta;
  const acta: ActaConformidad | null = a ? {
    firmada:       (a.estado ?? '').toLowerCase() !== 'pendiente',
    chip:          texto(a.chip),
    hora:          textoONulo(a.hora),
    firmante:      textoONulo(a.firmante),
    cargo:         textoONulo(a.cargo),
    metodo:        texto(a.metodo),
    gpsVerificado: !!a.gpsVerificado,
    gps:           texto(a.gps),
    observaciones: textoONulo(a.observaciones),
  } : null;
  return {
    resultado,
    resultadoTexto:      texto(c.resultadoTexto, resultado.toUpperCase()),
    horaFin:             textoONulo(c.finalizadoHora),
    duracionReal:        formatearDuracionMin(c.duracionMin),
    demoraMinutos:       c.diferenciaMin ?? null,
    esCompletadoParcial: resultado === 'parcial',
    equiposFinalizados:  c.equiposFinalizados,
    equiposTotal:        c.equiposTotal,
    equiposPendientes:   c.equiposPendientes + c.equiposParciales,
    nInformes:           c.informes,
    nDemoras:            c.demorasIncidencias,
    nRegAsistente:       c.registrosAsistente,
    rol:                 texto(c.rol, 'Líder'),
    tecnico:             textoONulo(c.tecnico),
    subtitulo:           texto(c.subtitulo),
    chipModo:            texto(c.chipModo),
    equipos,
    acta,
  };
}

// ─── Ensamble del detalle ───────────────────────────────────────────────────

export interface PartesDetalleApi {
  detalle:      DetalleServicioApi;
  avance?:      AvanceServicioApi | null;
  mapa?:        MapaServicioApi | null;
  timeline?:    TimelineServicioApi | null;
  incidencias?: IncidenciasServicioApi | null;
  cierre?:      CierreServicioApi | null;
  errores?:     Partial<Record<ParteDetalle, string>>;
}

export function ensamblarDetalle(p: PartesDetalleApi): DetalleServicioSeguimiento {
  const gps = p.mapa ? adaptarMapa(p.mapa) : mapaVacio(normalizarEstadoCampo(p.detalle.cabecera.estado));
  const horaLlegada = gps.cronograma.find(h => h.tipo === 'llegada')?.hora ?? null;
  const cierre = p.cierre ? adaptarCierre(p.cierre) : null;
  const cabecera = adaptarCabecera(p.detalle, { horaLlegada, horaFin: cierre?.horaFin ?? null });
  const inc = p.incidencias ? adaptarIncidenciasServicio(p.incidencias) : null;
  return {
    cabecera,
    resumen:     adaptarResumenServicio(p.detalle),
    equipos:     p.avance ? adaptarAvance(p.avance) : [],
    gps,
    timeline:    p.timeline ? adaptarTimeline(p.timeline, cabecera.tecnico) : [],
    kpisDemoras: inc?.kpis ?? { total: 0, retrasan: 0, detienen: 0, porTecnico: 0, porAsistente: 0 },
    demoras:     inc?.demoras ?? [],
    cierre,
    errores:     p.errores ?? {},
  };
}
