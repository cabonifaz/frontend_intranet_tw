import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import { CumpleanosItem, DirectorioPaginado } from '../models/directorio.model';

/**
 * Directorio Interno (#4303) — contactos del personal activo.
 * Disponible para todo usuario con sesión. Solo lectura.
 */
@Injectable({ providedIn: 'root' })
export class DirectorioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/directorio`;

  async obtenerDirectorio(
    busqueda?: string,
    area?: string,
    pagina = 1,
    porPagina = 50,
  ): Promise<DirectorioPaginado> {
    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda) params['busqueda'] = busqueda;
    if (area)     params['area']     = area;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DirectorioPaginado>>(this.base, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerCumpleanos(mes?: number): Promise<CumpleanosItem[]> {
    const params: Record<string, string> = {};
    if (mes) params['mes'] = mes.toString();

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CumpleanosItem[]>>(`${this.base}/cumpleanos`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }
}
