import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoCategoriaRequest,
  CambiarEstadoClienteRequest,
  CambiarEstadoContactoRequest,
  CambiarEstadoSedeRequest,
  CatalogoItem,
  CategoriaCliente,
  ClienteDetalle,
  ClienteListaItem,
  ClientesPaginado,
  ContactoListaItem,
  GuardarCategoriaRequest,
  GuardarClienteRequest,
  GuardarContactoRequest,
  GuardarSedeRequest,
  SedeListaItem,
} from '../models/maestros.model';

@Injectable({ providedIn: 'root' })
export class MaestrosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerClientes(
    busqueda?: string,
    estado?: string,
    pagina = 1,
    porPagina = 20,
  ): Promise<ClientesPaginado> {
    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda) params['busqueda'] = busqueda;
    if (estado)   params['estado']   = estado;

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ClientesPaginado>>(`${this.base}/clientes`, { params })
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

  /**
   * Agrega un valor a una categoría genérica de tabla_maestra via SP_AgregarItemCatalogo.
   * Usado por el modal "Nueva área" de Usuarios, y los modales de Suministros ya existentes.
   */
  async agregarItemCatalogo(descripcion: string, string1: string, string2?: string): Promise<{ id: number; nombre: string; codigo: string }> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<{ id: number; nombre: string; codigo: string }>>(
        `${this.base}/catalogos/${descripcion}`,
        { string1, string2: string2 ?? this.slugificar(string1) },
      )
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  /**
   * Renombra la etiqueta visible (String1) de un ítem del catálogo. El código
   * (String2) no cambia porque otras tablas lo referencian. Vía SP_EditarItemCatalogo.
   */
  async editarItemCatalogo(descripcion: string, codigo: string, string1: string): Promise<{ id: number; nombre: string; codigo: string }> {
    const r = await firstValueFrom(
      this.http.put<RespuestaApi<{ id: number; nombre: string; codigo: string }>>(
        `${this.base}/catalogos/${descripcion}/${codigo}`,
        { string1 },
      )
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  /** Genera un código estable para `string2` a partir del nombre (igual al patrón que usa el back). */
  private slugificar(nombre: string): string {
    return nombre.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
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

  async obtenerCategorias(): Promise<CategoriaCliente[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CategoriaCliente[]>>(`${this.base}/categorias`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarCategoria(dto: GuardarCategoriaRequest): Promise<number> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/categorias`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoCategoria(dto: CambiarEstadoCategoriaRequest): Promise<void> {
    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/categorias/${dto.idCategoria}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }
}
