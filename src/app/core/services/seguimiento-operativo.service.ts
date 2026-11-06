import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AvanceServicioApi, CierreServicioApi, DetalleServicioApi, IncidenciasSeguimientoApi,
  IncidenciasServicioApi, MapaServicioApi, RespuestaSeguimientoApi, ResumenSeguimientoApi,
  ServiciosSeguimientoApi, TecnicosSeguimientoApi, TimelineServicioApi,
} from '../models/seguimiento-operativo-api.model';
import {
  BandejaSeguimientoOperativo, DetalleServicioSeguimiento, ParteBandeja, ParteDetalle,
} from '../models/seguimiento-operativo.model';
import { ensamblarBandeja, ensamblarDetalle } from './seguimiento-operativo-mapper';

/** Tamaño de página máximo que acepta el backend en /servicios. */
const TAMANO_PAGINA_SERVICIOS = 50;
/** Tope de páginas de /servicios que se piden (50 × 10 = 500 servicios del día; nunca debería llegar). */
const MAX_PAGINAS_SERVICIOS = 10;

/**
 * HU-51/52/53/54 — Módulo 11 Control de Campo (Seguimiento Operativo).
 *
 * Conectado al backend real (SeguimientoOperativoController y DetalleServicioRutaController):
 *  - GET /api/operaciones/seguimiento             → KPIs + Vista Principal (pines, alertas, hitos)
 *  - GET /api/operaciones/seguimiento/servicios   → Servicios en Campo (paginado, máx. 50 por página)
 *  - GET /api/operaciones/seguimiento/tecnicos    → Técnicos Activos
 *  - GET /api/operaciones/seguimiento/incidencias → Incidencias del Día
 *  - GET /api/operaciones/seguimiento/servicios/{idOs}            → cabecera + Resumen
 *  -     …/{idOs}/avance · /mapa · /timeline · /incidencias · /cierre (solo si está finalizado)
 *
 * Todas las respuestas vienen en el sobre { idTipoMensaje, mensaje, datos }; cuando
 * idTipoMensaje != 2 se lanza un Error con el mensaje del backend para que la pantalla lo muestre.
 * La conversión DTO → modelo de la UI vive en seguimiento-operativo-mapper.ts (funciones puras).
 *
 * El registro del Asistente (HU-53, POST …/registros) todavía no está conectado desde esta pantalla.
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoOperativoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/operaciones/seguimiento`;

  // ─── Bandeja (HU-51) ───────────────────────────────────────────────────────

  /**
   * Pide las 4 pestañas en paralelo. El resumen (KPIs + Vista Principal) es obligatorio: si falla, se lanza
   * su mensaje. Si falla alguna de las otras 3, la bandeja se muestra igual y esa pestaña lleva su error.
   */
  async obtenerBandeja(): Promise<BandejaSeguimientoOperativo> {
    const [resumen, servicios, tecnicos, incidencias] = await Promise.allSettled([
      this.get<ResumenSeguimientoApi>(this.base),
      this.obtenerTodosLosServicios(),
      this.get<TecnicosSeguimientoApi>(`${this.base}/tecnicos`),
      this.get<IncidenciasSeguimientoApi>(`${this.base}/incidencias`),
    ]);
    if (resumen.status === 'rejected') throw this.comoError(resumen.reason, 'No se pudo cargar la bandeja de seguimiento.');

    const errores: Partial<Record<ParteBandeja, string>> = {};
    const anotar = (parte: ParteBandeja, r: PromiseSettledResult<unknown>): void => {
      if (r.status === 'rejected') errores[parte] = this.comoError(r.reason, 'No se pudo cargar esta pestaña.').message;
    };
    anotar('servicios', servicios);
    anotar('tecnicos', tecnicos);
    anotar('incidencias', incidencias);

    return ensamblarBandeja({
      resumen:     resumen.value,
      servicios:   servicios.status === 'fulfilled' ? servicios.value : null,
      tecnicos:    tecnicos.status === 'fulfilled' ? tecnicos.value : null,
      incidencias: incidencias.status === 'fulfilled' ? incidencias.value : null,
      errores,
    });
  }

  /** /servicios viene paginado (máx. 50): se piden todas las páginas para que la tabla muestre el día completo. */
  private async obtenerTodosLosServicios(): Promise<ServiciosSeguimientoApi> {
    const pedir = (pagina: number): Promise<ServiciosSeguimientoApi> =>
      this.get<ServiciosSeguimientoApi>(`${this.base}/servicios`,
        new HttpParams().set('pagina', pagina).set('tamano', TAMANO_PAGINA_SERVICIOS));

    const primera = await pedir(1);
    const hasta = Math.min(primera.totalPaginas, MAX_PAGINAS_SERVICIOS);
    if (hasta <= 1) return primera;

    const resto = await Promise.all(Array.from({ length: hasta - 1 }, (_, i) => pedir(i + 2)));
    return { ...primera, filas: [...primera.filas, ...resto.flatMap(p => p.filas)] };
  }

  // ─── Detalle del servicio (HU-52 / HU-54) ──────────────────────────────────

  /**
   * Cabecera/Resumen + Avance + Mapa + Timeline + Demoras (+ Cierre si el servicio está finalizado).
   * La cabecera es obligatoria (si falla, se lanza su mensaje: servicio fuera de la jornada, sin permiso…);
   * las demás secciones son tolerantes: si una falla, el modal abre igual y esa pestaña muestra su error.
   */
  async obtenerDetalleServicio(idServicio: number): Promise<DetalleServicioSeguimiento> {
    if (!Number.isInteger(idServicio) || idServicio <= 0) throw new Error('El servicio indicado no es válido.');
    const raiz = `${this.base}/servicios/${idServicio}`;

    const [detalle, avance, mapa, timeline, incidencias] = await Promise.allSettled([
      this.get<DetalleServicioApi>(raiz),
      this.get<AvanceServicioApi>(`${raiz}/avance`),
      this.get<MapaServicioApi>(`${raiz}/mapa`),
      // orden=antiguo: cronológico ascendente; la UI invierte para "más reciente primero"
      this.get<TimelineServicioApi>(`${raiz}/timeline`, new HttpParams().set('orden', 'antiguo')),
      this.get<IncidenciasServicioApi>(`${raiz}/incidencias`),
    ]);
    if (detalle.status === 'rejected') throw this.comoError(detalle.reason, 'No se pudo cargar el detalle del servicio.');

    const errores: Partial<Record<ParteDetalle, string>> = {};
    const anotar = (parte: ParteDetalle, r: PromiseSettledResult<unknown>): void => {
      if (r.status === 'rejected') errores[parte] = this.comoError(r.reason, 'No se pudo cargar esta sección.').message;
    };
    anotar('equipos', avance);
    anotar('mapa', mapa);
    anotar('timeline', timeline);
    anotar('demoras', incidencias);

    // El cierre solo existe cuando el servicio está finalizado (si no, el backend responde 400)
    let cierre: CierreServicioApi | null = null;
    if (detalle.value.cabecera.mostrarCierre) {
      try {
        cierre = await this.get<CierreServicioApi>(`${raiz}/cierre`);
      } catch (e) {
        errores['cierre'] = this.comoError(e, 'No se pudo cargar el cierre del servicio.').message;
      }
    }

    return ensamblarDetalle({
      detalle:     detalle.value,
      avance:      avance.status === 'fulfilled' ? avance.value : null,
      mapa:        mapa.status === 'fulfilled' ? mapa.value : null,
      timeline:    timeline.status === 'fulfilled' ? timeline.value : null,
      incidencias: incidencias.status === 'fulfilled' ? incidencias.value : null,
      cierre,
      errores,
    });
  }

  // ─── HTTP ──────────────────────────────────────────────────────────────────

  /** GET que desenvuelve el sobre del backend. idTipoMensaje != 2 (o sin datos) → Error con el mensaje. */
  private async get<T>(url: string, params?: HttpParams): Promise<T> {
    const r = await firstValueFrom(this.http.get<RespuestaSeguimientoApi<T>>(url, { params }));
    if (r.idTipoMensaje !== 2 || r.datos === null || r.datos === undefined) {
      throw new Error(r.mensaje || 'El servidor no devolvió datos.');
    }
    return r.datos;
  }

  /** El interceptor ya convierte 400/500 con mensaje en Error; acá se cubren los HttpErrorResponse sin sobre. */
  private comoError(e: unknown, porDefecto: string): Error {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0)   return new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
      if (e.status === 403) return new Error('No tienes permiso para ver el seguimiento operativo.');
      return new Error(porDefecto);
    }
    return e instanceof Error && e.message ? e : new Error(porDefecto);
  }
}
