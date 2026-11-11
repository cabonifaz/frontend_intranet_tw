import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BandejaInformesApi, CategoriaHistorial, DetalleInformeApi, FiltrosBandejaInformesQs,
  GuardarInformePayload, GuardarPrecotizacionPayload, HistorialInformeApi, InformeGuardadoApi,
  InformeRevisadoApi, PrecotizacionGuardadaApi, PreparacionRevisionApi, RegistrarRevisionPayload,
  RespuestaRevisionApi,
} from '../models/revision-informes-api.model';

/**
 * HU-56 a HU-59 — Servicio Técnico › Revisión de Informes (Sprint 5, Módulo 12).
 *
 * El Supervisor / Jefe de Servicio Técnico revisa los informes que generan sus técnicos desde la app móvil:
 * los edita, registra la precotización cuando hay observaciones y los marca como revisados (inmutables).
 *
 * Endpoints (RevisionTecnicaController):
 *  - GET /api/servicio-tecnico/informes                 → bandeja (HU-56)
 *  - GET /api/servicio-tecnico/informes/exportar        → CSV de la bandeja
 *  - GET /api/servicio-tecnico/informes/{id}            → detalle (HU-57)
 *  - PUT /api/servicio-tecnico/informes/{id}            → editar (HU-58)
 *  - PUT /api/servicio-tecnico/informes/{id}/precotizacion → registrar/actualizar precotización (HU-58 paso 4)
 *  - GET /api/servicio-tecnico/informes/{id}/revision   → preparar revisión (HU-59)
 *  - POST /api/servicio-tecnico/informes/{id}/revision  → confirmar revisión (HU-59)
 *  - GET /api/servicio-tecnico/informes/{id}/historial  → timeline inmutable (HU-57 tab + HU-59)
 *
 * Todas las respuestas vienen en el sobre { idTipoMensaje, mensaje, datos }; cuando idTipoMensaje != 2
 * se lanza un Error con el mensaje del backend para que la pantalla lo muestre.
 */
