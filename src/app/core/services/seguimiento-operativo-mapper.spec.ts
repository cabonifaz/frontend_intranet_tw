import {
  CierreServicioApi, DetalleServicioApi, EquipoAvanceApi, IncidenciaServicioApi, MapaServicioApi,
  PanelGpsApi, PinMapaApi, ResumenSeguimientoApi, TecnicoSeguimientoApi, TimelineServicioApi,
} from '../models/seguimiento-operativo-api.model';
import {
  adaptarCierre, adaptarDemoraIncidencia, adaptarEquipoAvance, adaptarIncidencia, adaptarMapa,
  adaptarPin, adaptarResumenBandeja, adaptarServicio, adaptarTecnico, adaptarTimeline,
  buscarPuntoRutaPorHora, calcularTiempoCampo, ensamblarBandeja, ensamblarDetalle, formatearDistancia,
  formatearDuracionMin, formatearHaceAlerta, formatearHaceMinutos, formatearHaceSegundos, horaAMinutos,
  iniciales, normalizarEstadoCampo, numeroONulo, tipoDesdeNumero,
} from './seguimiento-operativo-mapper';

// ─── Fixtures con la forma exacta del backend ──────────────────────────────

const pin = (o: Partial<PinMapaApi> = {}): PinMapaApi => ({
  idUsuario: 7, tecnico: 'Pedro Salazar', iniciales: 'PS', estado: 'en_ruta', latitud: -12.05, longitud: -77.04,
  direccion: 'Av. Argentina, Callao', minutosUbicacion: 3, idOs: 793, numeroOs: 'OS-000793', cliente: 'Aceros Arequipa', ...o,
});

const resumenApi = (): ResumenSeguimientoApi => ({
  kpis: {
    programados: 12, tecnicosEnRuta: 1, enPlanta: 2, enEjecucion: 3, conDemoraIncidente: 2, finalizados: 1, sinSalir: 3,
    serviciosFiltrados: 12, tecnicosActivos: 4, incidenciasDelDia: 5, actualizado: '10:42', refrescoSegundos: 30,
  },
  pines: [pin(), pin({ idUsuario: 8, tecnico: 'Luis Herrera', estado: 'con_incidente', latitud: null, longitud: null, minutosUbicacion: null })],
  alertas: [
    { clave: 'perdida_contacto:8:792', tipo: 'perdida_contacto', severidad: 'critica', titulo: 'Pérdida de contacto',
      detalle: 'Luis Herrera · OS-000792', minutos: 12, nueva: true, idUsuario: 8, tecnico: 'Luis Herrera', idOs: 792, numeroOs: 'OS-000792' },
  ],
  totalesAlertas: { total: 3, nuevas: 1, criticas: 1 },
  hitos: [
    { idOs: 791, numeroOs: 'OS-000791', tipo: 'llegada', hora: '09:50', texto: 'Jhonny debería llegar a Antamina',
      detalle: 'En ruta · a 15.0 km · OS-000791', atrasado: true, idTecnico: 101 },
  ],
  resumenHitos: { todosOcurrieron: false, pendientes: 4 },
});

const tecnicoApi = (o: Partial<TecnicoSeguimientoApi> = {}): TecnicoSeguimientoApi => ({
  idUsuario: 102, tecnico: 'Carlos Medina', iniciales: 'CM', cargo: null, zona: 'Lima', estado: 'en_planta', ssoma: 'conforme',
  servicios: 2, completados: 1, enCurso: 1, salidaReal: '07:15', salidaProgramada: '07:00', diferenciaSalidaMin: 15,
  ultimaUbicacion: null, minutosUbicacion: null,
  serviciosDelDia: [
    { idOs: 11, numero: 'OS-000011', cliente: 'Cliente A', estado: 'finalizado', horaInicio: '06:00', horaFin: '07:00', rol: 'principal', equipos: 1, ejecutados: 1 },
    { idOs: 790, numero: 'OS-000790', cliente: 'Alicorp S.A.A.', estado: 'en_planta', horaInicio: '08:00', horaFin: '12:00', rol: 'principal', equipos: 2, ejecutados: 0 },
  ],
  ...o,
});

