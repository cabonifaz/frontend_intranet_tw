import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BandejaNotificaciones, DetalleNotificacion, DestinoNotif, FiltrosBandejaNotif,
  GrupoNotifClave, GrupoNotificaciones, ModuloCodigo, NotificacionBandeja,
  OpcionesFiltroNotif, ResumenNotificaciones, RutaDestinoNotif, TipoNotificacion,
} from '../models/notificaciones.model';

/**
 * HU-90 — Centro de Notificaciones (Módulo 16).
 *
 * Endpoints (NotificacionesController, /api/notificaciones):
 *  - GET  /resumen                                → badge + popover del bell (5 últimas + noLeidas)
 *  - GET  /bandeja?estado=&modulos=&tipos=&...    → bandeja paginada
 *  - GET  /filtros                                → opciones para los combos (con conteos)
 *  - GET  /{id}                                   → detalle (marca como leída al abrir)
 *  - POST /marcar-leidas                          → { ids: [..] } o { todas: true }
 *  - POST /{id}/archivar                          → solo si está leída
 *
 * El tiempo real llega por SignalR en NotificacionesRealtimeService, que actualiza
 * el mismo signal `estado` que este service expone para que el topbar y la bandeja
 * se mantengan sincronizados sin refetch manual.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/notificaciones`;

  /**
   * Estado compartido (topbar + bandeja). Lo mantiene actualizado:
   *  - Las acciones del usuario: marcarLeidas, archivar, abrir detalle.
   *  - Los eventos SignalR (NotificacionesRealtimeService).
   */
  readonly estado = signal<ResumenNotificaciones>({ noLeidas: 0, ultimas: [] });

  // ─── Lectura ───────────────────────────────────────────────────────────

  /** Resumen liviano para el bell. También lo llama el realtime al conectar/reconectar. */
  async obtenerResumen(): Promise<ResumenNotificaciones> {
    try {
      const r = await this.get<ResumenNotificaciones>(`${this.base}/resumen`);
      this.estado.set(r);
      return r;
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar el resumen de notificaciones.');
    }
  }

  async obtenerBandeja(filtros: FiltrosBandejaNotif = {}): Promise<BandejaNotificaciones> {
    try {
      const r = await this.get<BandejaNotificaciones>(`${this.base}/bandeja`, this.aQueryParams(filtros));
      // Sincronizo noLeidas global por si la bandeja fue el primer fetch.
      this.estado.update(s => ({ ...s, noLeidas: r.noLeidas }));
      return r;
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar la bandeja de notificaciones.');
    }
  }

  async obtenerOpcionesFiltro(): Promise<OpcionesFiltroNotif> {
    try {
      return await this.get<OpcionesFiltroNotif>(`${this.base}/filtros`);
    } catch (e) {
      throw this.comoError(e, 'No se pudieron cargar las opciones de filtro.');
    }
  }

  /** Abre la notificación: el back la marca como leída y devuelve el nuevo noLeidas. */
  async obtenerDetalle(id: number): Promise<DetalleNotificacion> {
    if (!Number.isInteger(id) || id <= 0) throw new Error('Notificación inválida.');
    try {
      const r = await this.get<DetalleNotificacion>(`${this.base}/${id}`);
      // La notif queda leída en el back → reflejo en el signal local.
      this.aplicarLectura([id], r.noLeidas);
      return r;
    } catch (e) {
      throw this.comoError(e, 'No se pudo cargar la notificación.');
    }
  }

  // ─── Escritura ─────────────────────────────────────────────────────────

  async marcarVariasLeidas(ids: number[]): Promise<number> {
    if (ids.length === 0) return this.estado().noLeidas;
    try {
      const r = await this.post<{ marcadas: number; noLeidas: number }>(
        `${this.base}/marcar-leidas`, { ids },
      );
      this.aplicarLectura(ids, r.noLeidas);
      return r.noLeidas;
    } catch (e) {
      throw this.comoError(e, 'No se pudieron marcar las notificaciones como leídas.');
    }
  }

  async marcarTodasLeidas(): Promise<number> {
    try {
      const r = await this.post<{ marcadas: number; noLeidas: number }>(
        `${this.base}/marcar-leidas`, { todas: true },
      );
      this.aplicarLecturaTodas(r.noLeidas);
      return r.noLeidas;
    } catch (e) {
      throw this.comoError(e, 'No se pudieron marcar todas como leídas.');
    }
  }

  async archivar(id: number): Promise<number> {
    if (!Number.isInteger(id) || id <= 0) throw new Error('Notificación inválida.');
    try {
      const r = await this.post<{ noLeidas: number }>(`${this.base}/${id}/archivar`, {});
      this.aplicarArchivado(id, r.noLeidas);
      return r.noLeidas;
    } catch (e) {
      throw this.comoError(e, 'No se pudo archivar la notificación.');
    }
  }

  // ─── Realtime hooks: los invoca NotificacionesRealtimeService ──────────

  /** El back empujó una notificación nueva — la insertamos arriba y actualizamos el badge. */
  aplicarCreada(n: NotificacionBandeja, noLeidas: number): void {
    this.estado.update(s => {
      // Si ya la tenemos (por doble push), ignorar.
      if (s.ultimas.some(x => x.idNotificacion === n.idNotificacion)) {
        return { ...s, noLeidas };
      }
      return { noLeidas, ultimas: [n, ...s.ultimas].slice(0, 5) };
    });
  }

  /** Marcadas como leídas (o archivadas) desde otra pestaña — sincronizamos badge. */
  aplicarSincronizacion(noLeidas: number): void {
    this.estado.update(s => ({ ...s, noLeidas }));
  }

  // ─── Agrupación visual ─────────────────────────────────────────────────

  /**
   * Agrupa items por el campo `grupo` que ya devuelve el back (hoy / ayer / semana / antiguas).
   * Mantiene el orden original de items dentro de cada grupo.
   */
  agrupar(items: NotificacionBandeja[]): GrupoNotificaciones[] {
    const buckets: Record<GrupoNotifClave, NotificacionBandeja[]> = {
      hoy: [], ayer: [], semana: [], antiguas: [],
    };
    for (const n of items) buckets[n.grupo].push(n);

    const labels: Record<GrupoNotifClave, string> = {
      hoy:      'Hoy',
      ayer:     'Ayer',
      semana:   'Esta semana',
      antiguas: 'Más antiguas',
    };

    const orden: GrupoNotifClave[] = ['hoy', 'ayer', 'semana', 'antiguas'];
    return orden
      .filter(k => buckets[k].length > 0)
      .map(k => ({ clave: k, label: labels[k], items: buckets[k] }));
  }

  /**
   * Convierte la fecha ISO (en hora Lima) en una etiqueta relativa:
   * "Hace 5m", "Hace 2h", "Ayer 14:30", o fecha absoluta para antiguas.
   */
  tiempoRelativo(fechaIso: string): string {
    const f    = new Date(fechaIso);
    const now  = new Date();
    const diff = (now.getTime() - f.getTime()) / 1000;   // segundos

    if (diff < 60)        return 'Ahora';
    if (diff < 3600)      return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 24 * 3600) return `Hace ${Math.floor(diff / 3600)}h`;

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const hh = String(f.getHours()).padStart(2, '0');
    const mm = String(f.getMinutes()).padStart(2, '0');
    if (f >= ayer && f < hoy) return `Ayer ${hh}:${mm}`;

    const dd = String(f.getDate()).padStart(2, '0');
    const mo = String(f.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mo} ${hh}:${mm}`;
  }

  /**
   * Mapea `destino.accion` del back → ruta Angular + queryParams.
   * Si retorna null, el botón "Ir al elemento origen" queda deshabilitado.
   *
   * Acciones soportadas (contrato back):
   *   os.detalle, programacion.os, seguimiento.servicio (tab opcional),
   *   propuesta.detalle, vb.detalle, seguimiento.propuesta, propuesta.precotizacion,
   *   oc.detalle, expediente.detalle, programacion.detalle, informe.detalle,
   *   equipo.detalle, cliente.detalle
   */
  resolverDestino(n: NotificacionBandeja): RutaDestinoNotif | null {
    const d = n.destino;
    if (!d) return null;
    const qp: Record<string, string | number> = {};

    switch (d.accion) {
      case 'os.detalle':
        return { rutaDestino: ['/crm/ordenes-servicio'], queryParams: { idOs: d.idEntidad } };
      case 'programacion.os':
        return { rutaDestino: ['/operaciones/programacion-operativa'], queryParams: { idOs: d.idEntidad } };
      case 'programacion.detalle':
        return { rutaDestino: ['/operaciones/programacion-operativa'], queryParams: { idProgramacion: d.idEntidad } };
      case 'seguimiento.servicio': {
        if (d.tab) qp['tab'] = d.tab;
        qp['idServicio'] = d.idEntidad;
        return { rutaDestino: ['/operaciones/seguimiento-operativo'], queryParams: qp };
      }
      case 'seguimiento.propuesta':
        return { rutaDestino: ['/crm/seguimiento'], queryParams: { idPropuesta: d.idEntidad } };
      case 'propuesta.detalle':
        return { rutaDestino: ['/crm/propuestas'], queryParams: { idPropuesta: d.idEntidad } };
      case 'propuesta.precotizacion':
        return { rutaDestino: ['/crm/propuestas'], queryParams: { tab: 'precotizaciones', idPrecot: d.idEntidad } };
      case 'vb.detalle':
        return { rutaDestino: ['/crm/visto-bueno'], queryParams: { idPropuesta: d.idEntidad } };
      case 'oc.detalle':
        return { rutaDestino: ['/crm/ordenes-compra'], queryParams: { idOc: d.idEntidad } };
      case 'expediente.detalle':
        return { rutaDestino: ['/crm/expedientes-digitales'], queryParams: { idExp: d.idEntidad } };
      case 'informe.detalle':
        return { rutaDestino: ['/servicio-tecnico/revision-informes'], queryParams: { idInforme: d.idEntidad } };
      case 'equipo.detalle':
        return { rutaDestino: ['/maestros/equipos'], queryParams: { idEquipo: d.idEntidad } };
      case 'cliente.detalle':
        return { rutaDestino: ['/maestros/clientes'], queryParams: { idCliente: d.idEntidad } };
      default:
        return null;
    }
  }

  // ─── Helpers privados ──────────────────────────────────────────────────

  private aplicarLectura(ids: number[], noLeidas: number): void {
    const set = new Set(ids);
    this.estado.update(s => ({
      noLeidas,
      ultimas: s.ultimas.map(n => set.has(n.idNotificacion) ? { ...n, leida: true } : n),
    }));
  }

  private aplicarLecturaTodas(noLeidas: number): void {
    this.estado.update(s => ({
      noLeidas,
      ultimas: s.ultimas.map(n => ({ ...n, leida: true })),
    }));
  }

  private aplicarArchivado(id: number, noLeidas: number): void {
    this.estado.update(s => ({
      noLeidas,
      ultimas: s.ultimas.filter(n => n.idNotificacion !== id),
    }));
  }

  private aQueryParams(f: FiltrosBandejaNotif): HttpParams {
    let p = new HttpParams();
    if (f.estado)                   p = p.set('estado',     f.estado);
    if (f.modulos && f.modulos.length) p = p.set('modulos', f.modulos.join(','));
    if (f.tipos   && f.tipos.length)   p = p.set('tipos',   f.tipos.join(','));
    if (f.rango)                    p = p.set('rango',      f.rango);
    if (f.fechaDesde)               p = p.set('fechaDesde', f.fechaDesde);
    if (f.fechaHasta)               p = p.set('fechaHasta', f.fechaHasta);
    if (f.remitente != null)        p = p.set('remitente',  String(f.remitente));
    if (f.busqueda)                 p = p.set('busqueda',   f.busqueda);
    if (f.pagina    != null)        p = p.set('pagina',     String(f.pagina));
    if (f.porPagina != null)        p = p.set('porPagina',  String(f.porPagina));
    return p;
  }

  private async get<T>(url: string, params?: HttpParams): Promise<T> {
    const r = await firstValueFrom(
      this.http.get<{ idTipoMensaje: number; mensaje: string; datos: T | null }>(url, { params }),
    );
    if (r.idTipoMensaje !== 2 || r.datos === null || r.datos === undefined) {
      throw new Error(r.mensaje || 'El servidor no devolvió datos.');
    }
    return r.datos;
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const r = await firstValueFrom(
      this.http.post<{ idTipoMensaje: number; mensaje: string; datos: T | null }>(url, body),
    );
    if (r.idTipoMensaje !== 2 || r.datos === null || r.datos === undefined) {
      throw new Error(r.mensaje || 'El servidor no procesó la acción.');
    }
    return r.datos;
  }

  private comoError(e: unknown, porDefecto: string): Error {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0)   return new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
      if (e.status === 400) return new Error(e.error?.mensaje || porDefecto);
      if (e.status === 403) return new Error('No tienes permiso para esta acción.');
      return new Error(porDefecto);
    }
    return e instanceof Error && e.message ? e : new Error(porDefecto);
  }
}

// Reexport usado por componentes.
export type { DestinoNotif, ModuloCodigo, TipoNotificacion };