@Injectable({ providedIn: 'root' })
export class RevisionInformesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/servicio-tecnico/informes`;

  // ─── HU-56 Bandeja ───────────────────────────────────────────────────────

  /** Bandeja completa: tarjetas + items paginados + catálogos de filtros. */
  async obtenerBandeja(filtros?: FiltrosBandejaInformesQs): Promise<BandejaInformesApi> {
    try {
      return await this.get<BandejaInformesApi>(this.base, this.aQueryParams(filtros));
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar la bandeja de informes.');
    }
  }

  // ─── HU-57 Detalle ───────────────────────────────────────────────────────

  /** Detalle completo del informe: cabecera + procedimiento + ensayos + observaciones + recomendaciones + fotos + precotización + historial reciente. */
  async obtenerDetalle(idInforme: number): Promise<DetalleInformeApi> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      return await this.get<DetalleInformeApi>(`${this.base}/${idInforme}`);
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar el detalle del informe.');
    }
  }

  // ─── HU-58 Edición ───────────────────────────────────────────────────────

  /** Guarda cambios de los pasos 1-3 (procedimiento, ensayos, observaciones, recomendaciones, descripción, resultado). */
  async guardarInforme(idInforme: number, datos: GuardarInformePayload): Promise<InformeGuardadoApi> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      const r = await firstValueFrom(
        this.http.put<RespuestaRevisionApi<InformeGuardadoApi>>(`${this.base}/${idInforme}`, datos),
      );
      if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo guardar.');
      return r.datos;
    } catch (e) {
      throw this.comoError(e, 'No se pudo guardar el informe.');
    }
  }

  /** Guarda la precotización (paso 4). Es obligatoria cuando el informe tiene observaciones. */
  async guardarPrecotizacion(idInforme: number, datos: GuardarPrecotizacionPayload): Promise<PrecotizacionGuardadaApi> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      const r = await firstValueFrom(
        this.http.put<RespuestaRevisionApi<PrecotizacionGuardadaApi>>(`${this.base}/${idInforme}/precotizacion`, datos),
      );
      if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la precotización.');
      return r.datos;
    } catch (e) {
      throw this.comoError(e, 'No se pudo registrar la precotización.');
    }
  }

  // ─── HU-59 Revisión e Historial ──────────────────────────────────────────

  /** Preparación del modal Registrar Revisión: cabecera resumen + checklist 5/5 + impacto tras el cierre. */
  async prepararRevision(idInforme: number): Promise<PreparacionRevisionApi> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      return await this.get<PreparacionRevisionApi>(`${this.base}/${idInforme}/revision`);
    } catch (e) {
      throw this.comoError(e, 'No se pudo preparar la revisión.');
    }
  }

  /** Confirma la revisión. El informe queda cerrado e inmutable. */
  async registrarRevision(idInforme: number, datos: RegistrarRevisionPayload): Promise<InformeRevisadoApi> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaRevisionApi<InformeRevisadoApi>>(`${this.base}/${idInforme}/revision`, datos),
      );
      if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la revisión.');
      return r.datos;
    } catch (e) {
      throw this.comoError(e, 'No se pudo registrar la revisión.');
    }
  }

  /** Historial completo del informe, filtrado por categoría (todos · edicion · precotizacion · revision · sistema). */
  async obtenerHistorial(idInforme: number, categoria: CategoriaHistorial = 'todos'): Promise<HistorialInformeApi> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      const params = categoria !== 'todos' ? new HttpParams().set('categoria', categoria) : undefined;
      return await this.get<HistorialInformeApi>(`${this.base}/${idInforme}/historial`, params);
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar el historial del informe.');
    }
  }

  /** Descarga el CSV con los mismos filtros (sin paginar). */
  async exportarCsv(filtros?: FiltrosBandejaInformesQs): Promise<Blob> {
    try {
      return await firstValueFrom(
        this.http.get(`${this.base}/exportar`, { params: this.aQueryParams(filtros), responseType: 'blob' }),
      );
    } catch (e) {
      throw this.comoError(e, 'No se pudo exportar el CSV.');
    }
  }

  /**
   * HU-57 — Descarga el archivo binario de una evidencia (foto o video) del informe.
   * El GET pasa por el interceptor de auth (Bearer), de ahí que no se pueda usar <img src> directo.
   * @param cuadro Si true, pide el cuadro estático (miniatura). Útil para videos.
   */
  async obtenerArchivoFoto(idInforme: number, idEvidencia: number, cuadro = false): Promise<Blob> {
    if (!Number.isInteger(idInforme)   || idInforme   <= 0) throw new Error('El informe indicado no es válido.');
    if (!Number.isInteger(idEvidencia) || idEvidencia <= 0) throw new Error('La evidencia indicada no es válida.');
    try {
      const params = cuadro ? new HttpParams().set('cuadro', 'true') : undefined;
      return await firstValueFrom(
        this.http.get(`${this.base}/${idInforme}/fotos/${idEvidencia}/archivo`, { params, responseType: 'blob' }),
      );
    } catch (e) {
      throw this.comoError(e, 'No se pudo descargar el archivo de la evidencia.');
    }
  }

  // ─── HTTP ────────────────────────────────────────────────────────────────

  private aQueryParams(filtros?: FiltrosBandejaInformesQs): HttpParams {
    let p = new HttpParams();
    if (!filtros) return p;
    if (filtros.grupo)                         p = p.set('grupo',            filtros.grupo);
    if (filtros.busqueda)                      p = p.set('busqueda',         filtros.busqueda);
    if (filtros.idTecnico != null)             p = p.set('idTecnico',        String(filtros.idTecnico));
    if (filtros.idCliente != null)             p = p.set('idCliente',        String(filtros.idCliente));
    if (filtros.conObservaciones != null)      p = p.set('conObservaciones', String(filtros.conObservaciones));
    if (filtros.slaVencido)                    p = p.set('slaVencido',       'true');
    if (filtros.fechaDesde)                    p = p.set('fechaDesde',       filtros.fechaDesde);
    if (filtros.fechaHasta)                    p = p.set('fechaHasta',       filtros.fechaHasta);
    if (filtros.pagina != null)                p = p.set('pagina',           String(filtros.pagina));
    if (filtros.porPagina != null)             p = p.set('porPagina',        String(filtros.porPagina));
    return p;
  }

  private async get<T>(url: string, params?: HttpParams): Promise<T> {
    const r = await firstValueFrom(this.http.get<RespuestaRevisionApi<T>>(url, { params }));
    if (r.idTipoMensaje !== 2 || r.datos === null || r.datos === undefined) {
      throw new Error(r.mensaje || 'El servidor no devolvió datos.');
    }
    return r.datos;
  }

  private comoError(e: unknown, porDefecto: string): Error {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0)   return new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
      if (e.status === 403) return new Error('No tienes permiso para ver la revisión de informes.');
      return new Error(porDefecto);
    }
    return e instanceof Error && e.message ? e : new Error(porDefecto);
  }
}
