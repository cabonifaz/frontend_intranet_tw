import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoClienteRequest,
  CambiarEstadoContactoRequest,
  CambiarEstadoSedeRequest,
  CatalogoItem,
  ClienteDetalle,
  ClienteListaItem,
  ContactoListaItem,
  GuardarClienteRequest,
  GuardarContactoRequest,
  GuardarSedeRequest,
  SedeListaItem,
} from '../models/maestros.model';

@Injectable({ providedIn: 'root' })
export class MaestrosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerClientes(busqueda?: string, estado?: string): Promise<ClienteListaItem[]> {
    const params: Record<string, string> = {};
    if (busqueda) params['busqueda'] = busqueda;
    if (estado)   params['estado']   = estado;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ClienteListaItem[]>>(`${this.base}/clientes`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerClientePorId(id: number): Promise<ClienteDetalle> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ClienteDetalle>>(`${this.base}/clientes/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarCliente(dto: GuardarClienteRequest): Promise<number> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/clientes`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async obtenerCatalogo(descripcion: string): Promise<CatalogoItem[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CatalogoItem[]>>(`${this.base}/catalogos/${descripcion}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerSedesPorCliente(idCliente: number): Promise<SedeListaItem[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SedeListaItem[]>>(`${this.base}/clientes/${idCliente}/sedes`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarSede(dto: GuardarSedeRequest): Promise<number> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/sedes`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoSede(dto: CambiarEstadoSedeRequest): Promise<void> {
    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/sedes/${dto.idSede}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  async obtenerContactosPorCliente(idCliente: number): Promise<ContactoListaItem[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ContactoListaItem[]>>(`${this.base}/clientes/${idCliente}/contactos`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarContacto(dto: GuardarContactoRequest): Promise<number> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/contactos`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoContacto(dto: CambiarEstadoContactoRequest): Promise<void> {
    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/contactos/${dto.idContacto}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  async cambiarEstadoCliente(dto: CambiarEstadoClienteRequest): Promise<void> {
    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/clientes/${dto.idCliente}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }
}
