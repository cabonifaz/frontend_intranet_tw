import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BandejaInformesApi, CategoriaHistorial, ComplementarioGuardadoApi, CrearComplementarioRespuestaApi,
  DetalleComplementarioApi, DetalleInformeApi, FiltrosBandejaInformesQs, GuardarComplementarioPayload,
  HistorialInformeApi, InformeRevisadoApi, ObservacionSeguimientoApi, PreparacionRevisionApi,
  RegistrarRevisionPayload, RespuestaRevisionApi,
} from '../models/revision-informes-api.model';
import { ViaticosOs } from '../models/aprobaciones-viaticos-servicio.model';

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

  // ─── HU-58 Informe Complementario ────────────────────────────────────────
  // El supervisor YA NO edita el informe original (inmutable). En su lugar genera
  // un informe complementario como entidad aparte. Endpoints acordados con Bryan:
  //  - POST   /informes/{id}/complementario           → crea (precargado del original)
  //  - GET    /informes/complementarios/{id}          → detalle
  //  - PUT    /informes/complementarios/{id}          → guarda cambios
  //  - POST   /informes/complementarios/{id}/fotos    → sube foto/video
  //  - DELETE /informes/complementarios/{id}/fotos/{idEvidencia}
  //  - GET    /informes/complementarios/{id}/pdf      → PDF del complementario

  /** Crea el informe complementario precargándolo con los datos del original. Si ya existe uno, el back devuelve el existente en modo borrador. */
  async crearComplementario(idInformeOriginal: number): Promise<CrearComplementarioRespuestaApi> {
    if (!Number.isInteger(idInformeOriginal) || idInformeOriginal <= 0) throw new Error('El informe original indicado no es válido.');
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaRevisionApi<CrearComplementarioRespuestaApi>>(
          `${this.base}/${idInformeOriginal}/complementario`, {},
        ),
      );
      if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo generar el informe complementario.');
      return r.datos;
    } catch (e) {
      throw this.comoError(e, 'No se pudo generar el informe complementario.');
    }
  }

  /** Detalle del complementario: datos readonly del original + secciones editables. */
  async obtenerComplementario(idInformeComplementario: number): Promise<DetalleComplementarioApi> {
    if (!Number.isInteger(idInformeComplementario) || idInformeComplementario <= 0) throw new Error('El complementario indicado no es válido.');
    try {
      return await this.get<DetalleComplementarioApi>(`${this.base}/complementarios/${idInformeComplementario}`);
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar el informe complementario.');
    }
  }

  /** Guarda observaciones / recomendaciones / precotización del complementario. */
  async guardarComplementario(
    idInformeComplementario: number,
    datos: GuardarComplementarioPayload,
  ): Promise<ComplementarioGuardadoApi> {
    if (!Number.isInteger(idInformeComplementario) || idInformeComplementario <= 0) throw new Error('El complementario indicado no es válido.');
    try {
      const r = await firstValueFrom(
        this.http.put<RespuestaRevisionApi<ComplementarioGuardadoApi>>(
          `${this.base}/complementarios/${idInformeComplementario}`, datos,
        ),
      );
      if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo guardar el complementario.');
      return r.datos;
    } catch (e) {
      throw this.comoError(e, 'No se pudo guardar el complementario.');
    }
  }

  /** Sube una foto/video al complementario. El back la registra en evidencia_fotografica con el id del complementario. */
  async subirFotoComplementario(idInformeComplementario: number, archivo: File): Promise<void> {
    if (!Number.isInteger(idInformeComplementario) || idInformeComplementario <= 0) throw new Error('El complementario indicado no es válido.');
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const r = await firstValueFrom(
        this.http.post<RespuestaRevisionApi<unknown>>(
          `${this.base}/complementarios/${idInformeComplementario}/fotos`, form,
        ),
      );
      if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo subir la foto.');
    } catch (e) {
      throw this.comoError(e, 'No se pudo subir la foto.');
    }
  }

  /** Quita una foto/video del complementario. */
  async eliminarFotoComplementario(idInformeComplementario: number, idEvidencia: number): Promise<void> {
    if (!Number.isInteger(idInformeComplementario) || idInformeComplementario <= 0) throw new Error('El complementario indicado no es válido.');
    if (!Number.isInteger(idEvidencia) || idEvidencia <= 0) throw new Error('La evidencia indicada no es válida.');
    try {
      const r = await firstValueFrom(
        this.http.delete<RespuestaRevisionApi<unknown>>(
          `${this.base}/complementarios/${idInformeComplementario}/fotos/${idEvidencia}`,
        ),
      );
      if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo eliminar la foto.');
    } catch (e) {
      throw this.comoError(e, 'No se pudo eliminar la foto.');
    }
  }

  /** Descarga el blob de una foto/video del complementario (misma estrategia Blob + JWT del original). */
  async obtenerArchivoFotoComplementario(idInformeComplementario: number, idEvidencia: number): Promise<Blob> {
    if (!Number.isInteger(idInformeComplementario) || idInformeComplementario <= 0) throw new Error('El complementario indicado no es válido.');
    if (!Number.isInteger(idEvidencia) || idEvidencia <= 0) throw new Error('La evidencia indicada no es válida.');
    try {
      return await firstValueFrom(
        this.http.get(
          `${this.base}/complementarios/${idInformeComplementario}/fotos/${idEvidencia}/archivo`,
          { responseType: 'blob' },
        ),
      );
    } catch (e) {
      throw this.comoError(e, 'No se pudo descargar el archivo de la evidencia.');
    }
  }

  /** Descarta un complementario en estado 'borrador'. Libera el bloqueo para registrar la revisión. */
  async descartarBorradorComplementario(idInformeComplementario: number): Promise<void> {
    if (!Number.isInteger(idInformeComplementario) || idInformeComplementario <= 0) throw new Error('El complementario indicado no es válido.');
    try {
      const r = await firstValueFrom(
        this.http.delete<RespuestaRevisionApi<unknown>>(
          `${this.base}/complementarios/${idInformeComplementario}`,
        ),
      );
      if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo descartar el borrador.');
    } catch (e) {
      throw this.comoError(e, 'No se pudo descartar el borrador.');
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

  /** HU-57 — GET viáticos (modo cierre, solo lectura) asociados al informe. */
  async obtenerViaticosInforme(idInforme: number): Promise<ViaticosOs> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      return await this.get<ViaticosOs>(`${this.base}/${idInforme}/viaticos`);
    } catch (e) {
      throw this.comoError(e, 'No se pudieron cargar los viáticos del informe.');
    }
  }

  /** Observaciones que se registraron durante el servicio en el Seguimiento Operativo (notas del Asistente, observaciones del equipo). */
  async obtenerObservacionesSeguimientoInforme(idInforme: number): Promise<ObservacionSeguimientoApi[]> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    try {
      return await this.get<ObservacionSeguimientoApi[]>(`${this.base}/${idInforme}/observaciones-seguimiento`);
    } catch (e) {
      throw this.comoError(e, 'No se pudieron cargar las observaciones del seguimiento.');
    }
  }

  /** Aprueba, observa o rechaza un gasto rendido de la OS del informe (solo el Jefe de Operaciones; el servidor lo comprueba). */
  async revisarGastoInforme(idInforme: number, idGasto: number, body: { accion: string; comentario: string | null }): Promise<unknown> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    if (!Number.isInteger(idGasto) || idGasto <= 0) throw new Error('El gasto indicado no es válido.');
    try {
      const r = await firstValueFrom(
        this.http.post<{ idTipoMensaje: number; mensaje: string; datos?: unknown }>(
          `${this.base}/${idInforme}/viaticos/gastos/${idGasto}/revision`,
          { accion: body.accion, comentario: body.comentario },
        ),
      );
      if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo revisar el gasto.');
      return r.datos ?? null;
    } catch (e) {
      throw this.comoError(e, 'No se pudo revisar el gasto.');
    }
  }

  /** Comprobante n (1 a 5) de un gasto de la OS del informe, como blob (el <img src> directo no envía el token). */
  async obtenerComprobanteGastoInforme(idInforme: number, idGasto: number, n: number): Promise<Blob> {
    if (!Number.isInteger(idInforme) || idInforme <= 0) throw new Error('El informe indicado no es válido.');
    if (!Number.isInteger(idGasto) || idGasto <= 0) throw new Error('El gasto indicado no es válido.');
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error('El número de foto debe estar entre 1 y 5.');
    try {
      return await firstValueFrom(this.http.get(`${this.base}/${idInforme}/viaticos/gastos/${idGasto}/comprobante/${n}`, { responseType: 'blob' }));
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar el comprobante.');
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
