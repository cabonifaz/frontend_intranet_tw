import {
  Component, ElementRef, NgZone, OnDestroy, ViewEncapsulation, afterNextRender, computed, effect, inject,
  input, output, signal, untracked, viewChild,
} from '@angular/core';
import * as L from 'leaflet';

/** Un marcador del mapa. Todos los textos son planos (se insertan con textContent, nunca como HTML). */
export interface MarcadorMapa {
  /** Identificador estable: permite actualizar el marcador en cada refresco sin cerrar su popup. */
  id:      string | number;
  lat:     number;
  lng:     number;
  tipo:    'tecnico' | 'actual' | 'planta' | 'hito' | 'demora';
  /** Color de relleno del pin (hex). */
  color:   string;
  /** Texto dentro del pin (iniciales del técnico). */
  texto?:  string;
  /** Nombre de un símbolo de Material Symbols (si no hay `texto`). */
  icono?:  string;
  /** Tooltip nativo del navegador al pasar el mouse. */
  titulo?: string;
  /** Líneas del popup: la primera va en negrita. */
  popup?:  string[];
  /** Si se indica, el popup lleva un botón con este texto que dispara `marcadorClic`. */
  accion?: string;
  /** Anillo pulsante (posición actual en vivo). */
  pulso?:  boolean;
  /** Prioridad de apilado (mayor = encima). */
  prioridad?: number;
}

export interface RutaMapa {
  puntos: [number, number][];
  color?: string;
}

export interface CirculoMapa {
  lat:     number;
  lng:     number;
  radioM:  number;
  color?:  string;
}

/** Lima: vista por defecto cuando no hay ninguna posición. */
const CENTRO_LIMA: L.LatLngTuple = [-12.0464, -77.0428];
const ZOOM_LIMA = 11;
const ZOOM_MAXIMO_AJUSTE = 16;

const TAMANO_PIN: Record<MarcadorMapa['tipo'], number> = {
  tecnico: 38, actual: 36, planta: 34, hito: 28, demora: 30,
};

/**
 * Mapa Leaflet + OpenStreetMap reutilizable del Seguimiento Operativo.
 *
 *  - Vista Principal: un pin por técnico (color según estado) con popup.
 *  - Mapa GPS del servicio: ruta recorrida, posición actual, planta del cliente con círculo de
 *    proximidad, hitos y demoras.
 *
 * El mapa se crea una sola vez (y se destruye con el componente); cuando cambian los inputs solo se
 * actualizan las capas, sin recrearlas, para no perder el zoom/desplazamiento ni los popups abiertos.
 * Los íconos son `L.divIcon` (HTML/CSS), así que no dependen de las imágenes por defecto de Leaflet,
 * que se rompen con el bundler.
 *
 * Plantilla y estilos inline y `ViewEncapsulation.None` porque los pines y popups los crea Leaflet
 * fuera de la plantilla de Angular (no llevan los atributos de encapsulación).
 */
