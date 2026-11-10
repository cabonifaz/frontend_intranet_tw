import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as L from 'leaflet';
import { MapaSeguimientoComponent, MarcadorMapa } from './mapa-seguimiento.component';

/**
 * Pruebas de humo del mapa Leaflet en jsdom: ciclo de vida (se crea una sola vez, se actualiza por capas
 * y se destruye) y que los textos del backend nunca se interpreten como HTML.
 */
describe('MapaSeguimientoComponent', () => {
  let fixture: ComponentFixture<MapaSeguimientoComponent>;
  const host = () => fixture.nativeElement as HTMLElement;
  const pines = () => host().querySelectorAll('.mapa-seg-pin');

  // jsdom no hace layout: se simula un contenedor de 800x400 para que Leaflet pueda calcular el encuadre
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

  const tecnico = (id: number, o: Partial<MarcadorMapa> = {}): MarcadorMapa => ({
    id, lat: -12.05 + id / 100, lng: -77.04, tipo: 'tecnico', color: '#2563EB', texto: 'PS',
    titulo: 'Pedro Salazar', popup: ['Pedro Salazar', 'OS-000793 · Aceros'], accion: 'Ver servicio', ...o,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MapaSeguimientoComponent] }).compileComponents();
    fixture = TestBed.createComponent(MapaSeguimientoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('crea el mapa una sola vez y, sin posiciones, muestra el aviso (centrado en Lima)', () => {
    expect(host().querySelectorAll('.leaflet-container').length).toBe(1);
    expect(pines().length).toBe(0);
    expect(host().querySelector('.mapa-seg__aviso')?.textContent).toContain('Sin posiciones GPS hoy');
    expect(host().querySelector('.mapa-seg__centrar')).toBeNull();
  });

  it('sinPosiciones fuerza el aviso aunque haya marcadores fijos (ej. la planta del cliente)', async () => {
    fixture.componentRef.setInput('marcadores', [
      { id: 'planta', lat: -11.8762, lng: -77.1283, tipo: 'planta', color: '#DC2626', icono: 'business' },
    ] satisfies MarcadorMapa[]);
    await fixture.whenStable();
    expect(host().querySelector('.mapa-seg__aviso')).toBeNull();

    fixture.componentRef.setInput('sinPosiciones', true);
    await fixture.whenStable();
    expect(host().querySelector('.mapa-seg__aviso')?.textContent).toContain('Sin posiciones GPS hoy');
    expect(pines().length).toBe(1);   // el pin de la planta se sigue mostrando
  });

  it('dibuja un pin por marcador con las iniciales y el color indicados', async () => {
    fixture.componentRef.setInput('marcadores', [tecnico(1), tecnico(2, { color: '#DC2626', texto: 'LH' })]);
    await fixture.whenStable();
    const p = Array.from(pines()) as HTMLElement[];
    expect(p.length).toBe(2);
    expect(p.map(x => x.textContent?.trim())).toEqual(['PS', 'LH']);
    expect(p[1].style.background).toMatch(/#DC2626|rgb\(220, 38, 38\)/i);
    expect(host().querySelector('.mapa-seg__aviso')).toBeNull();
    expect(host().querySelector('.mapa-seg__centrar')).not.toBeNull();
  });

  it('al cambiar los datos solo actualiza capas: el mapa no se recrea', async () => {
    fixture.componentRef.setInput('marcadores', [tecnico(1), tecnico(2)]);
    await fixture.whenStable();
    const contenedor = host().querySelector('.leaflet-container');

    fixture.componentRef.setInput('marcadores', [tecnico(1, { color: '#10B981', texto: 'JI' })]);   // el 2 desaparece, el 1 cambia
    await fixture.whenStable();
    expect(host().querySelector('.leaflet-container')).toBe(contenedor);
    const p = Array.from(pines()) as HTMLElement[];
    expect(p.length).toBe(1);
    expect(p[0].textContent?.trim()).toBe('JI');

    fixture.componentRef.setInput('marcadores', []);
    await fixture.whenStable();
    expect(pines().length).toBe(0);
    expect(host().querySelector('.mapa-seg__aviso')).not.toBeNull();
  });

  it('encuadra la vista al aparecer un marcador nuevo, pero no cuando solo se mueven los existentes (no pisa el zoom del usuario)', async () => {
    const encuadre = vi.spyOn(L.Map.prototype, 'fitBounds');
    try {
      fixture.componentRef.setInput('marcadores', [tecnico(1)]);
      await fixture.whenStable();
      expect(encuadre).toHaveBeenCalledTimes(1);

      fixture.componentRef.setInput('marcadores', [tecnico(1, { lat: -12.2, lng: -77.1 })]);   // el técnico se movió
      await fixture.whenStable();
      expect(encuadre).toHaveBeenCalledTimes(1);

      fixture.componentRef.setInput('marcadores', [tecnico(1), tecnico(2)]);                   // aparece otro pin
      await fixture.whenStable();
      expect(encuadre).toHaveBeenCalledTimes(2);

      fixture.componentRef.setInput('claveAjuste', 'otro-servicio');                          // se abrió otro servicio
      await fixture.whenStable();
      expect(encuadre).toHaveBeenCalledTimes(3);
    } finally {
      encuadre.mockRestore();
    }
  });

  it('dibuja la ruta, el círculo de proximidad y los íconos de la planta, hitos y demoras', async () => {
    fixture.componentRef.setInput('marcadores', [
      { id: 'planta', lat: -11.8762, lng: -77.1283, tipo: 'planta', color: '#DC2626', icono: 'business' },
      { id: 'hito-salida', lat: -12.146, lng: -76.998, tipo: 'hito', color: '#10B981', icono: 'play_arrow' },
      { id: 'demora-0', lat: -12.0, lng: -77.0, tipo: 'demora', color: '#F59E0B', icono: 'warning' },
      { id: 'demora-1', lat: -11.88, lng: -77.12, tipo: 'demora', color: '#7C3AED', icono: 'hourglass_top' },
      { id: 'actual', lat: -11.8765, lng: -77.128, tipo: 'actual', color: '#2563EB', icono: 'navigation', pulso: true },
    ] satisfies MarcadorMapa[]);
    fixture.componentRef.setInput('ruta', { puntos: [[-12.146, -76.998], [-12.0464, -77.0428], [-11.8765, -77.128]] });
    fixture.componentRef.setInput('circulo', { lat: -11.8762, lng: -77.1283, radioM: 300 });
    await fixture.whenStable();

    expect(pines().length).toBe(5);
    expect(host().querySelectorAll('.mapa-seg-pin--demora').length).toBe(2);
    expect(host().querySelector('.mapa-seg-pin--pulso')).not.toBeNull();
    expect(host().querySelectorAll('.leaflet-overlay-pane path').length).toBe(2);   // polilínea + círculo

    fixture.componentRef.setInput('ruta', null);
    fixture.componentRef.setInput('circulo', null);
    await fixture.whenStable();
    expect(host().querySelectorAll('.leaflet-overlay-pane path').length).toBe(0);
  });

  it('los textos del backend se muestran como texto, nunca como HTML (popup y pin)', async () => {
    const malicioso = '<img src=x onerror="window.__xss=1">Pedro';
    fixture.componentRef.setInput('marcadores', [
      tecnico(1, { texto: malicioso, popup: [malicioso, '<b>negrita</b>'], titulo: malicioso }),
    ]);
    await fixture.whenStable();
    const pin = host().querySelector('.mapa-seg-pin') as HTMLElement;
    expect(pin.querySelector('img')).toBeNull();
    expect(pin.textContent).toContain('<img');

    (host().querySelector('.leaflet-marker-icon') as HTMLElement).click();   // abre el popup
    await fixture.whenStable();
    const popup = host().querySelector('.mapa-seg-popup__cuerpo') as HTMLElement;
    expect(popup).not.toBeNull();
    expect(popup.querySelector('img')).toBeNull();
    expect(popup.querySelector('b')).toBeNull();
    expect(popup.textContent).toContain('<b>negrita</b>');
  });

  it('el botón del popup emite marcadorClic con el id del marcador', async () => {
    const emitidos: (string | number)[] = [];
    fixture.componentInstance.marcadorClic.subscribe(id => emitidos.push(id));
    fixture.componentRef.setInput('marcadores', [tecnico(7)]);
    await fixture.whenStable();
    (host().querySelector('.leaflet-marker-icon') as HTMLElement).click();
    await fixture.whenStable();
    (host().querySelector('.mapa-seg-popup__accion') as HTMLButtonElement).click();
    expect(emitidos).toEqual([7]);
  });

  it('se destruye sin errores y libera el mapa', () => {
    fixture.componentRef.setInput('marcadores', [tecnico(1)]);
    expect(() => fixture.destroy()).not.toThrow();
    expect(host().querySelector('.leaflet-map-pane')).toBeNull();   // Leaflet retiró sus paneles del DOM
  });
});
