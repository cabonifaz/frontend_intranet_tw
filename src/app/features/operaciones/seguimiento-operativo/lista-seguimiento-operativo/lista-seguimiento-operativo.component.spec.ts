import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SeguimientoOperativoService } from '../../../../core/services/seguimiento-operativo.service';
import { ensamblarBandeja } from '../../../../core/services/seguimiento-operativo-mapper';
import { ListaSeguimientoOperativoComponent } from './lista-seguimiento-operativo.component';

/**
 * Renderiza la bandeja con un servicio simulado (datos con la forma del backend, pasados por el mapper real)
 * para comprobar que cada pestaña pinta lo que llega y que los errores no dejan la pantalla en blanco.
 */
describe('ListaSeguimientoOperativoComponent', () => {
  let fixture: ComponentFixture<ListaSeguimientoOperativoComponent>;
  const host = () => fixture.nativeElement as HTMLElement;
  const texto = () => (host().textContent ?? '').replace(/\s+/g, ' ');
  const obtenerBandeja = vi.fn();

  const bandeja = (refrescoSegundos = 20) => ensamblarBandeja({
    resumen: {
      kpis: { programados: 12, tecnicosEnRuta: 1, enPlanta: 2, enEjecucion: 3, conDemoraIncidente: 2, finalizados: 1, sinSalir: 3,
        serviciosFiltrados: 12, tecnicosActivos: 4, incidenciasDelDia: 2, actualizado: '10:42', refrescoSegundos },
      pines: [
        { idUsuario: 7, tecnico: 'Pedro Salazar', iniciales: 'PS', estado: 'en_ruta', latitud: -12.05, longitud: -77.04, direccion: 'Av. Argentina',
          minutosUbicacion: 3, idOs: 793, numeroOs: 'OS-000793', cliente: 'Aceros Arequipa' },
        { idUsuario: 8, tecnico: 'Luis Herrera', iniciales: 'LH', estado: 'con_incidente', latitud: null, longitud: null, direccion: '',
          minutosUbicacion: null, idOs: 792, numeroOs: 'OS-000792', cliente: 'Las Bambas' },
      ],
      alertas: [{ clave: 'perdida_contacto:8:792', tipo: 'perdida_contacto', severidad: 'critica', titulo: 'Pérdida de contacto', detalle: '',
        minutos: 12, nueva: true, idUsuario: 8, tecnico: 'Luis Herrera', idOs: 792, numeroOs: 'OS-000792' }],
      totalesAlertas: { total: 1, nuevas: 1, criticas: 1 },
      hitos: [{ idOs: 791, numeroOs: 'OS-000791', tipo: 'llegada', hora: '09:50', texto: 'Jhonny debería llegar a Antamina',
        detalle: 'En ruta · OS-000791', atrasado: true, idTecnico: 101 }],
      resumenHitos: { todosOcurrieron: false, pendientes: 1 },
    },
    servicios: { total: 1, pagina: 1, tamano: 50, totalPaginas: 1, actualizado: '10:42', filas: [{
      idOs: 793, numero: 'OS-000793', tipo: 'OS', propuesta: 'PROP-240', cliente: 'Aceros Arequipa', ruc: null, idTecnico: 7, tecnico: 'Pedro Salazar',
      iniciales: 'PS', estado: 'en_ruta', zona: 'Callao', horaInicio: '08:00', ultimaUbicacion: 'Av. Argentina', minutosUbicacion: 3, equipos: 3, ejecutados: 1, avancePct: 33 }] },
    tecnicos: { total: 1, adicionalesSinIniciar: 0, actualizado: '10:42', tecnicos: [{
      idUsuario: 7, tecnico: 'Pedro Salazar', iniciales: 'PS', cargo: 'Técnico Senior', zona: 'Callao', estado: 'en_ruta', ssoma: 'conforme', servicios: 1,
      completados: 0, enCurso: 1, salidaReal: '07:15', salidaProgramada: '07:00', diferenciaSalidaMin: 15, ultimaUbicacion: 'Av. Argentina', minutosUbicacion: 3,
      serviciosDelDia: [{ idOs: 793, numero: 'OS-000793', cliente: 'Aceros Arequipa', estado: 'en_ruta', horaInicio: '08:00', horaFin: '12:00', rol: 'principal', equipos: 3, ejecutados: 1 }] }] },
    incidencias: { tarjetas: { retrasan: 1, detienen: 1, registradasTecnico: 2, registradasAsistente: 0, total: 2 }, filas: [
      { clave: 'd1', hora: '08:05', idUsuario: 7, tecnico: 'Pedro Salazar', iniciales: 'PS', idOs: 793, numero: 'OS-000793', cliente: 'Aceros Arequipa',
        tipoCodigo: 'TRAFICO', tipo: 'Tráfico', descripcion: 'Congestión en la Panamericana', duracionMin: 15, impacto: 'retrasa', origen: 'tecnico', momento: 'En ruta (llegar a planta)' },
      { clave: 'd2', hora: '08:20', idUsuario: 7, tecnico: 'Pedro Salazar', iniciales: 'PS', idOs: 793, numero: 'OS-000793', cliente: 'Aceros Arequipa',
        tipoCodigo: 'SEGURIDAD', tipo: 'Control de seguridad', descripcion: 'Revisión en portería', duracionMin: 25, impacto: 'detiene', origen: 'tecnico', momento: 'Ingreso a planta' }] },
  });

  async function montar(): Promise<void> {
    fixture = TestBed.createComponent(ListaSeguimientoOperativoComponent);
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
    obtenerBandeja.mockReset();
    await TestBed.configureTestingModule({
      imports: [ListaSeguimientoOperativoComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: SeguimientoOperativoService, useValue: { obtenerBandeja, obtenerDetalleServicio: vi.fn().mockReturnValue(new Promise(() => undefined)) } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
  });

  it('muestra KPIs, mapa real, pines con GPS, alertas, hitos y la leyenda de colores', async () => {
    obtenerBandeja.mockResolvedValue(bandeja());
    await montar();

    expect(texto()).toContain('12 / 4');
    expect(texto()).toContain('Auto-refresh cada 20s');
    expect(texto()).toContain('Última actualización 10:42');
    expect(host().querySelector('app-mapa-seguimiento .leaflet-container')).not.toBeNull();
    expect(texto()).not.toContain('integración pendiente');
    // un pin por técnico con posición GPS (Luis Herrera no tiene)
    expect(host().querySelectorAll('.mapa-seg-pin').length).toBe(1);
    expect(host().querySelector('.mapa-seg-pin')?.textContent?.trim()).toBe('PS');
    expect(host().querySelectorAll('.tec-card').length).toBe(2);
    expect(texto()).toContain('1 sin posición GPS');
    expect(texto()).toContain('Sin posición GPS hoy');
    expect(texto()).toContain('Pérdida de contacto');
    expect(texto()).toContain('Hace 12 min');
    expect(texto()).toContain('Jhonny debería llegar a Antamina');
    expect(texto()).toContain('Atrasado');
    ['En ruta', 'En planta/ejecución', 'Con demora/incidente', 'Con incidente crítico', 'Finalizado', 'Sin salir aún']
      .forEach(l => expect(host().querySelector('.vp__leyenda')?.textContent).toContain(l));
  });

  it('Servicios en Campo y Técnicos Activos usan los datos del backend', async () => {
    obtenerBandeja.mockResolvedValue(bandeja());
    await montar();

    abrirTab('Servicios en Campo');
    expect(texto()).toContain('OS-000793');
    expect(texto()).toContain('PROP-240');
    expect(texto()).toContain('Callao');
    expect(texto()).toContain('33% · 1/3 equipos');
    expect(texto()).toContain('Av. Argentina');
    expect(texto()).toContain('hace 3 min');

    abrirTab('Técnicos Activos');
    expect(texto()).toContain('Técnico Senior · Callao');
    expect(texto()).toContain('07:15');
    expect(texto()).toContain('OS-000793 · Aceros Arequipa');
    expect(texto()).toContain('0/1 completados');
    expect(texto()).not.toContain('+51');   // la bandeja no trae teléfonos
  });

  it('Incidencias del Día muestra el Momento de la demora (en ruta vs ingreso a planta)', async () => {
    obtenerBandeja.mockResolvedValue(bandeja());
    await montar();

    abrirTab('Incidencias del Día');
    const cabeceras = Array.from(host().querySelectorAll('th')).map(th => th.textContent?.trim());
    expect(cabeceras).toContain('MOMENTO');
    expect(cabeceras).toContain('IMPACTO');
    const chips = Array.from(host().querySelectorAll('tbody .chip')).map(c => c.textContent?.trim());
    expect(chips).toContain('En ruta (llegar a planta)');
    expect(chips).toContain('Ingreso a planta');
    expect(host().querySelector('tbody .chip--azul')?.textContent).toContain('En ruta');
    expect(host().querySelector('tbody .chip--morado')?.textContent).toContain('Ingreso a planta');
    expect(texto()).toContain('Detiene');
    expect(texto()).toContain('25 min');
    expect(texto()).toContain('2 registradas hoy');
  });

  it('si la primera carga falla muestra el mensaje del backend (no queda en blanco) y permite reintentar', async () => {
    obtenerBandeja.mockRejectedValueOnce(new Error('No tienes permiso para ver la bandeja de seguimiento operativo.'));
    await montar();
    expect(host().querySelector('.aviso-tab--grande')).not.toBeNull();
    expect(texto()).toContain('No tienes permiso para ver la bandeja de seguimiento operativo.');

    obtenerBandeja.mockResolvedValue(bandeja());
    (host().querySelector('.aviso-tab--grande button') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    expect(host().querySelector('.aviso-tab--grande')).toBeNull();
    expect(texto()).toContain('12 / 4');
  });

  it('una pestaña con error muestra su mensaje sin tumbar el resto', async () => {
    const b = bandeja();
    b.errores = { servicios: 'No se pudo conectar con el servidor. Revisa tu conexión.' };
    obtenerBandeja.mockResolvedValue(b);
    await montar();
    abrirTab('Servicios en Campo');
    expect(host().querySelector('.aviso-tab')?.textContent).toContain('No se pudo conectar con el servidor');
    abrirTab('Técnicos Activos');
    expect(texto()).toContain('Pedro Salazar');
  });

  it('auto-refresh con el intervalo del backend (RefrescoSegundos) y conserva los datos si un refresco falla', async () => {
    obtenerBandeja.mockResolvedValue(bandeja(20));
    await montar();
    expect(obtenerBandeja).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(19_000);
    expect(obtenerBandeja).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(obtenerBandeja).toHaveBeenCalledTimes(2);

    obtenerBandeja.mockRejectedValueOnce(new Error('Servidor caído'));
    await vi.advanceTimersByTimeAsync(20_500);
    fixture.detectChanges();
    expect(obtenerBandeja).toHaveBeenCalledTimes(3);
    expect(texto()).toContain('No se pudo actualizar (Servidor caído)');
    expect(texto()).toContain('12 / 4');   // los datos anteriores siguen en pantalla

    fixture.destroy();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(obtenerBandeja).toHaveBeenCalledTimes(3);   // destruido: no se vuelve a pedir
  });
});
