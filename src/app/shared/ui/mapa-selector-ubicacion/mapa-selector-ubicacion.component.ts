import {
  AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild,
  effect, inject, input, output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

/**
 * Selector de ubicación en el mapa (Leaflet + OpenStreetMap).
 * Reutilizable — hoy lo usa el modal de Sede del cliente para marcar la planta.
 *
 * - Click en el mapa (o drag del marcador) emite `ubicacion` con { lat, lng }.
 * - Botón "Mi ubicación" usa `navigator.geolocation` para centrar donde está el usuario.
 * - Botón "Quitar" borra el pin y emite `null`.
 * - El padre pasa la ubicación inicial vía `lat` + `lng` (ambas o ninguna).
 */
@Component({
  selector: 'app-mapa-selector-ubicacion',
  imports: [CommonModule],
  templateUrl: './mapa-selector-ubicacion.component.html',
  styleUrl: './mapa-selector-ubicacion.component.scss',
})
export class MapaSelectorUbicacionComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);
  /** Si el back marca `aproximado: true` el padre lo pasa acá para pintar el aviso. */
  readonly aproximado = input<boolean>(false);
  /** Altura del contenedor del mapa en pixels (por si el padre quiere ajustarla). */
  readonly alto = input<number>(300);
  readonly deshabilitado = input<boolean>(false);

  readonly ubicacion    = output<{ lat: number; lng: number } | null>();
  readonly miUbicacion  = output<void>();

  @ViewChild('mapaDiv', { static: true }) mapaDiv!: ElementRef<HTMLDivElement>;

  private mapa: L.Map | null = null;
  private marker: L.Marker | null = null;
  /** Centro inicial: Plaza de Armas de Lima (default si no viene lat/lng del padre). */
  private readonly centroPeru: L.LatLngTuple = [-12.0464, -77.0428];

  constructor() {
    // Sincroniza lat/lng del padre con el marker del mapa.
    effect(() => {
      const la = this.lat(), lo = this.lng();
      if (!this.mapa) return;
      if (la == null || lo == null) {
        this.quitarMarker();
        return;
      }
      this.ubicarMarker(la, lo, { centrar: true, zoom: 15 });
    });
  }

  ngAfterViewInit(): void {
    const la = this.lat(), lo = this.lng();
    const centro: L.LatLngTuple = (la != null && lo != null) ? [la, lo] : this.centroPeru;
    const zoom = (la != null && lo != null) ? 15 : 5;

    this.mapa = L.map(this.mapaDiv.nativeElement, {
      center: centro, zoom, zoomControl: true, attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.mapa);

    if (la != null && lo != null) this.ubicarMarker(la, lo);

    this.mapa.on('click', (e: L.LeafletMouseEvent) => {
      if (this.deshabilitado()) return;
      const { lat, lng } = e.latlng;
      this.ubicarMarker(lat, lng);
      this.ubicacion.emit({ lat, lng });
    });

    // Leaflet necesita saber su tamaño cuando el contenedor cambia (modal abriéndose, pestañas).
    setTimeout(() => this.mapa?.invalidateSize(), 50);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = null;
    this.marker = null;
  }

  private ubicarMarker(lat: number, lng: number, opciones?: { centrar?: boolean; zoom?: number }): void {
    if (!this.mapa) return;
    const pos: L.LatLngTuple = [lat, lng];
    if (this.marker) {
      this.marker.setLatLng(pos);
    } else {
      this.marker = L.marker(pos, {
        draggable: !this.deshabilitado(),
        icon: this.icono(),
      }).addTo(this.mapa);
      this.marker.on('dragend', () => {
        const p = this.marker!.getLatLng();
        this.ubicacion.emit({ lat: p.lat, lng: p.lng });
      });
    }
    if (opciones?.centrar) {
      this.mapa.setView(pos, opciones.zoom ?? this.mapa.getZoom());
    }
  }

  private quitarMarker(): void {
    if (this.marker && this.mapa) {
      this.mapa.removeLayer(this.marker);
      this.marker = null;
    }
  }

  // ─── Acciones de la UI ────────────────────────────────────────────────

  pedirMiUbicacion(): void {
    this.miUbicacion.emit();
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        this.ubicarMarker(latitude, longitude, { centrar: true, zoom: 16 });
        this.ubicacion.emit({ lat: latitude, lng: longitude });
      },
      () => { /* silenciamos: el padre ya muestra toast si corresponde */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  quitar(): void {
    this.quitarMarker();
    this.ubicacion.emit(null);
  }

  private icono(): L.DivIcon {
    // Pin SVG inline para no depender de los íconos por defecto de Leaflet
    // (que piden paths de imágenes que se rompen con el builder de Angular).
    return L.divIcon({
      className: 'map-pin',
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 11.3 15 27 15 27s15-15.7 15-27C30 6.7 23.3 0 15 0z" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="15" cy="15" r="5" fill="#FFFFFF"/>
      </svg>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });
  }
}