@Component({
  selector: 'app-mapa-seguimiento',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="mapa-seg" [style.height]="altura()">
      <div #lienzo class="mapa-seg__lienzo"></div>

      @if (mostrarAviso()) {
        <div class="mapa-seg__aviso" role="status">
          <span class="material-symbols-outlined">location_off</span>
          {{ mensajeVacio() }}
        </div>
      }
      @if (hayDatos()) {
        <button type="button" class="mapa-seg__centrar" title="Centrar el mapa en los puntos" (click)="centrar()">
          <span class="material-symbols-outlined">center_focus_strong</span>
          Centrar
        </button>
      }
    </div>
  `,
  styles: [`
    app-mapa-seguimiento { display: block; }
    .mapa-seg {
      position: relative; isolation: isolate; width: 100%; min-height: 240px;
      border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background: #E5E7EB;
    }
    .mapa-seg__lienzo { position: absolute; inset: 0; z-index: 0; }
    .mapa-seg .leaflet-container { font-family: inherit; }

    .mapa-seg__aviso {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 1100;
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
      background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 999px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
      color: #475569; font-size: 12.5px; font-weight: 600; pointer-events: none; white-space: nowrap;
    }
    .mapa-seg__aviso .material-symbols-outlined { font-size: 18px; color: #94A3B8; }

    .mapa-seg__centrar {
      position: absolute; top: 10px; right: 10px; z-index: 1100;
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
      background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.2);
      color: #1D4ED8; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .mapa-seg__centrar:hover { background: #EFF6FF; }
    .mapa-seg__centrar .material-symbols-outlined { font-size: 16px; }

    /* ── Pines (L.divIcon) ───────────────────────────────────────────── */
    .mapa-seg-icono { background: transparent; border: 0; }
    .mapa-seg-pin {
      position: relative; box-sizing: border-box; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid #FFFFFF; border-radius: 50%;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.45);
      color: #FFFFFF; font: 700 12px/1 Inter, system-ui, sans-serif; letter-spacing: 0.2px;
    }
    .mapa-seg-pin .material-symbols-outlined { font-size: 18px; color: #FFFFFF; line-height: 1; }
    .mapa-seg-pin--planta { border-radius: 9px; }
    .mapa-seg-pin--hito { border-width: 2px; }
    .mapa-seg-pin--hito .material-symbols-outlined,
    .mapa-seg-pin--demora .material-symbols-outlined { font-size: 16px; }
    .mapa-seg-pin--pulso::after {
      content: ''; position: absolute; inset: -9px; border-radius: 50%;
      border: 2px solid currentColor; opacity: 0;
      animation: mapa-seg-pulso 2s ease-out infinite;
    }
    @keyframes mapa-seg-pulso {
      0%   { transform: scale(0.6); opacity: 0.7; }
      100% { transform: scale(1.25); opacity: 0; }
    }

    /* ── Popup ───────────────────────────────────────────────────────── */
    .mapa-seg-popup .leaflet-popup-content { margin: 10px 12px; font-size: 12.5px; line-height: 1.45; }
    .mapa-seg-popup__cuerpo { display: flex; flex-direction: column; gap: 2px; color: #334155; }
    .mapa-seg-popup__cuerpo strong { color: #0F172A; font-size: 13px; }
    .mapa-seg-popup__accion {
      margin-top: 8px; padding: 5px 10px; align-self: flex-start;
      background: #2563EB; color: #FFFFFF; border: 0; border-radius: 6px;
      font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .mapa-seg-popup__accion:hover { background: #1D4ED8; }
  `],
})
export class MapaSeguimientoComponent implements OnDestroy {
  private readonly zona = inject(NgZone);
  private readonly lienzo = viewChild.required<ElementRef<HTMLDivElement>>('lienzo');

  readonly marcadores   = input<MarcadorMapa[]>([]);
  readonly ruta         = input<RutaMapa | null>(null);
  readonly circulo      = input<CirculoMapa | null>(null);
  readonly mensajeVacio = input<string>('Sin posiciones GPS hoy');
  /** Fuerza el aviso aunque haya marcadores fijos (ej. el pin de la planta del cliente cuando el técnico aún no envió GPS).
   *  Si no se indica, el aviso aparece cuando el mapa no tiene ningún marcador ni ruta. */
  readonly sinPosiciones = input<boolean | null>(null);
  readonly altura       = input<string>('380px');
  /** Cuando cambia, el próximo refresco vuelve a ajustar el zoom a los puntos (ej. al abrir otro servicio). */
  readonly claveAjuste  = input<string | number | null>(null);

  readonly marcadorClic = output<string | number>();

  readonly hayDatos = signal(false);
  readonly mostrarAviso = computed(() => this.sinPosiciones() ?? !this.hayDatos());

  private readonly listo = signal(false);
  private mapa: L.Map | null = null;
  private observador: ResizeObserver | null = null;
  private fotogramaResize = 0;

  private readonly capaMarcadores = new Map<string | number, { marcador: L.Marker; firma: string }>();
  private polilinea: L.Polyline | null = null;
  private circuloCapa: L.Circle | null = null;

  /** Qué marcadores/ruta había la última vez que se encuadró la vista (null = aún no se encuadró). */
  private firmaEncuadre: string | null = null;
  private ultimaClaveAjuste: string | number | null | undefined = undefined;

  constructor() {
    afterNextRender(() => {
      this.crearMapa();
      this.listo.set(true);
    });

    // Los datos hacen que se actualicen las capas del mapa ya creado (nunca se recrea el mapa)
    effect(() => {
      const listo = this.listo();
      const marcadores = this.marcadores();
      const ruta = this.ruta();
      const circulo = this.circulo();
      const clave = this.claveAjuste();
      if (!listo) return;
      untracked(() => this.sincronizar(marcadores, ruta, circulo, clave));
    });
  }

  ngOnDestroy(): void {
    if (this.fotogramaResize) cancelAnimationFrame(this.fotogramaResize);
    this.observador?.disconnect();
    this.observador = null;
    this.capaMarcadores.clear();
    this.polilinea = null;
    this.circuloCapa = null;
    this.mapa?.remove();   // libera el mapa, sus capas y los listeners del DOM
    this.mapa = null;
  }

  /** Botón "Centrar": vuelve a encuadrar todos los puntos. */
  centrar(): void {
    this.ajustarVista();
  }

  // ─── Creación (una sola vez) ──────────────────────────────────────────────

  private crearMapa(): void {
    const contenedor = this.lienzo().nativeElement;
    this.zona.runOutsideAngular(() => {
      const mapa = L.map(contenedor, { center: CENTRO_LIMA, zoom: ZOOM_LIMA, zoomControl: true, scrollWheelZoom: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).addTo(mapa);

      // La rueda del mouse solo hace zoom cuando el mapa está activo (clic), para no secuestrar el scroll de la página
      mapa.on('click', () => mapa.scrollWheelZoom.enable());
      mapa.getContainer().addEventListener('mouseleave', () => mapa.scrollWheelZoom.disable());

      this.mapa = mapa;

      // El contenedor puede medir 0 al crearse (modal animándose, pestaña que recién aparece):
      // cada cambio de tamaño recalcula el mapa
      if (typeof ResizeObserver !== 'undefined') {
        this.observador = new ResizeObserver(() => {
          if (this.fotogramaResize) cancelAnimationFrame(this.fotogramaResize);
          this.fotogramaResize = requestAnimationFrame(() => this.mapa?.invalidateSize());
        });
        this.observador.observe(contenedor);
      }
      setTimeout(() => this.mapa?.invalidateSize(), 0);
    });
  }

  // ─── Sincronización de capas (en cada cambio de datos) ───────────────────

  private sincronizar(
    marcadores: MarcadorMapa[], ruta: RutaMapa | null, circulo: CirculoMapa | null,
    clave: string | number | null,
  ): void {
    const mapa = this.mapa;
    if (!mapa) return;

    if (this.ultimaClaveAjuste !== undefined && clave !== this.ultimaClaveAjuste) this.firmaEncuadre = null;
    this.ultimaClaveAjuste = clave;

    this.zona.runOutsideAngular(() => {
      this.sincronizarMarcadores(mapa, marcadores);
      this.sincronizarRuta(mapa, ruta);
      this.sincronizarCirculo(mapa, circulo);
    });

    const hay = this.capaMarcadores.size > 0 || !!this.polilinea;
    this.hayDatos.set(hay);

    // Se encuadra la primera vez, y cuando aparece o desaparece un marcador o la ruta (ej. llega la primera posición GPS
    // después de que solo estaba la planta). Los refrescos en los que solo se mueven los puntos no tocan la vista.
    const firma = [...this.capaMarcadores.keys()].map(String).sort().join('|') + (this.polilinea ? '|ruta' : '');
    if (hay && firma !== this.firmaEncuadre) {
      this.ajustarVista();
      this.firmaEncuadre = firma;
    } else if (!hay && this.firmaEncuadre === null) {
      mapa.setView(CENTRO_LIMA, ZOOM_LIMA);
    }
  }

  private sincronizarMarcadores(mapa: L.Map, marcadores: MarcadorMapa[]): void {
    const vigentes = new Set<string | number>();
    for (const m of marcadores) {
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) continue;
      vigentes.add(m.id);
      const firma = `${m.tipo}|${m.color}|${m.texto ?? ''}|${m.icono ?? ''}|${m.pulso ? 1 : 0}`;
      const existente = this.capaMarcadores.get(m.id);

      if (existente) {
        existente.marcador.setLatLng([m.lat, m.lng]);
        if (existente.firma !== firma) {
          existente.marcador.setIcon(this.crearIcono(m));
          existente.firma = firma;
        }
        existente.marcador.setZIndexOffset(m.prioridad ?? 0);
        // setContent en un popup abierto lo actualiza en el lugar (no se cierra en cada refresco)
        const popup = existente.marcador.getPopup();
        if (m.popup?.length) {
          const contenido = this.crearContenidoPopup(m);
          if (popup) popup.setContent(contenido); else existente.marcador.bindPopup(contenido, this.opcionesPopup());
        } else if (popup) {
          existente.marcador.unbindPopup();
        }
        continue;
      }

      const marcador = L.marker([m.lat, m.lng], {
        icon: this.crearIcono(m),
        title: m.titulo ?? '',
        alt: m.titulo ?? '',
        zIndexOffset: m.prioridad ?? 0,
      });
      if (m.popup?.length) marcador.bindPopup(this.crearContenidoPopup(m), this.opcionesPopup());
      marcador.addTo(mapa);
      this.capaMarcadores.set(m.id, { marcador, firma });
    }

    for (const [id, capa] of this.capaMarcadores) {
      if (!vigentes.has(id)) {
        capa.marcador.remove();
        this.capaMarcadores.delete(id);
      }
    }
  }

  private sincronizarRuta(mapa: L.Map, ruta: RutaMapa | null): void {
    const puntos = ruta?.puntos ?? [];
    if (puntos.length < 2) {
      this.polilinea?.remove();
      this.polilinea = null;
      return;
    }
    const color = ruta?.color ?? '#2563EB';
    if (this.polilinea) {
      this.polilinea.setLatLngs(puntos);
      this.polilinea.setStyle({ color });
    } else {
      this.polilinea = L.polyline(puntos, { color, weight: 4, opacity: 0.8, lineJoin: 'round' }).addTo(mapa);
    }
  }

  private sincronizarCirculo(mapa: L.Map, circulo: CirculoMapa | null): void {
    if (!circulo || !Number.isFinite(circulo.lat) || !Number.isFinite(circulo.lng) || !(circulo.radioM > 0)) {
      this.circuloCapa?.remove();
      this.circuloCapa = null;
      return;
    }
    const color = circulo.color ?? '#DC2626';
    if (this.circuloCapa) {
      this.circuloCapa.setLatLng([circulo.lat, circulo.lng]);
      this.circuloCapa.setRadius(circulo.radioM);
      this.circuloCapa.setStyle({ color, fillColor: color });
    } else {
      this.circuloCapa = L.circle([circulo.lat, circulo.lng], {
        radius: circulo.radioM, color, weight: 2, dashArray: '6 4', fillColor: color, fillOpacity: 0.12,
      }).addTo(mapa);
    }
  }

  private ajustarVista(): void {
    const mapa = this.mapa;
    if (!mapa) return;
    const puntos: L.LatLng[] = [];
    for (const { marcador } of this.capaMarcadores.values()) puntos.push(marcador.getLatLng());
    if (this.polilinea) puntos.push(...(this.polilinea.getLatLngs() as L.LatLng[]));
    const limites = L.latLngBounds(puntos);
    if (this.circuloCapa) limites.extend(this.circuloCapa.getBounds());
    if (!limites.isValid()) {
      mapa.setView(CENTRO_LIMA, ZOOM_LIMA);
      return;
    }
    mapa.invalidateSize();
    mapa.fitBounds(limites, { padding: [36, 36], maxZoom: ZOOM_MAXIMO_AJUSTE });
  }

  // ─── Íconos y popups (siempre con textContent: los textos vienen del backend/usuarios) ────

  private crearIcono(m: MarcadorMapa): L.DivIcon {
    const tamano = TAMANO_PIN[m.tipo];
    const el = document.createElement('div');
    el.className = `mapa-seg-pin mapa-seg-pin--${m.tipo}` + (m.pulso ? ' mapa-seg-pin--pulso' : '');
    el.style.background = m.color;
    el.style.color = m.color;   // lo usa el anillo pulsante (currentColor)
    if (m.texto) {
      const t = document.createElement('span');
      t.textContent = m.texto;
      t.style.color = '#FFFFFF';
      el.appendChild(t);
    } else if (m.icono) {
      const s = document.createElement('span');
      s.className = 'material-symbols-outlined';
      s.textContent = m.icono;
      el.appendChild(s);
    }
    return L.divIcon({
      html: el, className: 'mapa-seg-icono',
      iconSize: [tamano, tamano], iconAnchor: [tamano / 2, tamano / 2], popupAnchor: [0, -tamano / 2],
    });
  }

  private opcionesPopup(): L.PopupOptions {
    return { maxWidth: 280, className: 'mapa-seg-popup' };
  }

  private crearContenidoPopup(m: MarcadorMapa): HTMLElement {
    const cuerpo = document.createElement('div');
    cuerpo.className = 'mapa-seg-popup__cuerpo';
    (m.popup ?? []).forEach((linea, i) => {
      const el = document.createElement(i === 0 ? 'strong' : 'span');
      el.textContent = linea;
      cuerpo.appendChild(el);
    });
    if (m.accion) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'mapa-seg-popup__accion';
      boton.textContent = m.accion;
      boton.addEventListener('click', () => this.zona.run(() => this.marcadorClic.emit(m.id)));
      cuerpo.appendChild(boton);
    }
    return cuerpo;
  }
}
