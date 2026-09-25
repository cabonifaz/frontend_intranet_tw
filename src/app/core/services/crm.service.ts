import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  RequerimientosPaginado,
  CatalogosRequerimiento,
  RequerimientoFicha,
  GuardarRequerimientoComando,
} from '../models/crm.model';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm`;

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
      )
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerCatalogos(): Promise<CatalogosRequerimiento> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CatalogosRequerimiento>>(
        `${this.base}/requerimientos/catalogos`
      )
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerRequerimientoPorId(id: number): Promise<RequerimientoFicha> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<RequerimientoFicha>>(
        `${this.base}/requerimientos/${id}`
      )
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarRequerimiento(comando: GuardarRequerimientoComando): Promise<number> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(
        `${this.base}/requerimientos`, comando
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos ?? 0;
  }
}
