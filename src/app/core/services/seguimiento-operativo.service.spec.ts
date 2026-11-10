import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SeguimientoOperativoService } from './seguimiento-operativo.service';

/**
 * Pruebas del servicio contra un backend simulado: verifican las rutas que se consumen, el desenvuelto del
 * sobre { idTipoMensaje, mensaje, datos }, la paginación de /servicios y la tolerancia a errores parciales.
 */
describe('SeguimientoOperativoService', () => {
  const BASE = `${environment.apiUrl}/api/operaciones/seguimiento`;
  let svc: SeguimientoOperativoService;
  let http: HttpTestingController;

  const ok = <T>(datos: T) => ({ idTipoMensaje: 2, mensaje: 'OK', datos });
  const esperar = () => new Promise<void>(r => setTimeout(r, 0));
  const peticion = (url: string, params: Record<string, string> = {}) =>
    http.expectOne((r: HttpRequest<unknown>) =>
      r.method === 'GET' && r.url === url && Object.entries(params).every(([k, v]) => r.params.get(k) === v));

  const resumen = {
    kpis: { programados: 2, tecnicosEnRuta: 1, enPlanta: 0, enEjecucion: 0, conDemoraIncidente: 0, finalizados: 0, sinSalir: 1,
      serviciosFiltrados: 2, tecnicosActivos: 2, incidenciasDelDia: 0, actualizado: '10:42', refrescoSegundos: 20 },
    pines: [], alertas: [], totalesAlertas: { total: 0, nuevas: 0, criticas: 0 }, hitos: [], resumenHitos: { todosOcurrieron: true, pendientes: 0 },
  };
  const fila = (id: number) => ({ idOs: id, numero: `OS-${id}`, tipo: 'OS', propuesta: null, cliente: 'Cliente', ruc: null, idTecnico: 1, tecnico: 'Pedro',
    iniciales: 'P', estado: 'en_ruta', zona: 'Lima', horaInicio: '08:00', ultimaUbicacion: null, minutosUbicacion: null, equipos: 1, ejecutados: 0, avancePct: 0 });
  const servicios = (filas: number[], pagina: number, totalPaginas: number) =>
    ({ total: 3, pagina, tamano: 50, totalPaginas, actualizado: '10:42', filas: filas.map(fila) });
  const tecnicos = { total: 0, adicionalesSinIniciar: 0, actualizado: '10:42', tecnicos: [] };
  const incidencias = { tarjetas: { retrasan: 1, detienen: 0, registradasTecnico: 1, registradasAsistente: 0, total: 1 },
    filas: [{ clave: 'd1', hora: '08:05', idUsuario: 1, tecnico: 'Pedro', iniciales: 'P', idOs: 1, numero: 'OS-1', cliente: 'Cliente', tipoCodigo: 'TRAFICO',
      tipo: 'Tráfico', descripcion: 'x', duracionMin: 10, impacto: 'retrasa', origen: 'tecnico', momento: 'Ingreso a planta' }] };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(SeguimientoOperativoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  // ─── Bandeja ──────────────────────────────────────────────────────────────

  it('obtenerBandeja consume las 4 rutas reales y arma la bandeja', async () => {
    const p = svc.obtenerBandeja();
    peticion(BASE).flush(ok(resumen));
    peticion(`${BASE}/servicios`, { pagina: '1', tamano: '50' }).flush(ok(servicios([1, 2], 1, 1)));
    peticion(`${BASE}/tecnicos`).flush(ok(tecnicos));
    peticion(`${BASE}/incidencias`).flush(ok(incidencias));
    const b = await p;
    expect(b.kpis.refrescoSegundos).toBe(20);
    expect(b.serviciosEnCampo.map(s => s.idServicio)).toEqual([1, 2]);
    expect(b.incidenciasDia[0]).toMatchObject({ idIncidencia: 'd1', momento: 'Ingreso a planta', fase: 'ingreso' });
    expect(b.errores).toEqual({});
  });

  it('pide todas las páginas de /servicios (el backend limita a 50 por página)', async () => {
    const p = svc.obtenerBandeja();
    peticion(BASE).flush(ok(resumen));
    peticion(`${BASE}/servicios`, { pagina: '1' }).flush(ok(servicios([1, 2], 1, 2)));
    peticion(`${BASE}/tecnicos`).flush(ok(tecnicos));
    peticion(`${BASE}/incidencias`).flush(ok(incidencias));
    await esperar();
    peticion(`${BASE}/servicios`, { pagina: '2', tamano: '50' }).flush(ok(servicios([3], 2, 2)));
    const b = await p;
    expect(b.serviciosEnCampo.map(s => s.idServicio)).toEqual([1, 2, 3]);
    expect(b.totalServicios).toBe(3);
  });

  it('si el resumen responde idTipoMensaje != 2 lanza el mensaje del backend', async () => {
    const p = svc.obtenerBandeja();
    const rechazo = p.then(() => null, (e: Error) => e.message);
    peticion(BASE).flush({ idTipoMensaje: 1, mensaje: 'No tienes permiso para ver la bandeja de seguimiento operativo.', datos: null });
    peticion(`${BASE}/servicios`, { pagina: '1' }).flush(ok(servicios([], 1, 1)));
    peticion(`${BASE}/tecnicos`).flush(ok(tecnicos));
    peticion(`${BASE}/incidencias`).flush(ok(incidencias));
    expect(await rechazo).toBe('No tienes permiso para ver la bandeja de seguimiento operativo.');
  });

  it('si falla una pestaña, la bandeja carga igual y esa pestaña lleva su error', async () => {
    const p = svc.obtenerBandeja();
    peticion(BASE).flush(ok(resumen));
    peticion(`${BASE}/servicios`, { pagina: '1' }).flush({ idTipoMensaje: 3, mensaje: 'No se pudo cargar el seguimiento operativo. Inténtalo de nuevo.', datos: null }, { status: 500, statusText: 'Server Error' });
    peticion(`${BASE}/tecnicos`).flush(ok(tecnicos));
    peticion(`${BASE}/incidencias`).error(new ProgressEvent('error'), { status: 0 });
    const b = await p;
    expect(b.serviciosEnCampo).toEqual([]);
    expect(b.errores.servicios).toBeTruthy();
    expect(b.errores.incidencias).toBe('No se pudo conectar con el servidor. Revisa tu conexión.');
    expect(b.errores.tecnicos).toBeUndefined();
    expect(b.kpis.programadas).toBe(2);
  });

  // ─── Detalle del servicio ─────────────────────────────────────────────────

  const detalle = (mostrarCierre: boolean) => ({
    cabecera: { idOs: 793, numero: 'OS-000793', tipo: 'OS', propuesta: null, codigoProgramacion: null, expediente: null, idCliente: 1, cliente: 'Aceros', ruc: null,
      sede: 'Planta', direccionSede: null, tipoServicio: null, minutosEstimados: null, equiposProgramados: 1, norma: null, notaProcedimiento: null,
      idTecnicoLider: 103, tecnicoLider: 'Pedro Salazar', cargoTecnico: null, estadoSsoma: null, horaInicio: '08:00', horaFin: '12:00', salidaReal: null,
      puntualidadSalida: null, estado: mostrarCierre ? 'finalizado' : 'en_ruta', fechaEjecucion: '2026-11-06', ultimaActualizacion: '10:42:15',
      refrescoSegundos: 15, mostrarCierre, telefonoTecnico: null },
    metricas: { avancePct: 0, equiposCompletados: 0, equiposTotal: 1, demorasIncidencias: 0, minutosDemora: 0, motivoDemora: null, alertasActivas: 0,
      minutosServicio: 0, minutosEstimados: null },
    equipos: [], responsables: [], contacto: null,
  });
  const avance = { equiposCompletados: 0, equiposTotal: 0, equipos: [] };
  const mapa = { panel: { idOs: 793, estado: 'en_ruta', tecnico: 'Pedro Salazar', cliente: 'Aceros', sede: null, direccionSede: null, latSede: null, lonSede: null,
    radioProximidadM: 300, mostrarRadio: false, latitud: -12.05, longitud: -77.04, ultimaUbicacion: null, distanciaM: null, ultimaActualizacion: '10:41:50',
    segundosDesdeUltima: 20, conexion: 'gps_activo', minutosEnPunto: 0, precisionM: 5, velocidadKmh: 40, altitudM: 100, satelites: null, latenciaMs: null },
    ruta: [{ latitud: -12.05, longitud: -77.04, hora: '10:41:50' }], cronograma: [], demoras: [] };
  const timeline = { conteos: { hitos: 0, alertas: 0, incidencias: 0, asistente: 0, total: 0 }, eventos: [] };
  const incidenciasServicio = { kpis: { total: 0, retrasan: 0, detienen: 0, porTecnico: 0, porAsistente: 0 }, filas: [] };

  it('obtenerDetalleServicio consume cabecera, avance, mapa, timeline (cronológico) e incidencias', async () => {
    const raiz = `${BASE}/servicios/793`;
    const p = svc.obtenerDetalleServicio(793);
    peticion(raiz).flush(ok(detalle(false)));
    peticion(`${raiz}/avance`).flush(ok(avance));
    peticion(`${raiz}/mapa`).flush(ok(mapa));
    peticion(`${raiz}/timeline`, { orden: 'antiguo' }).flush(ok(timeline));
    peticion(`${raiz}/incidencias`).flush(ok(incidenciasServicio));
    const d = await p;
    expect(d.cabecera).toMatchObject({ numero: 'OS-000793', refrescoSegundos: 15, esFinalizado: false });
    expect(d.gps).toMatchObject({ tienePosiciones: true });
    expect(d.gps.ruta.length).toBe(1);
    expect(d.cierre).toBeNull();
    expect(d.errores).toEqual({});
    http.expectNone(`${raiz}/cierre`);
  });

  it('el cierre solo se pide cuando el servicio está finalizado, y si falla no tumba el detalle', async () => {
    const raiz = `${BASE}/servicios/793`;
    const p = svc.obtenerDetalleServicio(793);
    peticion(raiz).flush(ok(detalle(true)));
    peticion(`${raiz}/avance`).flush(ok(avance));
    peticion(`${raiz}/mapa`).flush(ok(mapa));
    peticion(`${raiz}/timeline`).flush(ok(timeline));
    peticion(`${raiz}/incidencias`).flush(ok(incidenciasServicio));
    await esperar();
    peticion(`${raiz}/cierre`).flush({ idTipoMensaje: 1, mensaje: 'El cierre del servicio solo está disponible cuando el servicio finalizó.', datos: null }, { status: 400, statusText: 'Bad Request' });
    const d = await p;
    expect(d.cabecera.esFinalizado).toBe(true);
    expect(d.cierre).toBeNull();
    expect(d.errores.cierre).toBeTruthy();
  });

  it('una sección que falla (p. ej. el mapa) no impide abrir el modal', async () => {
    const raiz = `${BASE}/servicios/793`;
    const p = svc.obtenerDetalleServicio(793);
    peticion(raiz).flush(ok(detalle(false)));
    peticion(`${raiz}/avance`).flush(ok(avance));
    peticion(`${raiz}/mapa`).flush({ idTipoMensaje: 1, mensaje: 'Servicio fuera de la jornada.', datos: null });
    peticion(`${raiz}/timeline`).flush(ok(timeline));
    peticion(`${raiz}/incidencias`).flush(ok(incidenciasServicio));
    const d = await p;
    expect(d.errores.mapa).toBe('Servicio fuera de la jornada.');
    expect(d.gps.tienePosiciones).toBe(false);
    expect(d.errores.equipos).toBeUndefined();
  });

  it('si la cabecera responde idTipoMensaje != 2 se lanza su mensaje', async () => {
    const raiz = `${BASE}/servicios/999`;
    const p = svc.obtenerDetalleServicio(999);
    const rechazo = p.then(() => null, (e: Error) => e.message);
    peticion(raiz).flush({ idTipoMensaje: 1, mensaje: 'Servicio no encontrado o fuera de la jornada de hoy.', datos: null });
    peticion(`${raiz}/avance`).flush(ok(avance));
    peticion(`${raiz}/mapa`).flush(ok(mapa));
    peticion(`${raiz}/timeline`).flush(ok(timeline));
    peticion(`${raiz}/incidencias`).flush(ok(incidenciasServicio));
    expect(await rechazo).toBe('Servicio no encontrado o fuera de la jornada de hoy.');
  });

  it('rechaza un id inválido sin llamar al backend', async () => {
    await expect(svc.obtenerDetalleServicio(0)).rejects.toThrow('El servicio indicado no es válido.');
    await expect(svc.obtenerDetalleServicio(1.5)).rejects.toThrow('El servicio indicado no es válido.');
  });
});
