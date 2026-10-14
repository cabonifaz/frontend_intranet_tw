import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  AuditoriaOrdenCompraDto,
  BandejaOrdenesCompraDto,
  CoberturaOrdenCompraDto,
  DatosOrdenCompraDto,
  DetalleOrdenCompraDto,
  DistribucionOrdenCompraDto,
  DistribuirOrdenCompraSolicitudDto,
  DocumentosOrdenCompraDto,
  EdicionOrdenCompraDto,
  EvaluacionOrdenCompraDto,
  EvaluacionOrdenCompraSolicitudDto,
  FiltrosBandejaOrdenesCompraDto,
  LiberarOrdenCompraSolicitudDto,
  ObservacionRegistradaDto,
  ObservarOrdenCompraSolicitudDto,
  OrdenCompraEditadaDto,
  OrdenCompraLiberadaDto,
  OrdenCompraRegistradaDto,
  OrdenCompraValidadaDto,
  PreparacionLiberacionDto,
  PreparacionOcComplementariaDto,
  PreparacionOrdenCompraDto,
  PreparacionValidacionOrdenCompraDto,
  PropuestaSinOrdenCompraDto,
  RegistrarOcComplementariaSolicitudDto,
  ResultadoDistribucionDto,
  OcComplementariaRegistradaDto,
  ValidarOrdenCompraSolicitudDto,
} from '../models/ordenes-compra.model';

/**
 * Módulo 6 — Órdenes de Compra (HU-22 a HU-28).
 * Conectado al back real (OrdenesCompraController).
 */