const panelApi = (o: Partial<PanelGpsApi> = {}): PanelGpsApi => ({
  idOs: 793, estado: 'en_planta', tecnico: 'Pedro Salazar', cliente: 'Aceros Arequipa', sede: 'Planta Ventanilla',
  direccionSede: 'Av. Néstor Gambetta Km 14.5', latSede: -11.8762, lonSede: -77.1283, radioProximidadM: 300, mostrarRadio: true,
  latitud: -11.8765, longitud: -77.1280, ultimaUbicacion: null, distanciaM: 40, ultimaActualizacion: '10:41:50', segundosDesdeUltima: 15,
  conexion: 'gps_activo', minutosEnPunto: 0, precisionM: 4, velocidadKmh: 0, altitudM: 25, satelites: null, latenciaMs: null, ...o,
});

const mapaApi = (o: Partial<MapaServicioApi> = {}): MapaServicioApi => ({
  panel: panelApi(),
  ruta: [
    { latitud: -12.1460, longitud: -76.9980, hora: '08:00:10' },
    { latitud: -12.0464, longitud: -77.0428, hora: '08:08:30' },
    { latitud: -11.8765, longitud: -77.1280, hora: '08:12:05' },
  ],
  cronograma: [
    { hito: 'salida', hora: '08:00' }, { hito: 'pre_llegada', hora: '08:08' }, { hito: 'llegada', hora: '08:12' },
  ],
  demoras: [
    { latitud: -12.0, longitud: -77.0, hora: '08:05', fase: 'llegada', motivo: 'Tráfico', duracionMin: 15 },
    { latitud: -11.88, longitud: -77.12, hora: '08:20', fase: 'ingreso', motivo: 'Control de seguridad', duracionMin: 25 },
  ],
  ...o,
});

const detalleApi = (mostrarCierre = false): DetalleServicioApi => ({
  cabecera: {
    idOs: 793, numero: 'OS-000793', tipo: 'OS', propuesta: 'PROP-000240 v3', codigoProgramacion: 'PRG-1', expediente: 'EXP-9',
    idCliente: 1, cliente: 'Aceros Arequipa', ruc: '20123456789', sede: null, direccionSede: null, tipoServicio: 'Calibración',
    minutosEstimados: 240, equiposProgramados: 3, norma: null, notaProcedimiento: null, idTecnicoLider: 103,
    tecnicoLider: 'Pedro Salazar', cargoTecnico: 'Técnico', estadoSsoma: 'conforme', horaInicio: '08:00', horaFin: '12:00',
    salidaReal: '07:15', puntualidadSalida: 'puntual', estado: 'en_ejecucion', fechaEjecucion: '2026-11-06',
    ultimaActualizacion: '10:42:15', refrescoSegundos: 15, mostrarCierre, telefonoTecnico: '+51 987 333 444',
  },
  metricas: {
    avancePct: 33, equiposCompletados: 1, equiposTotal: 3, demorasIncidencias: 2, minutosDemora: 40, motivoDemora: 'Tráfico',
    alertasActivas: 0, minutosServicio: 130, minutosEstimados: 240,
  },
  equipos: [{ idEquipo: 1, codigo: 'EQ-1', modelo: 'PDX50', serie: 'S1', estadoEjecucion: 'ejecutado', etapaActual: null, horaCompletado: '09:45', observado: false }],
  responsables: [
    { idUsuario: 103, nombre: 'Pedro Salazar', rol: 'principal', cargo: null, nota: null },
    { idUsuario: 5, nombre: 'Jefe', rol: 'supervisor', cargo: 'Jefe de Operaciones', nota: null },
  ],
  contacto: null,
});

const equipoAvanceApi = (o: Partial<EquipoAvanceApi> = {}): EquipoAvanceApi => ({
  idEquipo: 2, codigo: 'EQ-TW-2026-0010', modelo: 'PowerDeck', serie: 'MT-864429', estado: 'en_proceso', fotos: 4, ensayos: 1,
  certificadoPreliminar: 0, observaciones: 2, mediciones: 0, iniciado: '10:35', finalizado: null, minutos: 17,
  etapas: [
    { etapa: 'limpieza', orden: 1, estado: 'completada', hora: '10:42' },
    { etapa: 'desmontaje', orden: 2, estado: 'completada', hora: '10:47' },
    { etapa: 'pruebas', orden: 3, estado: 'en_curso', hora: '10:48' },
    { etapa: 'montaje', orden: 4, estado: 'pendiente', hora: null },
    { etapa: 'cierre', orden: 5, estado: 'pendiente', hora: null },
  ],
  ...o,
});

// ═══════════════════════════════════════════════════════════════════════════

