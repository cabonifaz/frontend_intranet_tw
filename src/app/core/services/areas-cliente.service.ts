import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  AreaCliente,
  CambiarEstadoAreaClienteRequest,
  GuardarAreaClienteRequest,
} from '../models/maestros.model';

/**
 * Mantenimiento de las áreas por cliente. Backing al nuevo CRUD de Bryan
 * (migración 33, SPs SP_ObtenerAreasCliente / SP_GuardarAreaCliente /
 * SP_CambiarEstadoAreaCliente). No es un catálogo global — cada cliente
 * tiene sus propias áreas (ej. "Zona de carnes", "Patio norte").
 */
@Injectable({ providedIn: 'root' })
export class AreasClienteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async listar(idCliente: number, soloActivas = true): Promise<AreaCliente[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<AreaCliente[]>>(
        `${this.base}/clientes/${idCliente}/areas`,
        { params: { soloActivas: String(soloActivas) } },
      )
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  /**
   * Crea (idArea=0) o renombra (idArea>0) un área del cliente.
   * El SP además actualiza automáticamente la ubicación de los equipos
   * del cliente que usaban el nombre anterior.
   */
  async guardar(idCliente: number, dto: GuardarAreaClienteRequest): Promise<{ idArea: number; nombre: string }> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<{ idArea: number; nombre: string }>>(
        `${this.base}/clientes/${idCliente}/areas`,
        dto,
      )
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async cambiarEstado(idArea: number, dto: CambiarEstadoAreaClienteRequest): Promise<void> {
    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/areas-cliente/${idArea}/estado`,
        dto,
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }
}
