import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeguimientoOperativoService } from '../../../../core/services/seguimiento-operativo.service';
import { ensamblarDetalle } from '../../../../core/services/seguimiento-operativo-mapper';
import { ModalDetalleServicioComponent } from './modal-detalle-servicio.component';

/**
 * Renderiza el modal de detalle con un servicio simulado (datos con la forma del backend, pasados por el mapper
 * real) para comprobar cada pestaña: Resumen, Mapa GPS, Timeline, Demoras/Incidencias y Cierre.
 */
describe('ModalDetalleServicioComponent', () => {
  let fixture: ComponentFixture<ModalDetalleServicioComponent>;
  const host = () => fixture.nativeElement as HTMLElement;
  const texto = () => (host().textContent ?? '').replace(/\s+/g, ' ');
  const obtenerDetalleServicio = vi.fn();

  // jsdom no hace layout: contenedor simulado de 800x400 para el mapa Leaflet
  const anchoOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const altoOriginal = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 400 });
  });
  afterAll(() => {
    if (anchoOriginal) Object.defineProperty(HTMLElement.prototype, 'clientWidth', anchoOriginal);
    if (altoOriginal) Object.defineProperty(HTMLElement.prototype, 'clientHeight', altoOriginal);
  });

  const detalle = (finalizado = false, conGps = true) => ensamblarDetalle({
    detalle: {
      cabecera: { idOs: 793, numero: 'OS-000793', tipo: 'OS', propuesta: 'PROP-000240 v3', codigoProgramacion: 'PRG-1', expediente: 'EXP-9', idCliente: 1,
        cliente: 'Aceros Arequipa', ruc: null, sede: 'Planta Ventanilla', direccionSede: 'Av. Néstor Gambetta Km 14.5', tipoServicio: 'Calibración',
        minutosEstimados: 240, equiposProgramados: 2, norma: 'OIML R76', notaProcedimiento: 'Priorizar la Balanza A', idTecnicoLider: 103,
        tecnicoLider: 'Pedro Salazar', cargoTecnico: 'Técnico', estadoSsoma: 'conforme', horaInicio: '08:00', horaFin: '12:00', salidaReal: '07:15',
        puntualidadSalida: 'puntual', estado: finalizado ? 'finalizado' : 'en_ejecucion', fechaEjecucion: '2026-11-06', ultimaActualizacion: '10:42:15',
        refrescoSegundos: 15, mostrarCierre: finalizado, telefonoTecnico: '+51 987 333 444' },
      metricas: { avancePct: 50, equiposCompletados: 1, equiposTotal: 2, demorasIncidencias: 2, minutosDemora: 40, motivoDemora: 'Control de seguridad',
        alertasActivas: 1, minutosServicio: 130, minutosEstimados: 240 },
      equipos: [{ idEquipo: 1, codigo: 'EQ-1', modelo: 'PDX50', serie: 'S1', estadoEjecucion: 'ejecutado', etapaActual: null, horaCompletado: '09:45', observado: false }],
      responsables: [
        { idUsuario: 103, nombre: 'Pedro Salazar', rol: 'principal', cargo: 'Técnico', nota: null },
        { idUsuario: 5, nombre: 'María Jefa', rol: 'supervisor', cargo: 'Jefa de Operaciones', nota: null },
      ],
      contacto: { nombre: 'Ing. Luis Rodríguez', cargo: 'Jefe de Mantenimiento', telefono: '+51 999 111 222', correo: 'luis@cliente.test', confirmadoA: '08:12', haceMinutos: 150 },
    },
    avance: { equiposCompletados: 1, equiposTotal: 1, equipos: [{
      idEquipo: 2, codigo: 'EQ-TW-2026-0010', modelo: 'PowerDeck', serie: 'MT-864429', estado: 'en_proceso', fotos: 4, ensayos: 1, certificadoPreliminar: 0,
      observaciones: 2, mediciones: 0, iniciado: '10:35', finalizado: null, minutos: 17, etapas: [
        { etapa: 'limpieza', orden: 1, estado: 'completada', hora: '10:42' }, { etapa: 'desmontaje', orden: 2, estado: 'completada', hora: '10:47' },
        { etapa: 'pruebas', orden: 3, estado: 'en_curso', hora: '10:48' }, { etapa: 'montaje', orden: 4, estado: 'pendiente', hora: null },
        { etapa: 'cierre', orden: 5, estado: 'pendiente', hora: null }] }] },
    mapa: {
      panel: { idOs: 793, estado: 'en_ejecucion', tecnico: 'Pedro Salazar', cliente: 'Aceros Arequipa', sede: 'Planta Ventanilla', direccionSede: 'Av. Néstor Gambetta Km 14.5',
        latSede: -11.8762, lonSede: -77.1283, radioProximidadM: 300, mostrarRadio: true,
        latitud: conGps ? -11.8765 : null, longitud: conGps ? -77.128 : null, ultimaUbicacion: 'Planta Concentradora Ventanilla', distanciaM: 40,
        ultimaActualizacion: '10:41:50', segundosDesdeUltima: conGps ? 15 : null, conexion: conGps ? 'gps_activo' : 'sin_senal', minutosEnPunto: 122,
        precisionM: 4, velocidadKmh: 0, altitudM: 25, satelites: null, latenciaMs: null },
      ruta: conGps ? [{ latitud: -12.146, longitud: -76.998, hora: '08:00:10' }, { latitud: -12.0464, longitud: -77.0428, hora: '08:08:30' },
        { latitud: -11.8765, longitud: -77.128, hora: '08:12:05' }] : [],
      cronograma: conGps ? [{ hito: 'salida', hora: '08:00' }, { hito: 'pre_llegada', hora: '08:08' }, { hito: 'llegada', hora: '08:12' }] : [],
      demoras: conGps ? [
        { latitud: -12.0, longitud: -77.0, hora: '08:05', fase: 'llegada', motivo: 'Tráfico', duracionMin: 15 },
        { latitud: -11.88, longitud: -77.12, hora: '08:20', fase: 'ingreso', motivo: 'Control de seguridad', duracionMin: 25 }] : [],
    },
    timeline: { conteos: { hitos: 1, alertas: 0, incidencias: 2, asistente: 0, total: 3 }, eventos: [
      { hora: '07:15', categoria: 'hito', origen: 'tecnico', titulo: 'Salida de base', detalle: null, clave: 'e1', badge: null, registrador: null, vinculo: null },
      { hora: '08:05', categoria: 'incidencia', origen: 'tecnico', titulo: 'Demora en ruta: Tráfico', detalle: 'Congestión', clave: 'd1', badge: null, registrador: null, vinculo: null },
      { hora: '08:20', categoria: 'incidencia', origen: 'tecnico', titulo: 'Demora en ingreso a planta: Control de seguridad', detalle: null, clave: 'd2', badge: null, registrador: null, vinculo: null }] },
    incidencias: { kpis: { total: 2, retrasan: 1, detienen: 1, porTecnico: 2, porAsistente: 0 }, filas: [
      { clave: 'd2', hora: '08:20', tipoCodigo: 'SEGURIDAD', tipo: 'Control de seguridad', descripcion: 'Revisión en portería', duracionMin: 25, impacto: 'detiene', origen: 'tecnico',
        registrador: 'Pedro Salazar', evidencia: null, tieneEvidencia: false, momento: 'Ingreso a planta', latitud: -11.88, longitud: -77.12 },
      { clave: 'd1', hora: '08:05', tipoCodigo: 'TRAFICO', tipo: 'Tráfico', descripcion: 'Congestión', duracionMin: 15, impacto: 'retrasa', origen: 'tecnico',
        registrador: 'Pedro Salazar', evidencia: null, tieneEvidencia: true, momento: 'En ruta (llegar a planta)', latitud: -12.0, longitud: -77.0 }] },
    cierre: finalizado ? {
      cabecera: { resultado: 'parcial', resultadoTexto: 'COMPLETADO PARCIAL', finalizadoHora: '12:35', duracionMin: 275, minutosEstimados: 240, diferenciaMin: 35, idTecnico: 103,
        tecnico: 'Pedro Salazar', iniciales: 'PS', rol: 'Líder', cerradoPor: 'tecnico', subtitulo: 'El técnico marcó "Finalicé el servicio" a las 12:35 desde su app móvil.',
        equiposFinalizados: 1, equiposTotal: 2, informes: 1, demorasIncidencias: 2, registrosAsistente: 0, equiposParciales: 0, equiposPendientes: 1, equiposReprogramados: 0,
        equiposAnulados: 0, estadoCabecera: 'FINALIZADO', modoAuditoria: true, registrarHabilitado: false, tooltipRegistrar: '', chipModo: 'Modo auditoría post-servicio · Solo lectura', textoActualizacion: '' },
      equipos: [
        { idEquipo: 1, nombre: 'EQ-1 PDX50', serie: 'S1', tipoServicio: 'Calibración', estado: 'finalizado', estadoTexto: 'Finalizado', hora: '09:45', informe: 'INF-245-A',
          urlInforme: 'https://x.test/a.pdf', conObservaciones: false, info: null, vinculo: null, destacado: false },
        { idEquipo: 4, nombre: 'EQ-4', serie: null, tipoServicio: null, estado: 'pendiente', estadoTexto: 'Pendiente', hora: null, informe: null, urlInforme: null,
          conObservaciones: false, info: 'Esperando decisión J.Ops', vinculo: null, destacado: true }],
      acta: { hora: '12:40', estado: 'firmada', chip: 'Firmada 12:40', firmante: 'Ing. Luis Rodríguez', cargo: 'Jefe de Mantenimiento', metodo: 'Firma digital en app del técnico',
        tipo: 'presencial', gpsVerificado: true, gps: 'Planta Ventanilla - verificado', urlFirma: null, observaciones: 'Sin observaciones', nota: '' },
      pie: { idExpediente: 1, expediente: 'EXP-9', documentos: 1, eventosAuditoria: 3 }, ordenes: [],
    } : null,
  });

  async function montar(): Promise<void> {
    fixture = TestBed.createComponent(ModalDetalleServicioComponent);
    fixture.componentRef.setInput('idServicio', 793);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }
  const abrirTab = (nombre: string) => {
    const tab = Array.from(host().querySelectorAll<HTMLButtonElement>('.tabs-bandeja .tab')).find(b => (b.textContent ?? '').includes(nombre));
    tab!.click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    obtenerDetalleServicio.mockReset();
    await TestBed.configureTestingModule({
      imports: [ModalDetalleServicioComponent],
      providers: [{ provide: SeguimientoOperativoService, useValue: { obtenerDetalleServicio } }],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
  });

  it('Resumen: programación, responsables, contacto en planta, indicadores y equipos', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle());
    await montar();
    expect(texto()).toContain('Detalle del Servicio OS-000793');
    expect(texto()).toContain('Auto-refresh cada 15s');
    const t = texto();
    ['PROP-000240 v3', 'PRG-1', 'EXP-9', 'Calibración', 'OIML R76', 'Planta Ventanilla', 'Puntual', 'Conforme', '4h 00min',
      'Pedro Salazar', 'Supervisión técnica', 'Jefa de Operaciones', 'Ing. Luis Rodríguez', '+51 999 111 222', 'luis@cliente.test', 'hace 150 min',
      'Control de seguridad', 'EQ-1 · PDX50', 'Priorizar la Balanza A', '1/2 (50%)'].forEach(x => expect(t).toContain(x));
    expect(t).not.toContain('Viáticos');
  });

  it('Mapa GPS: mapa real con la ruta, la posición actual, la planta con su radio, los hitos y las demoras por fase', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle());
    await montar();
    abrirTab('Mapa GPS');
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(texto()).not.toContain('integración pendiente');
    expect(host().querySelector('app-mapa-seguimiento .leaflet-container')).not.toBeNull();
    // planta, hitos (salida y pre-llegada; la llegada coincide con la posición actual de la ruta), 2 demoras y la posición actual
    expect(host().querySelectorAll('.mapa-seg-pin--planta').length).toBe(1);
    expect(host().querySelectorAll('.mapa-seg-pin--hito').length).toBe(3);
    expect(host().querySelectorAll('.mapa-seg-pin--demora').length).toBe(2);
    expect(host().querySelectorAll('.mapa-seg-pin--actual').length).toBe(1);
    expect(host().querySelectorAll('.leaflet-overlay-pane path').length).toBe(2);   // polilínea + círculo de proximidad
    expect(host().querySelector('.mapa-seg__aviso')).toBeNull();

    const t = texto();
    ['En ejecución', 'Pedro Salazar · Salida 08:00 · Pre-llegada 08:08 · Llegada 08:12', '● GPS activo', 'hace 15 seg', 'Planta Concentradora Ventanilla',
      'Dentro del radio de proximidad del cliente (40 m)', 'Señal GPS activa', '2h 02min', '08:00 · Salida registrada', '08:12 · Llegada confirmada',
      '08:05 · Demora en ruta', '08:20 · Demora en ingreso a planta', 'Radio 300 m proximidad'].forEach(x => expect(t).toContain(x));
    // satélites y latencia no vienen: se muestra "—"
    const valor = (etiqueta: string) => Array.from(host().querySelectorAll('.gps-card .info-item'))
      .find(i => i.querySelector('small')?.textContent?.trim() === etiqueta)?.querySelector('strong')?.textContent?.trim();
    expect(valor('SATÉLITES')).toBe('—');
    expect(valor('LATENCIA')).toBe('—');
    expect(valor('PRECISIÓN')).toBe('± 4 m');
    expect(valor('VELOCIDAD')).toBe('0 km/h');
    expect(valor('ALTITUD')).toBe('25 msnm');
  });

  it('Mapa GPS sin posiciones: aviso "Sin posiciones GPS hoy" (el mapa se centra en la planta, o en Lima si no hay)', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle(false, false));
    await montar();
    abrirTab('Mapa GPS');
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(host().querySelector('.mapa-seg__aviso')?.textContent).toContain('Sin posiciones GPS hoy');
    expect(host().querySelectorAll('.mapa-seg-pin').length).toBe(1);   // solo la planta del cliente
    expect(texto()).toContain('● Sin señal');
    expect(texto()).toContain('Sin hitos GPS registrados hoy');
  });

  it('el refresco actualiza las capas sin recrear el mapa', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle());
    await montar();
    abrirTab('Mapa GPS');
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    const contenedor = host().querySelector('.leaflet-container');
    expect(contenedor).not.toBeNull();

    obtenerDetalleServicio.mockResolvedValue(detalle(false, false));
    await vi.advanceTimersByTimeAsync(15_500);
    fixture.detectChanges();
    expect(obtenerDetalleServicio).toHaveBeenCalledTimes(2);
    expect(host().querySelector('.leaflet-container')).toBe(contenedor);
    expect(host().querySelectorAll('.mapa-seg-pin--actual').length).toBe(0);
  });

  it('Timeline: las demoras se titulan "en ruta" / "en ingreso a planta" y por defecto va lo más reciente primero', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle());
    await montar();
    abrirTab('Timeline del Día');
    const titulos = Array.from(host().querySelectorAll('.ev__titulo')).map(e => e.textContent?.trim());
    expect(titulos).toEqual(['Demora en ingreso a planta: Control de seguridad', 'Demora en ruta: Tráfico', 'Salida de base']);

    (host().querySelector('.tl-orden') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(Array.from(host().querySelectorAll('.ev__titulo')).map(e => e.textContent?.trim())[0]).toBe('Salida de base');
  });

  it('Demoras/Incidencias: Momento, GPS de la demora, impacto, duración y evidencia', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle());
    await montar();
    abrirTab('Demoras / Incidencias');
    const cab = Array.from(host().querySelectorAll('th')).map(th => th.textContent?.trim());
    expect(cab).toEqual(expect.arrayContaining(['MOMENTO', 'GPS', 'IMPACTO', 'DURACIÓN']));
    expect(host().querySelector('tbody .chip--morado')?.textContent).toContain('Ingreso a planta');
    expect(host().querySelector('tbody .chip--azul')?.textContent).toContain('En ruta (llegar a planta)');
    const t = texto();
    ['Revisión en portería', 'DETIENE', 'RETRASA', '25 min', '-11.8800, -77.1200', 'Registró: Pedro Salazar', 'Con foto'].forEach(x => expect(t).toContain(x));

    // el GPS lleva al mapa del servicio
    (host().querySelector('.gps-enlace') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host().querySelector('.mapa-panel')).not.toBeNull();
  });

  it('Cierre (servicio finalizado): resultado, equipos al cierre y acta de conformidad', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle(true));
    await montar();
    abrirTab('Cierre del Servicio');
    const t = texto();
    ['COMPLETADO PARCIAL', 'Finalizado: 12:35', 'Duración: 4h 35min', '(+35min)', 'El técnico marcó "Finalicé el servicio"', 'Modo auditoría post-servicio',
      'EQ-1 PDX50', 'INF-245-A', 'Esperando decisión J.Ops', 'Ing. Luis Rodríguez', 'Firmada 12:40', 'Planta Ventanilla - verificado'].forEach(x => expect(t).toContain(x));
    expect(host().querySelector('a.info-link')?.getAttribute('href')).toBe('https://x.test/a.pdf');
  });

  it('el botón Llamar al técnico usa el teléfono de la cabecera y se deshabilita si no hay', async () => {
    obtenerDetalleServicio.mockResolvedValue(detalle());
    await montar();
    const boton = () => host().querySelector<HTMLButtonElement>('.footer-modal__der app-button:last-child button')!;
    expect(boton().disabled).toBe(false);
    expect(boton().getAttribute('title')).toContain('+51 987 333 444');

    const sinTelefono = detalle();
    sinTelefono.cabecera = { ...sinTelefono.cabecera, telefono: null };
    obtenerDetalleServicio.mockResolvedValue(sinTelefono);
    await vi.advanceTimersByTimeAsync(15_500);
    fixture.detectChanges();
    expect(boton().disabled).toBe(true);
  });

  it('si el backend rechaza el servicio muestra su mensaje dentro del modal (no lo cierra ni lo deja en blanco)', async () => {
    obtenerDetalleServicio.mockRejectedValue(new Error('Servicio no encontrado o fuera de la jornada de hoy.'));
    let cerrado = false;
    fixture = TestBed.createComponent(ModalDetalleServicioComponent);
    fixture.componentRef.setInput('idServicio', 999);
    fixture.componentInstance.cerrar.subscribe(() => (cerrado = true));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(host().querySelector('.estado--error')).not.toBeNull();
    expect(texto()).toContain('Servicio no encontrado o fuera de la jornada de hoy.');
    expect(cerrado).toBe(false);
  });
});
