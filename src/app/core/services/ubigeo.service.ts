import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';

/**
 * Item devuelto por los endpoints de ubigeo INEI del back.
 * `codigo` es el código INEI (2 dígitos departamento, 4 provincia, 6 distrito);
 * `nombre` es el nombre legible y es lo que se usa como filtro en el cascade
 * (SP_ObtenerUbigeo filtra por `departamento = X` y `provincia = Y`).
 */
export interface UbigeoItem {
  codigo: string;
  nombre: string;
}

/** Entidades soportadas por `GET /api/maestros/siguiente-codigo/{entidad}`. */
export type EntidadSiguienteCodigo = 'requerimiento' | 'propuesta' | 'suministro' | 'equipo_cliente';

export interface SiguienteCodigo {
  entidad: string;
  codigo:  string;
}

/**
 * Cascada ubigeo INEI (sedes del cliente).
 *   GET /api/maestros/ubigeo/departamentos
 *   GET /api/maestros/ubigeo/provincias?departamento=X
 *   GET /api/maestros/ubigeo/distritos?departamento=X&provincia=Y
 */
@Injectable({ providedIn: 'root' })
export class UbigeoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros/ubigeo`;

  // Cache simple en memoria: los departamentos se cargan solo una vez y las
  // provincias/distritos por combinación padre (no hay motivo para refetchear
  // dentro de la misma sesión — el ubigeo INEI es estable).
  private cacheDepartamentos: UbigeoItem[] | null = null;
  private readonly cacheProvincias = new Map<string, UbigeoItem[]>();
  private readonly cacheDistritos  = new Map<string, UbigeoItem[]>();

  async obtenerDepartamentos(): Promise<UbigeoItem[]> {
    if (this.cacheDepartamentos) return this.cacheDepartamentos;
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<UbigeoItem[]>>(`${this.base}/departamentos`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    this.cacheDepartamentos = r.datos;
    return r.datos;
  }

  async obtenerProvincias(departamento: string): Promise<UbigeoItem[]> {
    const key = departamento.trim();
    if (!key) return [];
    const cached = this.cacheProvincias.get(key);
    if (cached) return cached;
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<UbigeoItem[]>>(`${this.base}/provincias`, {
        params: { departamento: key },
      })
    );
    if (!r.datos) throw new Error(r.mensaje);
    this.cacheProvincias.set(key, r.datos);
    return r.datos;
  }

  async obtenerDistritos(departamento: string, provincia: string): Promise<UbigeoItem[]> {
    const dep  = departamento.trim();
    const prov = provincia.trim();
    if (!dep || !prov) return [];
    const key = `${dep}|${prov}`;
    const cached = this.cacheDistritos.get(key);
    if (cached) return cached;
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<UbigeoItem[]>>(`${this.base}/distritos`, {
        params: { departamento: dep, provincia: prov },
      })
    );
    if (!r.datos) throw new Error(r.mensaje);
    this.cacheDistritos.set(key, r.datos);
    return r.datos;
  }
}
