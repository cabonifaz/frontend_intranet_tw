import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  RequerimientosPaginado,
  CatalogosRequerimiento,
  RequerimientoFicha,
  GuardarRequerimientoComando,
  AnularRequerimientoComando,
} from '../models/crm.model';

const TIMEOUT_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm`;

  private readonly _catalogos = signal<CatalogosRequerimiento | null>(null);

  async obtenerRequerimientos(
    estado?: string,
    busqueda?: string,
    pagina = 1,
    porPagina = 10,
  ): Promise<RequerimientosPaginado> {
    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (estado)   params['estado']   = estado;
    if (busqueda) params['busqueda'] = busqueda;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<RequerimientosPaginado>>(
        `${this.base}/requerimientos`, { params }
      ).pipe(timeout(TIMEOUT_MS))
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerCatalogos(forzar = false): Promise<CatalogosRequerimiento> {
    if (!forzar && this._catalogos()) return this._catalogos()!;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CatalogosRequerimiento>>(
        `${this.base}/requerimientos/catalogos`
      ).pipe(timeout(TIMEOUT_MS))
    );
    if (!r.datos) throw new Error(r.mensaje);
    this._catalogos.set(r.datos);
    return r.datos;
  }

  async obtenerRequerimientoPorId(id: number): Promise<RequerimientoFicha> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<RequerimientoFicha>>(
        `${this.base}/requerimientos/${id}`
      ).pipe(timeout(TIMEOUT_MS))
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async anularRequerimiento(id: number, comando: AnularRequerimientoComando): Promise<void> {
    try {
      const r = await firstValueFrom(
        this.http.patch<RespuestaApi<number>>(
          `${this.base}/requerimientos/${id}/anular`, comando
        ).pipe(timeout(TIMEOUT_MS))
      );
      if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    } catch (e) {
      throw e instanceof HttpErrorResponse
        ? new Error(e.error?.mensaje ?? e.statusText)
        : e;
    }
  }

  async guardarRequerimiento(comando: GuardarRequerimientoComando): Promise<number> {
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaApi<number>>(
          `${this.base}/requerimientos`, comando
        ).pipe(timeout(TIMEOUT_MS))
      );
      if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
      return r.datos ?? 0;
    } catch (e) {
      throw e instanceof HttpErrorResponse
        ? new Error(e.error?.mensaje ?? e.statusText)
        : e;
    }
  }
}
