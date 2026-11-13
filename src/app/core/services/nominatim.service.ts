import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Cliente ligero para el reverse geocoding público de OpenStreetMap (Nominatim).
 *
 * Lo usamos solo para OBTENER UNA DIRECCIÓN LEGIBLE a partir de un punto en el
 * mapa (modal de Sede del cliente). El ubigeo (departamento / provincia /
 * distrito) viene del back TW desde SU PROPIA tabla de polígonos INEI, no de
 * aquí — Nominatim no siempre acierta con los nombres oficiales peruanos.
 *
 * Política de uso de Nominatim: 1 req/seg. Como lo invocamos solo cuando el
 * usuario mueve el pin en el modal, estamos bien.
 * Docs: https://operations.osmfoundation.org/policies/nominatim/
 */
export interface NominatimReverseResultado {
  /** Texto largo tipo "Calle Los Constructores 123, La Molina, Lima, Perú". */
  direccion: string | null;
  /** Mejor aproximación a "dirección exacta" sin el país / ciudad / distrito. */
  direccionCorta: string | null;
}

@Injectable({ providedIn: 'root' })
export class NominatimService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://nominatim.openstreetmap.org/reverse';

  async reverse(lat: number, lng: number): Promise<NominatimReverseResultado> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { direccion: null, direccionCorta: null };
    }
    try {
      const r = await firstValueFrom(
        this.http.get<NominatimResponse>(this.base, {
          params: {
            format:         'json',
            lat:            String(lat),
            lon:            String(lng),
            zoom:           '18',
            addressdetails: '1',
            'accept-language': 'es',
          },
        }),
      );
      return {
        direccion:      r.display_name ?? null,
        direccionCorta: this.armarDireccionCorta(r.address),
      };
    } catch {
      return { direccion: null, direccionCorta: null };
    }
  }

  /**
   * Construye una dirección corta sin repetir la ciudad / provincia / país.
   * Toma `road + house_number` cuando están disponibles; si no, cae a
   * `neighbourhood` / `suburb` / `hamlet` / `village`.
   */
  private armarDireccionCorta(addr?: NominatimAddress): string | null {
    if (!addr) return null;
    const road = (addr.road ?? addr.pedestrian ?? addr.footway ?? '').trim();
    const num  = (addr.house_number ?? '').trim();
    if (road) return num ? `${road} ${num}` : road;
    const barrio = (addr.neighbourhood ?? addr.suburb ?? addr.hamlet ?? addr.village ?? '').trim();
    return barrio || null;
  }
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

interface NominatimAddress {
  road?:          string;
  pedestrian?:    string;
  footway?:       string;
  house_number?:  string;
  neighbourhood?: string;
  suburb?:        string;
  hamlet?:        string;
  village?:       string;
}
