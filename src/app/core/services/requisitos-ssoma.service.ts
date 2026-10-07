import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import { CatalogoItem } from '../models/maestros.model';
import { MaestrosService } from './maestros.service';

/**
 * Requisito SSOMA del catálogo global (tabla_maestra IdMaestro=48). Equivale
 * a `CatalogoItem` pero con nombre semántico para la UI de mantenimiento.
 */
export interface RequisitoSsoma {
  id: number;        // Num1
  codigo: string;    // String2 (código estable usado en las asignaciones)
  nombre: string;    // String1 (etiqueta visible)
}

/** Requisito asignado a un cliente (lista marcada en la sección SSOMA de la ficha). */
export interface RequisitoSsomaCliente {
  codigo: string;
  nombre: string;
}

/**
 * Mantenimiento del catálogo "Requisitos SSOMA" (compartido entre todos los
 * clientes) + asignación por cliente.
 *
 * Catálogo global (tabla_maestra IdMaestro=48 REQUISITO_SSOMA):
 *   - Listar: GET /api/maestros/catalogos/REQUISITO_SSOMA
 *   - Crear:  POST /api/maestros/catalogos/REQUISITO_SSOMA
 *   - Editar: PUT /api/maestros/catalogos/REQUISITO_SSOMA/:codigo
 *
 * Asignaciones por cliente (tabla requisito_ssoma_cliente):
 *   - Listar: GET /api/maestros/clientes/:idCliente/requisitos-ssoma
 *   - Sincronizar: PUT /api/maestros/clientes/:idCliente/requisitos-ssoma
 */
@Injectable({ providedIn: 'root' })
export class RequisitosSsomaService {
  private readonly http = inject(HttpClient);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly base = `${environment.apiUrl}/api/maestros`;
  private readonly CATEGORIA = 'REQUISITO_SSOMA';

  async listar(): Promise<RequisitoSsoma[]> {
    const r = await this.maestrosSvc.obtenerCatalogo(this.CATEGORIA);
    return r
      .filter(c => !!c.codigo)
      .map(c => ({ id: c.id, codigo: c.codigo!, nombre: c.nombre }));
  }

  async crear(nombre: string, codigo?: string): Promise<RequisitoSsoma> {
    const r = await this.maestrosSvc.agregarItemCatalogo(this.CATEGORIA, nombre.trim(), codigo?.trim());
    return { id: r.id, codigo: r.codigo, nombre: r.nombre };
  }

  async renombrar(codigo: string, nombreNuevo: string): Promise<RequisitoSsoma> {
    const r = await this.maestrosSvc.editarItemCatalogo(this.CATEGORIA, codigo, nombreNuevo.trim());
    return { id: r.id, codigo: r.codigo, nombre: r.nombre };
  }

  // ─── Asignaciones por cliente ─────────────────────────────────────────────
  async obtenerDelCliente(idCliente: number): Promise<RequisitoSsomaCliente[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<RequisitoSsomaCliente[]>>(
        `${this.base}/clientes/${idCliente}/requisitos-ssoma`,
      )
    );
    return r.datos ?? [];
  }

  /**
   * Reemplaza la lista completa de requisitos asignados al cliente.
   * `codigos = []` quita todos. `codigos = null/undefined` no cambia nada.
   */
  async sincronizarDelCliente(idCliente: number, codigos: string[]): Promise<void> {
    const r = await firstValueFrom(
      this.http.put<RespuestaApi<null>>(
        `${this.base}/clientes/${idCliente}/requisitos-ssoma`,
        { codigos },
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }
}