@Injectable({ providedIn: 'root' })
export class OrdenesCompraService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ══════════════════════════════════════════════════════════════════════════
  // HU-22 — Preparar / cobertura / registrar / PDF
  // ══════════════════════════════════════════════════════════════════════════

  async prepararRegistro(idPropuesta: number): Promise<PreparacionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionOrdenCompraDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra/preparar`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar el registro.');
    return r.datos;
  }

  async calcularCobertura(idPropuesta: number, datos: DatosOrdenCompraDto): Promise<CoberturaOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<CoberturaOrdenCompraDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra/cobertura`, datos),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo calcular la cobertura.');
    return r.datos;
  }

  /** HU-24 — Evaluación en tiempo real durante el registro. */
  async evaluarRegistro(idPropuesta: number, datos: EvaluacionOrdenCompraSolicitudDto): Promise<EvaluacionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<EvaluacionOrdenCompraDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra/evaluar`, datos),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo evaluar la cobertura.');
    return r.datos;
  }

  async registrarOrdenCompra(idPropuesta: number, datos: DatosOrdenCompraDto, archivo: File): Promise<OrdenCompraRegistradaDto> {
    const fd = this.toFormData(datos);
    fd.append('archivo', archivo, archivo.name);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<OrdenCompraRegistradaDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra`, fd),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la OC.');
    return r.datos;
  }

  obtenerUrlPdf(idOc: number, descargar = false): string {
    return `${this.base}/api/crm/ordenes-compra/${idOc}/pdf${descargar ? '?descargar=true' : ''}`;
  }

  async obtenerPdfBlob(idOc: number, descargar = false): Promise<Blob> {
    const url = this.obtenerUrlPdf(idOc, descargar);
    return await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
  }

  async obtenerVersionBlob(idOc: number, idDocumento: number, descargar = false): Promise<Blob> {
    const url = this.obtenerUrlVersion(idOc, idDocumento, descargar);
    return await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
  }

  /** Descarga el PDF autenticado y lo abre en una nueva pestaña (sortea el 401 de window.open). */
  async abrirPdfEnPestana(idOc: number, idDocumento?: number | null): Promise<void> {
    const blob = idDocumento
      ? await this.obtenerVersionBlob(idOc, idDocumento)
      : await this.obtenerPdfBlob(idOc);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Liberar memoria tras unos segundos (ya se abrió la pestaña)
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /** Fuerza descarga del PDF autenticado. */
  async descargarPdf(idOc: number, nombreArchivo: string, idDocumento?: number | null): Promise<void> {
    const blob = idDocumento
      ? await this.obtenerVersionBlob(idOc, idDocumento, true)
      : await this.obtenerPdfBlob(idOc, true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HU-23 — Bandeja + propuestas pendientes + detalle
  // ══════════════════════════════════════════════════════════════════════════

  async obtenerBandeja(filtros: FiltrosBandejaOrdenesCompraDto = {}): Promise<BandejaOrdenesCompraDto> {
    let params = new HttpParams()
      .set('pagina',    (filtros.pagina ?? 1).toString())
      .set('porPagina', (filtros.porPagina ?? 10).toString());
    if (filtros.estado)        params = params.set('estado',        filtros.estado);
    if (filtros.cobertura)     params = params.set('cobertura',     filtros.cobertura);
    if (filtros.idCliente)     params = params.set('idCliente',     filtros.idCliente.toString());
    if (filtros.idResponsable) params = params.set('idResponsable', filtros.idResponsable.toString());
    if (filtros.fechaDesde)    params = params.set('fechaDesde',    filtros.fechaDesde);
    if (filtros.fechaHasta)    params = params.set('fechaHasta',    filtros.fechaHasta);
    if (filtros.conPdf != null) params = params.set('conPdf',       filtros.conPdf.toString());
    if (filtros.busqueda)      params = params.set('busqueda',      filtros.busqueda);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<BandejaOrdenesCompraDto>>(`${this.base}/api/crm/ordenes-compra`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la bandeja.');
    return r.datos;
  }

  async obtenerPropuestasPendientes(busqueda?: string): Promise<PropuestaSinOrdenCompraDto[]> {
    let params = new HttpParams();
    if (busqueda) params = params.set('busqueda', busqueda);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PropuestaSinOrdenCompraDto[]>>(
        `${this.base}/api/crm/ordenes-compra/propuestas-pendientes`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar las propuestas pendientes.');
    return r.datos;
  }

  async obtenerDetalle(idOc: number): Promise<DetalleOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DetalleOrdenCompraDto>>(`${this.base}/api/crm/ordenes-compra/${idOc}`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el detalle.');
    return r.datos;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HU-24 — Edición
  // ══════════════════════════════════════════════════════════════════════════

  async prepararEdicion(idOc: number): Promise<EdicionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<EdicionOrdenCompraDto>>(`${this.base}/api/crm/ordenes-compra/${idOc}/edicion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la edición.');
    return r.datos;
  }

  async evaluarEdicion(idOc: number, datos: EvaluacionOrdenCompraSolicitudDto): Promise<EvaluacionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<EvaluacionOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/evaluar`, datos),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo evaluar la edición.');
    return r.datos;
  }

  async editarOrdenCompra(idOc: number, datos: DatosOrdenCompraDto & { revalidar: boolean }, archivo?: File | null): Promise<OrdenCompraEditadaDto> {
    const fd = this.toFormData(datos);
    if (archivo) fd.append('archivo', archivo, archivo.name);
    const r = await firstValueFrom(
      this.http.put<RespuestaApi<OrdenCompraEditadaDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}`, fd),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo editar la OC.');
    return r.datos;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HU-25 — Documentos + Auditoría
  // ══════════════════════════════════════════════════════════════════════════

  async obtenerDocumentos(idOc: number): Promise<DocumentosOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DocumentosOrdenCompraDto>>(`${this.base}/api/crm/ordenes-compra/${idOc}/documentos`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el documento.');
    return r.datos;
  }

  async reemplazarDocumento(idOc: number, motivo: string, archivo: File): Promise<unknown> {
    const fd = new FormData();
    fd.append('motivo', motivo);
    fd.append('archivo', archivo, archivo.name);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<unknown>>(`${this.base}/api/crm/ordenes-compra/${idOc}/documentos`, fd),
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo subir la nueva versión.');
    return r.datos;
  }

  obtenerUrlVersion(idOc: number, idDocumento: number, descargar = false): string {
    return `${this.base}/api/crm/ordenes-compra/${idOc}/documentos/${idDocumento}${descargar ? '?descargar=true' : ''}`;
  }

  async obtenerAuditoria(idOc: number): Promise<AuditoriaOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<AuditoriaOrdenCompraDto>>(`${this.base}/api/crm/ordenes-compra/${idOc}/auditoria`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la auditoría.');
    return r.datos;
  }

  obtenerUrlAuditoriaXlsx(idOc: number): string {
    return `${this.base}/api/crm/ordenes-compra/${idOc}/auditoria/xlsx`;
  }

  async descargarAuditoriaXlsx(idOc: number, numeroOc: string): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(this.obtenerUrlAuditoriaXlsx(idOc), { responseType: 'blob' }),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${numeroOc}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HU-26 — Validar + Observar
  // ══════════════════════════════════════════════════════════════════════════

  async prepararValidacion(idOc: number): Promise<PreparacionValidacionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionValidacionOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/validacion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la validación.');
    return r.datos;
  }

  async validarOrdenCompra(idOc: number, dto: ValidarOrdenCompraSolicitudDto): Promise<OrdenCompraValidadaDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<OrdenCompraValidadaDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/validar`, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo validar la OC.');
    return r.datos;
  }

  async observarOrdenCompra(idOc: number, dto: ObservarOrdenCompraSolicitudDto): Promise<ObservacionRegistradaDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ObservacionRegistradaDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/observar`, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la observación.');
    return r.datos;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HU-27 — Distribución + Complementaria
  // ══════════════════════════════════════════════════════════════════════════

  async prepararDistribucion(idOc: number): Promise<DistribucionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DistribucionOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/distribucion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la distribución.');
    return r.datos;
  }

  async evaluarDistribucion(idOc: number, dto: DistribuirOrdenCompraSolicitudDto): Promise<ResultadoDistribucionDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoDistribucionDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/distribucion/evaluar`, dto),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo evaluar la distribución.');
    return r.datos;
  }

  async distribuirMonto(idOc: number, dto: DistribuirOrdenCompraSolicitudDto): Promise<ResultadoDistribucionDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoDistribucionDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/distribucion`, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo aplicar el monto.');
    return r.datos;
  }

  async prepararComplementaria(idPropuesta: number, monto?: number): Promise<PreparacionOcComplementariaDto> {
    let params = new HttpParams();
    if (monto != null) params = params.set('monto', monto.toString());
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionOcComplementariaDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra-complementaria/preparar`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la OC complementaria.');
    return r.datos;
  }

  async registrarComplementaria(idPropuesta: number, datos: RegistrarOcComplementariaSolicitudDto, archivo: File): Promise<OcComplementariaRegistradaDto> {
    const fd = this.toFormData(datos);
    fd.append('archivo', archivo, archivo.name);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<OcComplementariaRegistradaDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra-complementaria`, fd),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la OC complementaria.');
    return r.datos;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HU-28 — Liberar  (Anular aún no implementado en back)
  // ══════════════════════════════════════════════════════════════════════════

  async prepararLiberacion(idOc: number): Promise<PreparacionLiberacionDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionLiberacionDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/liberacion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la liberación.');
    return r.datos;
  }

  async liberarOrdenCompra(idOc: number, dto: LiberarOrdenCompraSolicitudDto): Promise<OrdenCompraLiberadaDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<OrdenCompraLiberadaDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/liberar`, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo liberar la OC.');
    return r.datos;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════════════════

  private toFormData(obj: object): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v == null) continue;
      fd.append(k, String(v));
    }
    return fd;
  }
}
