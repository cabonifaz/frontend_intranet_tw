import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  AnalisisImportacionOsOm,
  AnularOsRequest,
  BandejaOrdenesServicio,
  ConceptoCatalogoOs,
  DetalleOrdenServicio,
  EquipoCatalogoClienteOs,
  FiltrosBandejaOrdenesServicio,
  GuardarOrdenServicioRequest,
  ImpactoAnulacionOs,
  JefeComercialOs,
  MotivoAnulacionOs,
  MotivoEdicionOs,
  PreparacionEdicionOs,
  PreparacionNuevaOs,
  PropuestaDisponibleOs,
  ResultadoGuardarOrdenServicio,
  SolicitarEdicionOsRequest,
  TipoOrden,
} from '../models/ordenes-servicio.model';
import {
  AnalisisImportacionOsApi,
  BusquedaConceptosOsApi,
  BusquedaEquiposOsApi,
  CertificadoOsApi,
  ConceptoOsApi,
  DetalleOrdenServicioApi,
  EquipoOsApi,
  FichaOrdenServicioApi,
  OpcionFiltroApi,
  OrdenServicioGuardadaApi,
  PreparacionAnulacionOsApi,
  PreparacionSolicitudEdicionOsApi,
  ProgramacionOrdenServicioApi,
  PropuestaOrigenOsApi,
  PropuestasDisponiblesOsApi,
  mapAnalisisImportacionOs,
  mapAnularRequestToApi,
  mapConceptoCatalogo,
  mapDetalleBaseApi,
  mapEquipoCatalogoCliente,
  mapFichaApiToPreparacionEdicion,
  mapFichaApiToPreparacionNueva,
  mapGuardarRequestToApi,
  mapMotivoAnulacion,
  mapMotivoEdicion,
  mapPreparacionAnulacion,
  mapPreparacionSolicitudEdicion,
  mapPropuestaDisponibleOs,
  mapSolicitarEdicionRequestToApi,
  mapTabCertificadoApi,
  mapTabConceptosApi,
  mapTabEquiposApi,
  mapTabObservacionesApi,
  mapTabProgramacionApi,
  mapTabPropuestaApi,
} from './ordenes-servicio-mapper';

/**
 * Módulo 9 — Órdenes de Servicio / Metrología (OS/OM). Sprint 4.
 * Alineado al controller `OrdenesServicioController` del back.
 *
 * Integración en fases con el back:
 *   Fase 1 — HU-41 Bandeja (GET /, GET /exportar) ← ✅ integrado
 *   Fase 2 — HU-42 Detalle (GET /{id} + 6 tabs lazy) ← ✅ integrado
 *   Fase 3 — HU-40 Crear/editar (POST / PUT / preparar / preparar-edicion / propuestas-disponibles) ← ✅ integrado
 *   Fase 4 — HU-40 Fase C (solicitar edición, anular, aprobar/rechazar) ← mock
 *   Fase 5 — HU-43 Catálogos (equipos cliente, conceptos) ← mock
 *   Fase 6 — HU-44 Importación Excel OS/OM ← mock
 */