describe('formato (funciones puras)', () => {
  it('formatearHaceMinutos', () => {
    expect(formatearHaceMinutos(null)).toBe('Sin posición GPS hoy');
    expect(formatearHaceMinutos(undefined, '—')).toBe('—');
    expect(formatearHaceMinutos(0)).toBe('hace menos de 1 min');
    expect(formatearHaceMinutos(5)).toBe('hace 5 min');
    expect(formatearHaceMinutos(65)).toBe('hace 1 h 5 min');
    expect(formatearHaceMinutos(120)).toBe('hace 2 h');
  });

  it('formatearHaceSegundos', () => {
    expect(formatearHaceSegundos(null)).toBe('Sin posiciones GPS hoy');
    expect(formatearHaceSegundos(15)).toBe('hace 15 seg');
    expect(formatearHaceSegundos(90)).toBe('hace 1 min');
    expect(formatearHaceSegundos(3700)).toBe('hace 1 h 1 min');
  });

  it('formatearHaceAlerta capitaliza', () => {
    expect(formatearHaceAlerta(12)).toBe('Hace 12 min');
    expect(formatearHaceAlerta(null)).toBe('—');
  });

  it('formatearDuracionMin y formatearDistancia', () => {
    expect(formatearDuracionMin(null)).toBe('—');
    expect(formatearDuracionMin(45)).toBe('45 min');
    expect(formatearDuracionMin(122)).toBe('2h 02min');
    expect(formatearDistancia(null)).toBe('—');
    expect(formatearDistancia(250)).toBe('250 m');
    expect(formatearDistancia(1530)).toBe('1.5 km');
  });

  it('horaAMinutos y calcularTiempoCampo', () => {
    expect(horaAMinutos('08:30')).toBe(510);
    expect(horaAMinutos('08:30:45')).toBe(510);
    expect(horaAMinutos('25:00')).toBeNull();
    expect(horaAMinutos(null)).toBeNull();
    expect(calcularTiempoCampo('07:15', '10:40')).toBe('3 h 25 min');
    expect(calcularTiempoCampo('07:15', '08:00')).toBe('45 min');
    expect(calcularTiempoCampo(null, '08:00')).toBe('—');
    expect(calcularTiempoCampo('10:00', '09:00')).toBe('—');
  });

  it('normalizarEstadoCampo, tipoDesdeNumero, iniciales y numeroONulo', () => {
    expect(normalizarEstadoCampo('en_ruta')).toBe('en_ruta');
    expect(normalizarEstadoCampo('EN_PLANTA')).toBe('en_planta');
    expect(normalizarEstadoCampo('raro')).toBe('sin_salir');
    expect(normalizarEstadoCampo(null)).toBe('sin_salir');
    expect(tipoDesdeNumero('OM-000332')).toBe('OM');
    expect(tipoDesdeNumero('OS-000793')).toBe('OS');
    expect(tipoDesdeNumero(null)).toBe('OS');
    expect(iniciales('Pedro Salazar')).toBe('PS');
    expect(iniciales('Cher')).toBe('CH');
    expect(iniciales('')).toBe('?');
    expect(numeroONulo('-12.5')).toBe(-12.5);
    expect(numeroONulo(null)).toBeNull();
    expect(numeroONulo('abc')).toBeNull();
  });
});

