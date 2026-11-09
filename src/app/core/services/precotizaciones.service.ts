import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BandejaPrecotizacionesApi, ConvertirPrecotizacionPayload, DetallePrecotizacionApi,
  FiltrosPrecotizacionesQs, PrecargaPrecotizacionApi, PrecotizacionConvertidaApi, RespuestaPrecotApi,
} from '../models/precotizaciones-api.model';

/**
 * HU-60 — Precotizaciones Técnicas (CRM › Propuestas › tab "Precotizaciones Técnicas").
 *
 * Endpoints (PrecotizacionesController):
 *  - GET  /api/crm/precotizaciones                      → bandeja
 *  - GET  /api/crm/precotizaciones/{id}                 → detalle (cabecera + observaciones + items + trazabilidad)
 *  - GET  /api/crm/precotizaciones/{id}/propuesta       → precarga para crear propuesta derivada
 *  - POST /api/crm/precotizaciones/{id}/convertir       → marcar como convertida en una Propuesta ya creada
 *
 * Permisos del back: precot_ver (bandeja/detalle/precarga), precot_convertir (POST).
 */
@Injectable({ providedIn: 'root' })
export class PrecotizacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm/precotizaciones`;

  async obtenerBandeja(filtros?: FiltrosPrecotizacionesQs): Promise<BandejaPrecotizacionesApi> {
    try {
      return await this.get<BandejaPrecotizacionesApi>(this.base, this.aQueryParams(filtros));
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar la bandeja de precotizaciones.');
    }
  }

  async obtenerDetalle(idPrecotizacion: number): Promise<DetallePrecotizacionApi> {
    if (!Number.isInteger(idPrecotizacion) || idPrecotizacion <= 0) throw new Error('La precotización indicada no es válida.');
    try {
      return await this.get<DetallePrecotizacionApi>(`${this.base}/${idPrecotizacion}`);
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar el detalle de la precotización.');
    }
  }

  async obtenerPrecargaPropuesta(idPrecotizacion: number): Promise<PrecargaPrecotizacionApi> {
    if (!Number.isInteger(idPrecotizacion) || idPrecotizacion <= 0) throw new Error('La precotización indicada no es válida.');
    try {
      return await this.get<PrecargaPrecotizacionApi>(`${this.base}/${idPrecotizacion}/propuesta`);
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar la precarga para la nueva propuesta.');
    }
  }

  async convertir(idPrecotizacion: number, datos: ConvertirPrecotizacionPayload): Promise<PrecotizacionConvertidaApi> {
    if (!Number.isInteger(idPrecotizacion) || idPrecotizacion <= 0) throw new Error('La precotización indicada no es válida.');
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaPrecotApi<PrecotizacionConvertidaApi>>(`${this.base}/${idPrecotizacion}/convertir`, datos),
      );
      if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo convertir la precotización.');
      return r.datos;
    } catch (e) {
      throw this.comoError(e, 'No se pudo convertir la precotización.');
    }
  }

  // ─── HTTP ────────────────────────────────────────────────────────────────

  private aQueryParams(filtros?: FiltrosPrecotizacionesQs): HttpParams {
    let p = new HttpParams();
    if (!filtros) return p;
    if (filtros.estado)              p = p.set('estado',       filtros.estado);
    if (filtros.busqueda)            p = p.set('busqueda',     filtros.busqueda);
    if (filtros.idSupervisor != null) p = p.set('idSupervisor', String(filtros.idSupervisor));
    if (filtros.fechaDesde)          p = p.set('fechaDesde',   filtros.fechaDesde);
    if (filtros.fechaHasta)          p = p.set('fechaHasta',   filtros.fechaHasta);
    if (filtros.pagina != null)      p = p.set('pagina',       String(filtros.pagina));
    if (filtros.porPagina != null)   p = p.set('porPagina',    String(filtros.porPagina));
    return p;
  }

  private async get<T>(url: string, params?: HttpParams): Promise<T> {
    const r = await firstValueFrom(this.http.get<RespuestaPrecotApi<T>>(url, { params }));
    if (r.idTipoMensaje !== 2 || r.datos === null || r.datos === undefined) {
      throw new Error(r.mensaje || 'El servidor no devolvió datos.');
    }
    return r.datos;
  }

  private comoError(e: unknown, porDefecto: string): Error {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0)   return new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
      if (e.status === 403) return new Error('No tienes permiso para ver las precotizaciones técnicas.');
      return new Error(porDefecto);
    }
    return e instanceof Error && e.message ? e : new Error(porDefecto);
  }
}