@Injectable({ providedIn: 'root' })
export class OrdenesServicioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm/ordenes-servicio`;

  async obtenerBandeja(f: FiltrosBandejaOrdenesServicio): Promise<BandejaOrdenesServicio> {
    const params = this.armarParams(f);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<BandejaOrdenesServicio>>(this.base, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la bandeja de órdenes de servicio.');
    return r.datos;
  }

  /**
   * HU-42 — Detalle de la OS/OM para el modal.
   *
   * ⚠️ MOCK: el endpoint `GET /api/crm/ordenes-servicio/{id}` todavía no existe en el back.
   * Cuando Bryan lo implemente, reemplazar el cuerpo por:
   *   const r = await firstValueFrom(this.http.get<RespuestaApi<DetalleOrdenServicio>>(`${this.base}/${idOs}`));
   *   if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el detalle.');
   *   return r.datos;
   */
  /** HU-40 — Propuestas aceptadas disponibles para generar una OS/OM. */
  async obtenerPropuestasDisponibles(busqueda?: string, tipo?: TipoOrden | ''): Promise<PropuestaDisponibleOs[]> {
    let p = new HttpParams().set('pagina', '1').set('porPagina', '100');
    if (busqueda) p = p.set('busqueda', busqueda);
    if (tipo)     p = p.set('tipo', tipo);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PropuestasDisponiblesOsApi>>(`${this.base}/propuestas-disponibles`, { params: p }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar las propuestas disponibles.');
    return r.datos.items.map(mapPropuestaDisponibleOs);
  }

  /** HU-40 — Datos precargados al abrir "Nueva OS/OM" desde una propuesta aceptada. */
  async prepararNueva(idPropuesta: number): Promise<PreparacionNuevaOs> {
    const p = new HttpParams().set('idPropuesta', String(idPropuesta));
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<FichaOrdenServicioApi>>(`${this.base}/preparar`, { params: p }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar los datos de la propuesta.');
    return mapFichaApiToPreparacionNueva(r.datos);
  }

  /** HU-40 — Preparación para editar una OS/OM existente (borrador o edición autorizada). */
  async prepararEdicion(idOs: number): Promise<PreparacionEdicionOs> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<FichaOrdenServicioApi>>(`${this.base}/${idOs}/preparar-edicion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar los datos de la orden a editar.');
    return mapFichaApiToPreparacionEdicion(r.datos);
  }

  /** HU-40 — Guarda borrador o emite la OS/OM (crear si idOs es null, actualizar si no). */
  async guardar(req: GuardarOrdenServicioRequest): Promise<ResultadoGuardarOrdenServicio> {
    const body = mapGuardarRequestToApi(req);
    const r = await firstValueFrom(
      req.idOs
        ? this.http.put<RespuestaApi<OrdenServicioGuardadaApi>>(`${this.base}/${req.idOs}`, body)
        : this.http.post<RespuestaApi<OrdenServicioGuardadaApi>>(this.base, body),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo guardar la orden de servicio.');
    return {
      idOs:    r.datos.idOs,
      numero:  r.datos.numero,
      estado:  r.datos.estado as any,
      emitida: req.emitir,
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-40 Fase C — Solicitar Edición / Resolver solicitud
  // ───────────────────────────────────────────────────────────────────────

  /** Catálogo MOTIVO_EDICION_OS. */
  async obtenerMotivosEdicion(): Promise<MotivoEdicionOs[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<OpcionFiltroApi[]>>(`${this.base}/motivos-edicion`),
    );
    return (r.datos ?? []).map(mapMotivoEdicion);
  }

  /**
   * Datos del Jefe Comercial que debe aprobar la edición. Internamente invoca el
   * endpoint `preparar` que devuelve jefe + motivos juntos; aquí extraemos solo el jefe
   * para mantener el shape que el componente de modal viene usando.
   */
  async obtenerJefeComercial(idOs: number): Promise<JefeComercialOs> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionSolicitudEdicionOsApi>>(`${this.base}/${idOs}/solicitud-edicion/preparar`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el jefe comercial.');
    return mapPreparacionSolicitudEdicion(r.datos).jefe;
  }

  /**
   * Carga en una sola llamada motivos + jefe comercial (optimización). Los modales
   * pueden usar esto en lugar de hacer `Promise.all` con `obtenerMotivosEdicion` +
   * `obtenerJefeComercial`.
   */
  async prepararSolicitudEdicion(idOs: number): Promise<{ jefe: JefeComercialOs; motivos: MotivoEdicionOs[] }> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionSolicitudEdicionOsApi>>(`${this.base}/${idOs}/solicitud-edicion/preparar`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la solicitud de edición.');
    return mapPreparacionSolicitudEdicion(r.datos);
  }

  /** Envía la solicitud al Jefe Comercial — notifica por correo y bell. */
  async solicitarEdicion(req: SolicitarEdicionOsRequest): Promise<void> {
    const body = mapSolicitarEdicionRequestToApi(req);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<unknown>>(`${this.base}/${req.idOs}/solicitud-edicion`, body),
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo enviar la solicitud.');
  }

  /** Jefe Comercial aprueba la solicitud. Comentario opcional. */
  async aprobarSolicitud(idOs: number, idSolicitud: number, comentario?: string): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<unknown>>(
        `${this.base}/${idOs}/solicitudes/${idSolicitud}/aprobar`,
        { comentario: comentario || null },
      ),
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo aprobar la solicitud.');
  }

  /** Jefe Comercial rechaza la solicitud. Comentario obligatorio (mín. 10 caracteres). */
  async rechazarSolicitud(idOs: number, idSolicitud: number, comentario: string): Promise<void> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<unknown>>(
        `${this.base}/${idOs}/solicitudes/${idSolicitud}/rechazar`,
        { comentario },
      ),
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo rechazar la solicitud.');
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-40 Fase C — Anular OS/OM
  // ───────────────────────────────────────────────────────────────────────

  /** Catálogo MOTIVO_ANULACION_OS. */
  async obtenerMotivosAnulacion(): Promise<MotivoAnulacionOs[]> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<OpcionFiltroApi[]>>(`${this.base}/motivos-anulacion`),
    );
    return (r.datos ?? []).map(mapMotivoAnulacion);
  }

  /** Impacto de la anulación (técnico, viáticos, personal que se libera). */
  async obtenerImpactoAnulacion(idOs: number): Promise<ImpactoAnulacionOs> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionAnulacionOsApi>>(`${this.base}/${idOs}/anulacion/preparar`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el impacto de anulación.');
    return mapPreparacionAnulacion(r.datos).impacto;
  }

  /** Carga impacto + motivos en una sola llamada. */
  async prepararAnulacion(idOs: number): Promise<{ impacto: ImpactoAnulacionOs; motivos: MotivoAnulacionOs[] }> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionAnulacionOsApi>>(`${this.base}/${idOs}/anulacion/preparar`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la anulación.');
    return mapPreparacionAnulacion(r.datos);
  }

  /** Anula la OS/OM; libera personal y viáticos asignados. */
  async anular(req: AnularOsRequest): Promise<void> {
    const body = mapAnularRequestToApi(req);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<unknown>>(`${this.base}/${req.idOs}/anular`, body),
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo anular la OS/OM.');
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-43 — Catálogos de equipos / conceptos
  // ───────────────────────────────────────────────────────────────────────

  /** @param idPropuesta Para marcar cuáles vienen de la propuesta origen (tab "De la propuesta"). */
  async obtenerConceptosCatalogo(idPropuesta?: number): Promise<ConceptoCatalogoOs[]> {
    let p = new HttpParams().set('pagina', '1').set('porPagina', '500');
    if (idPropuesta) p = p.set('idPropuesta', String(idPropuesta));
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<BusquedaConceptosOsApi>>(`${this.base}/catalogo-conceptos`, { params: p }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el catálogo de conceptos.');
    return r.datos.items.map(mapConceptoCatalogo);
  }

  /** @param idPropuesta Para marcar cuáles vienen de la propuesta origen y filtrar excluidos. */
  async obtenerEquiposCatalogoCliente(idCliente: number, idPropuesta?: number): Promise<EquipoCatalogoClienteOs[]> {
    let p = new HttpParams().set('pagina', '1').set('porPagina', '500');
    if (idPropuesta) p = p.set('idPropuesta', String(idPropuesta));
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<BusquedaEquiposOsApi>>(
        `${environment.apiUrl}/api/crm/clientes/${idCliente}/equipos-disponibles`,
        { params: p },
      ),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el catálogo de equipos.');
    // Los equipos "de la propuesta" vienen marcados por el back si pasamos idPropuesta;
    // acá no tenemos acceso a esa lista pivot — delegamos al back esa marca.
    const idsEnPropuesta = new Set<number>();
    return r.datos.items.map(e => mapEquipoCatalogoCliente(e, idsEnPropuesta));
  }

  // ───────────────────────────────────────────────────────────────────────
  // HU-44 — Importación desde Excel OS/OM (plantilla estructurada)
  // ───────────────────────────────────────────────────────────────────────

  /** Descarga la plantilla oficial .xlsx (2 hojas: Conceptos + Equipos). */
  async descargarPlantillaImportOs(): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.base}/importar/plantilla`, { responseType: 'blob' }),
    );
  }

  /**
   * Analiza el Excel contra el back (no guarda nada). El resultado se aplica
   * localmente en el front (fusionar / reemplazar) antes de confirmar la OS/OM.
   */
  async analizarImportOs(archivo: File, idCliente: number, idOs?: number | null): Promise<AnalisisImportacionOsOm> {
    const form = new FormData();
    form.append('archivo', archivo, archivo.name);
    form.append('idCliente', String(idCliente));
    if (idOs) form.append('idOs', String(idOs));
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<AnalisisImportacionOsApi>>(`${this.base}/importar/analizar`, form),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo analizar la importación.');
    return mapAnalisisImportacionOs(r.datos);
  }

  /** HU-42 — Base del detalle: cabecera + Resumen + Avance + flags de acciones. */
  async obtenerDetalle(idOs: number): Promise<DetalleOrdenServicio> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DetalleOrdenServicioApi>>(`${this.base}/${idOs}`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el detalle de la OS/OM.');
    return mapDetalleBaseApi(r.datos);
  }

  /** HU-42 Tab Propuesta Origen. */
  async obtenerTabPropuesta(idOs: number) {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PropuestaOrigenOsApi>>(`${this.base}/${idOs}/propuesta`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la propuesta origen.');
    return mapTabPropuestaApi(r.datos);
  }

  /**
   * HU-42 Tab Equipos. Acepta opcionalmente la lista de conceptos crudos para
   * poder resolver `conceptosAplicados` en una sola pasada (ver `obtenerTabEquiposYConceptos`).
   */
  async obtenerTabEquipos(idOs: number, conceptosCrudos?: ConceptoOsApi[]) {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<EquipoOsApi[]>>(`${this.base}/${idOs}/equipos`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar los equipos.');
    return mapTabEquiposApi(r.datos, conceptosCrudos);
  }

  /** Devuelve los conceptos crudos (del API) junto con los conceptos ya mapeados — útil para enriquecer equipos. */
  async obtenerTabConceptosConCrudos(idOs: number) {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ConceptoOsApi[]>>(`${this.base}/${idOs}/conceptos`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar los conceptos.');
    return { crudos: r.datos, mapeados: mapTabConceptosApi(r.datos) };
  }

  /** Tab Conceptos (ya mapeados). */
  async obtenerTabConceptos(idOs: number) {
    return (await this.obtenerTabConceptosConCrudos(idOs)).mapeados;
  }

  /**
   * Carga equipos y conceptos en paralelo. Devuelve ambos ya mapeados con
   * `conceptosAplicados` correctamente poblado en los equipos.
   */
  async obtenerTabEquiposYConceptos(idOs: number) {
    const [equiposResp, concResp] = await Promise.all([
      firstValueFrom(this.http.get<RespuestaApi<EquipoOsApi[]>>(`${this.base}/${idOs}/equipos`)),
      firstValueFrom(this.http.get<RespuestaApi<ConceptoOsApi[]>>(`${this.base}/${idOs}/conceptos`)),
    ]);
    if (!equiposResp.datos) throw new Error(equiposResp.mensaje || 'No se pudieron cargar los equipos.');
    if (!concResp.datos)    throw new Error(concResp.mensaje    || 'No se pudieron cargar los conceptos.');
    return {
      equipos:   mapTabEquiposApi(equiposResp.datos, concResp.datos),
      conceptos: mapTabConceptosApi(concResp.datos),
    };
  }

  /** HU-42 Tab Observaciones. */
  async obtenerTabObservaciones(idOs: number) {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<string | null>>(`${this.base}/${idOs}/observaciones`),
    );
    return mapTabObservacionesApi(r.datos ?? null);
  }

  /** HU-42 Tab Programación. */
  async obtenerTabProgramacion(idOs: number) {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ProgramacionOrdenServicioApi>>(`${this.base}/${idOs}/programacion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la programación.');
    return mapTabProgramacionApi(r.datos);
  }

  /** HU-42 Tab Certificado (solo OM). */
  async obtenerTabCertificado(idOs: number) {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CertificadoOsApi>>(`${this.base}/${idOs}/certificado`),
    );
    return mapTabCertificadoApi(r.datos ?? null);
  }

  async exportarXlsx(f: FiltrosBandejaOrdenesServicio): Promise<Blob> {
    const params = this.armarParams(f);
    return firstValueFrom(
      this.http.get(`${this.base}/exportar`, { params, responseType: 'blob' }),
    );
  }

  private armarParams(f: FiltrosBandejaOrdenesServicio): HttpParams {
    let p = new HttpParams()
      .set('pagina',    (f.pagina ?? 1).toString())
      .set('porPagina', (f.porPagina ?? 10).toString());
    if (f.estado)        p = p.set('estado',        f.estado);
    if (f.tipo)          p = p.set('tipo',          f.tipo);
    if (f.idCliente)     p = p.set('idCliente',     String(f.idCliente));
    if (f.idResponsable) p = p.set('idResponsable', String(f.idResponsable));
    if (f.fechaDesde)    p = p.set('fechaDesde',    f.fechaDesde);
    if (f.fechaHasta)    p = p.set('fechaHasta',    f.fechaHasta);
    if (f.busqueda)      p = p.set('busqueda',      f.busqueda);
    return p;
  }
}