describe('bandeja (HU-51)', () => {
  it('adaptarPin: con GPS, sin GPS y (0,0)', () => {
    const a = adaptarPin(pin());
    expect(a).toMatchObject({
      idServicio: 793, numero: 'OS-000793', tipo: 'OS', idTecnico: 7, estado: 'en_ruta', lat: -12.05, lng: -77.04, hace: 'hace 3 min',
    });
    const sin = adaptarPin(pin({ latitud: null, longitud: null, minutosUbicacion: null, idOs: null, numeroOs: null, cliente: null }));
    expect(sin.lat).toBeNull();
    expect(sin.lng).toBeNull();
    expect(sin.idServicio).toBeNull();
    expect(sin.hace).toBe('Sin posición GPS hoy');
    const cero = adaptarPin(pin({ latitud: 0, longitud: 0 }));
    expect(cero.lat).toBeNull();
  });

  it('adaptarResumenBandeja: KPIs, alertas, hitos y refresco', () => {
    const { kpis, vistaPrincipal } = adaptarResumenBandeja(resumenApi());
    expect(kpis).toMatchObject({
      programadas: 12, tecnicos: 4, enRuta: 1, enPlanta: 2, enEjecucion: 3, conDemora: 2, finalizados: 1, sinSalir: 3,
      incidenciasDia: 5, refrescoSegundos: 30,
    });
    expect(vistaPrincipal.mapa.length).toBe(2);
    expect(vistaPrincipal.alertas[0]).toMatchObject({
      idAlerta: 'perdida_contacto:8:792', tipo: 'perdida_contacto', severidad: 'critica', hace: 'Hace 12 min', nueva: true, idServicio: 792,
    });
    expect(vistaPrincipal.totalAlertas).toBe(3);
    expect(vistaPrincipal.alertasNuevas).toBe(1);
    expect(vistaPrincipal.hitos[0]).toMatchObject({ idHito: '791:llegada', hora: '09:50', requiereAtencion: true, idServicio: 791 });
    expect(vistaPrincipal.todosHitosOcurrieron).toBe(false);
    expect(vistaPrincipal.hitosPendientes).toBe(4);
    expect(vistaPrincipal.ultimaActualizacion).toBe('10:42');
  });

  it('adaptarResumenBandeja: refresco 0 cae a 30 s; tipos y severidades desconocidos se normalizan', () => {
    const api = resumenApi();
    api.kpis.refrescoSegundos = 0;
    api.alertas[0].tipo = 'algo_nuevo';
    api.alertas[0].severidad = 'rara';
    const { kpis, vistaPrincipal } = adaptarResumenBandeja(api);
    expect(kpis.refrescoSegundos).toBe(30);
    expect(vistaPrincipal.alertas[0].tipo).toBe('otra');
    expect(vistaPrincipal.alertas[0].severidad).toBe('info');
  });

  it('adaptarServicio: tipo, avance acotado y datos opcionales', () => {
    const s = adaptarServicio({
      idOs: 332, numero: 'OM-000332', tipo: 'OM', propuesta: null, cliente: 'La Pampilla', ruc: null, idTecnico: null, tecnico: null,
      iniciales: null, estado: 'finalizado', zona: 'Callao', horaInicio: '07:30', ultimaUbicacion: null, minutosUbicacion: null,
      equipos: 4, ejecutados: 4, avancePct: 140,
    });
    expect(s).toMatchObject({
      tipo: 'OM', tecnico: 'Sin técnico', estado: 'finalizado', avancePct: 100, horaProgramada: '07:30', ultimaActividad: '—', zona: 'Callao',
    });
  });

  it('adaptarTecnico: servicio actual según el estado, tiempo en campo y sin teléfono', () => {
    const t = adaptarTecnico(tecnicoApi(), '10:40');
    expect(t.servicioActual).toEqual({ idServicio: 790, numero: 'OS-000790', cliente: 'Alicorp S.A.A.' });
    expect(t.tiempoCampo).toBe('3 h 25 min');
    expect(t.telefono).toBeNull();
    expect(t.cargo).toBeNull();
    expect(t.ultimaActividad).toBe('Sin posición GPS hoy');
    expect(t.serviciosDelDia.length).toBe(2);
    const sinServicios = adaptarTecnico(tecnicoApi({ serviciosDelDia: [] }), null);
    expect(sinServicios.servicioActual).toBeNull();
    expect(sinServicios.tiempoCampo).toBe('—');
  });

  it('adaptarIncidencia: Momento de la demora → fase; impacto/origen por defecto', () => {
    const base = {
      clave: 'd1', hora: '08:05', idUsuario: 7, tecnico: 'Pedro', iniciales: 'P', idOs: 793, numero: 'OS-000793', cliente: 'Aceros',
      tipoCodigo: 'TRAFICO', tipo: 'Tráfico', descripcion: 'Congestión', duracionMin: 15, impacto: 'retrasa', origen: 'tecnico',
    };
    const ruta = adaptarIncidencia({ ...base, momento: 'En ruta (llegar a planta)' });
    expect(ruta).toMatchObject({ momento: 'En ruta (llegar a planta)', fase: 'llegada', impacto: 'retrasa', origen: 'tecnico', tipoLabel: 'Tráfico' });
    const ingreso = adaptarIncidencia({ ...base, clave: 'd2', momento: 'Ingreso a planta', impacto: 'detiene' });
    expect(ingreso).toMatchObject({ fase: 'ingreso', impacto: 'detiene' });
    const sinMomento = adaptarIncidencia({ ...base, clave: 'i3', momento: null, impacto: '', origen: '', descripcion: null });
    expect(sinMomento).toMatchObject({ momento: null, fase: null, impacto: 'retrasa', origen: 'tecnico', detalle: '' });
  });

  it('ensamblarBandeja: las pestañas que fallaron quedan vacías con su error', () => {
    const b = ensamblarBandeja({
      resumen: resumenApi(),
      servicios: null,
      tecnicos: { total: 1, adicionalesSinIniciar: 0, actualizado: '10:42', tecnicos: [tecnicoApi()] },
      incidencias: null,
      errores: { servicios: 'Falló servicios', incidencias: 'Falló incidencias' },
    });
    expect(b.serviciosEnCampo).toEqual([]);
    expect(b.incidenciasDia).toEqual([]);
    expect(b.tecnicosActivos.length).toBe(1);
    expect(b.errores.servicios).toBe('Falló servicios');
    expect(b.errores.tecnicos).toBeUndefined();
    expect(b.tarjetasIncidencias.total).toBe(0);
    expect(b.kpis.programadas).toBe(12);
  });
});

describe('detalle del servicio (HU-52)', () => {
  it('buscarPuntoRutaPorHora respeta la tolerancia', () => {
    const ruta = adaptarMapa(mapaApi()).ruta;
    expect(buscarPuntoRutaPorHora(ruta, '08:08')?.lat).toBe(-12.0464);
    expect(buscarPuntoRutaPorHora(ruta, '08:00')?.lng).toBe(-76.998);
    expect(buscarPuntoRutaPorHora(ruta, '09:30')).toBeNull();
    expect(buscarPuntoRutaPorHora([], '08:00')).toBeNull();
    expect(buscarPuntoRutaPorHora(ruta, null)).toBeNull();
  });

  it('adaptarMapa: panel, ruta, planta con radio, hitos con coordenadas y demoras por fase', () => {
    const m = adaptarMapa(mapaApi());
    expect(m.tienePosiciones).toBe(true);
    expect(m.ruta.length).toBe(3);
    expect(m.planta).toMatchObject({ lat: -11.8762, lng: -77.1283, radioM: 300, mostrarRadio: true, nombre: 'Planta Ventanilla' });
    expect(m.cronograma.map(h => h.tipo)).toEqual(['salida', 'pre_llegada', 'llegada']);
    expect(m.cronograma[0]).toMatchObject({ hora: '08:00', lat: -12.146, lng: -76.998, evento: 'Salida registrada' });
    expect(m.cronograma[1].detalle).toBe('A menos de 300 m del cliente');
    expect(m.cronograma[2]).toMatchObject({ lat: -11.8765, lng: -77.128, evento: 'Llegada confirmada' });
    expect(m.demoras.map(d => d.faseLabel)).toEqual(['Demora en ruta', 'Demora en ingreso a planta']);
    expect(m.demoras[1]).toMatchObject({ fase: 'ingreso', motivo: 'Control de seguridad', duracionMin: 25 });
    expect(m.estadoSenal).toMatchObject({
      conexion: 'gps_activo', activo: true, haceSegundos: 15, hace: 'hace 15 seg', precisionMetros: 4, satelites: null, latenciaMs: null,
      mensajeEstado: 'Señal GPS activa',
    });
    expect(m.ultimaUbicacion).toMatchObject({
      dentroDelRadio: true, distanciaAlCliente: 40, velocidadKmh: 0, altitudMsnm: 25, tiempoEnPunto: null,
      lat: -11.8765, lng: -77.128, direccion: 'Planta Ventanilla · Av. Néstor Gambetta Km 14.5',
    });
    expect(m.resumenRuta).toBe('Pedro Salazar · Salida 08:00 · Pre-llegada 08:08 · Llegada 08:12');
    expect(m.chipEstadoMapa).toBe('En planta');
  });

  it('adaptarMapa: la llegada sin punto cercano en la ruta se ubica en la planta; hitos sin hora no tienen coordenadas', () => {
    const m = adaptarMapa(mapaApi({
      ruta: [{ latitud: -12.1, longitud: -77.0, hora: '08:00:10' }],
      cronograma: [{ hito: 'salida', hora: '08:00' }, { hito: 'pre_llegada', hora: null }, { hito: 'llegada', hora: '11:30' }],
    }));
    expect(m.cronograma[1]).toMatchObject({ hora: null, lat: null, lng: null, evento: 'Pre-llegada (aún no detectada)' });
    expect(m.cronograma[2]).toMatchObject({ lat: -11.8762, lng: -77.1283 });
  });

  it('adaptarMapa: sin posiciones GPS, sin planta y con señal perdida', () => {
    const vacio = adaptarMapa(mapaApi({
      panel: panelApi({
        latitud: null, longitud: null, latSede: null, lonSede: null, conexion: 'sin_senal', segundosDesdeUltima: null,
        ultimaActualizacion: null, distanciaM: null, velocidadKmh: null, altitudM: null, precisionM: null, mostrarRadio: false,
      }),
      ruta: [], cronograma: [], demoras: null,
    }));
    expect(vacio.tienePosiciones).toBe(false);
    expect(vacio.planta).toBeNull();
    expect(vacio.demoras).toEqual([]);
    expect(vacio.estadoSenal.mensajeEstado).toBe('Sin posiciones GPS hoy');
    expect(vacio.estadoSenal.hace).toBe('Sin posiciones GPS hoy');
    expect(vacio.ultimaUbicacion).toMatchObject({ nombreLugar: 'Sin ubicación registrada', velocidadKmh: null, dentroDelRadio: false, lat: null });
    expect(vacio.resumenRuta).toBe('Pedro Salazar · sin posiciones GPS hoy');

    const sinSenal = adaptarMapa(mapaApi({ panel: panelApi({ conexion: 'sin_senal', segundosDesdeUltima: 1200 }) }));
    expect(sinSenal.estadoSenal).toMatchObject({ conexion: 'sin_senal', estable: false });
    expect(sinSenal.estadoSenal.mensajeEstado).toBe('Sin señal GPS · última posición hace 20 min');
  });

  it('adaptarMapa: GPS parado y fuera del radio de proximidad', () => {
    const m = adaptarMapa(mapaApi({ panel: panelApi({ conexion: 'gps_parado', minutosEnPunto: 12, distanciaM: 1530, estado: 'en_ruta' }) }));
    expect(m.estadoSenal.conexion).toBe('gps_parado');
    expect(m.estadoSenal.mensajeEstado).toBe('GPS detenido en el mismo punto hace 12 min');
    expect(m.ultimaUbicacion).toMatchObject({ dentroDelRadio: false, tiempoEnPunto: '12 min', distanciaAlCliente: 1530 });
    expect(m.estadoServicio).toBe('en_ruta');
  });

  it('adaptarMapa: usa la última posición de la ruta si el panel no la trae; ignora (0,0) y demoras sin GPS', () => {
    const m = adaptarMapa(mapaApi({
      panel: panelApi({ latitud: null, longitud: null }),
      ruta: [{ latitud: 0, longitud: 0, hora: '07:59:00' }, { latitud: -12.0, longitud: -77.0, hora: '08:00:00' }],
      demoras: [{ latitud: null as unknown as number, longitud: null as unknown as number, hora: '08:05', fase: 'llegada', motivo: 'X', duracionMin: 5 }],
    }));
    expect(m.ruta.length).toBe(1);
    expect(m.ultimaUbicacion.lat).toBe(-12);
    expect(m.demoras).toEqual([]);
  });

  it('adaptarEquipoAvance: estado, etapas, progreso y tiempos', () => {
    const e = adaptarEquipoAvance(equipoAvanceApi());
    expect(e).toMatchObject({
      estado: 'en_ejecucion', activo: true, etapaActual: 'PRUEBAS', progresoPct: 40, tiempoResumen: '17 min transcurridos',
      codigoTw: 'EQ-TW-2026-0010', marca: '', nDocumentos: 0, nFotos: 4, horaInicio: '10:35',
    });
    expect(e.etapas.map(x => x.nombre)).toEqual(['LIMPIEZA', 'DESMONTAJE', 'PRUEBAS', 'MONTAJE', 'CIERRE']);
    expect(e.etapas[0]).toMatchObject({ estado: 'completada', hora: '10:42', enCursoDesde: null });
    expect(e.etapas[2]).toMatchObject({ estado: 'en_curso', hora: null, enCursoDesde: '10:48' });

    const fin = adaptarEquipoAvance(equipoAvanceApi({ estado: 'ejecutado', finalizado: '11:30', minutos: 75, etapas: [] }));
    expect(fin).toMatchObject({ estado: 'finalizado', activo: false, progresoPct: 100, tiempoResumen: '1h 15min', horaFin: '11:30' });
    expect(adaptarEquipoAvance(equipoAvanceApi({ estado: 'observado', etapas: [], minutos: null })).estado).toBe('parcial');
    expect(adaptarEquipoAvance(equipoAvanceApi({ estado: 'pendiente', etapas: [], minutos: null, iniciado: null }))).toMatchObject({
      estado: 'pendiente', activo: false, tiempoResumen: null, progresoPct: 0,
    });
  });

  it('adaptarTimeline: categorías, autor y títulos de las demoras', () => {
    const api: TimelineServicioApi = {
      conteos: { hitos: 1, alertas: 1, incidencias: 2, asistente: 1, total: 5 },
      eventos: [
        { hora: '07:15', categoria: 'hito', origen: 'tecnico', titulo: 'Salida de base', detalle: null, clave: 'e1', badge: null, registrador: null, vinculo: null },
        { hora: '08:05', categoria: 'incidencia', origen: 'tecnico', titulo: 'Demora en ruta: Tráfico', detalle: 'Congestión', clave: 'd1', badge: null, registrador: null, vinculo: null },
        { hora: '08:20', categoria: 'incidencia', origen: 'tecnico', titulo: 'Demora en ingreso a planta: Control de seguridad', detalle: null, clave: 'd2', badge: null, registrador: null, vinculo: null },
        { hora: '08:30', categoria: 'alerta', origen: 'sistema', titulo: 'GPS parado', detalle: null, clave: 'agps_parado', badge: null, registrador: null, vinculo: null },
        { hora: '09:50', categoria: 'asistente', origen: 'asistente', titulo: 'Nota del Asistente', detalle: 'Llamé al jefe de planta', clave: 'a9',
          badge: '[NOTA DEL ASISTENTE]', registrador: 'Jazir Olivera', vinculo: 'd1' },
      ],
    };
    const t = adaptarTimeline(api, 'Pedro Salazar');
    expect(t.map(e => e.tipo)).toEqual(['hito_tecnico', 'demora_incidente', 'demora_incidente', 'alerta_sistema', 'registro_asistente']);
    expect(t.map(e => e.autor)).toEqual(['Pedro Salazar', 'Pedro Salazar', 'Pedro Salazar', 'Sistema', 'Jazir Olivera']);
    expect(t[1].titulo).toBe('Demora en ruta: Tráfico');
    expect(t[2].titulo).toBe('Demora en ingreso a planta: Control de seguridad');
    expect(t[4]).toMatchObject({ badge: '[NOTA DEL ASISTENTE]', vinculo: 'd1', idEvento: 'a9' });
  });

  it('adaptarDemoraIncidencia: Momento, GPS, impacto y evidencia', () => {
    const base: IncidenciaServicioApi = {
      clave: 'd1', hora: '08:05', tipoCodigo: 'TRAFICO', tipo: 'Tráfico', descripcion: 'Congestión salida de Lima', duracionMin: 15,
      impacto: 'retrasa', origen: 'tecnico', registrador: 'Pedro Salazar', evidencia: null, tieneEvidencia: true,
      momento: 'En ruta (llegar a planta)', latitud: -12.0, longitud: -77.0,
    };
    expect(adaptarDemoraIncidencia(base)).toMatchObject({
      idDemora: 'd1', tipo: 'Tráfico', motivo: 'Congestión salida de Lima', retrasa: true, detiene: false, momento: 'En ruta (llegar a planta)',
      fase: 'llegada', lat: -12, lng: -77, nFotos: 1, origen: 'tecnico', detalle: 'Pedro Salazar', duracionMin: 15,
    });
    const sinGps = adaptarDemoraIncidencia({
      ...base, clave: 'i2', impacto: 'detiene', momento: null, latitud: null, longitud: null, tieneEvidencia: false, descripcion: null, duracionMin: null,
    });
    expect(sinGps).toMatchObject({ detiene: true, retrasa: false, momento: null, fase: null, lat: null, lng: null, nFotos: 0, motivo: 'Tráfico', duracionMin: null });
  });

  it('adaptarCierre: resultado, equipos y acta', () => {
    const api: CierreServicioApi = {
      cabecera: {
        resultado: 'parcial', resultadoTexto: 'COMPLETADO PARCIAL', finalizadoHora: '12:35', duracionMin: 275, minutosEstimados: 240, diferenciaMin: 35,
        idTecnico: 103, tecnico: 'Pedro Salazar', iniciales: 'PS', rol: 'Líder', cerradoPor: 'tecnico', subtitulo: 'El técnico marcó "Finalicé el servicio" a las 12:35.',
        equiposFinalizados: 3, equiposTotal: 4, informes: 3, demorasIncidencias: 2, registrosAsistente: 1, equiposParciales: 0, equiposPendientes: 1,
        equiposReprogramados: 0, equiposAnulados: 0, estadoCabecera: 'FINALIZADO', modoAuditoria: true, registrarHabilitado: false,
        tooltipRegistrar: '', chipModo: 'Modo auditoría post-servicio · Solo lectura', textoActualizacion: '',
      },
      equipos: [
        { idEquipo: 1, nombre: 'EQ-1 PDX50', serie: 'S1', tipoServicio: 'Calibración', estado: 'finalizado', estadoTexto: 'Finalizado', hora: '09:45',
          informe: 'INF-245-A', urlInforme: 'https://x.test/a.pdf', conObservaciones: false, info: null, vinculo: null, destacado: false },
        { idEquipo: 4, nombre: 'EQ-4', serie: null, tipoServicio: null, estado: 'pendiente', estadoTexto: 'Pendiente', hora: null,
          informe: null, urlInforme: null, conObservaciones: false, info: 'Esperando decisión J.Ops', vinculo: null, destacado: true },
      ],
      acta: { hora: '12:40', estado: 'firmada', chip: 'Firmada 12:40', firmante: 'Ing. Luis Rodríguez', cargo: 'Jefe de Mantenimiento', metodo: 'Firma digital en app del técnico',
        tipo: 'presencial', gpsVerificado: true, gps: 'Planta - verificado', urlFirma: null, observaciones: null, nota: '' },
      pie: { idExpediente: 1, expediente: 'EXP-9', documentos: 2, eventosAuditoria: 5 },
      ordenes: [],
    };
    const c = adaptarCierre(api);
    expect(c).toMatchObject({
      resultado: 'parcial', esCompletadoParcial: true, horaFin: '12:35', duracionReal: '4h 35min', demoraMinutos: 35, equiposFinalizados: 3, equiposTotal: 4,
      equiposPendientes: 1, nInformes: 3, nDemoras: 2, nRegAsistente: 1, rol: 'Líder',
    });
    expect(c.equipos[1]).toMatchObject({ estado: 'pendiente', destacado: true, info: 'Esperando decisión J.Ops', informe: null });
    expect(c.acta).toMatchObject({ firmada: true, firmante: 'Ing. Luis Rodríguez', gpsVerificado: true });
    expect(adaptarCierre({ ...api, acta: null }).acta).toBeNull();
  });

  it('ensamblarDetalle: cabecera con llegada/cierre, partes faltantes y errores', () => {
    const completo = ensamblarDetalle({
      detalle: detalleApi(false),
      avance: { equiposCompletados: 1, equiposTotal: 1, equipos: [equipoAvanceApi()] },
      mapa: mapaApi(),
      timeline: { conteos: { hitos: 0, alertas: 0, incidencias: 0, asistente: 0, total: 0 }, eventos: [] },
      incidencias: { kpis: { total: 1, retrasan: 1, detienen: 0, porTecnico: 1, porAsistente: 0 }, filas: [] },
    });
    expect(completo.cabecera).toMatchObject({
      idServicio: 793, numero: 'OS-000793', sede: '—', tecnico: 'Pedro Salazar', telefono: '+51 987 333 444', horaProgramada: '08:00',
      horaFinEstimada: '12:00', salidaReal: '07:15', puntualidadSalida: 'puntual', horaLlegada: '08:12', totalEquipos: 3, avancePct: 33,
      esFinalizado: false, refrescoSegundos: 15, ultimaActualizacion: '10:42:15',
    });
    expect(completo.resumen.responsables.map(r => r.rol)).toEqual(['principal', 'supervisor']);
    expect(completo.resumen.equipos[0].estado).toBe('finalizado');
    expect(completo.equipos.length).toBe(1);
    expect(completo.kpisDemoras.total).toBe(1);
    expect(completo.cierre).toBeNull();
    expect(completo.errores).toEqual({});

    const parcial = ensamblarDetalle({
      detalle: detalleApi(true),
      errores: { mapa: 'No se pudo cargar el mapa', timeline: 'Timeline caído' },
    });
    expect(parcial.cabecera.esFinalizado).toBe(true);
    expect(parcial.gps.tienePosiciones).toBe(false);
    expect(parcial.gps.estadoSenal.hace).toBe('Sin posiciones GPS hoy');
    expect(parcial.equipos).toEqual([]);
    expect(parcial.timeline).toEqual([]);
    expect(parcial.demoras).toEqual([]);
    expect(parcial.errores.mapa).toBe('No se pudo cargar el mapa');
    expect(parcial.errores.timeline).toBe('Timeline caído');
    expect(parcial.cabecera.horaLlegada).toBeNull();
  });
});
