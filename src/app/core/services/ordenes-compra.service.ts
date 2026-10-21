import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  AnulacionOrdenCompraDto,
  AnularOrdenCompraSolicitudDto,
  BandejaOrdenesCompraDto,
  CompararOrdenCompraSolicitudDto,
  ComparacionOrdenCompraDto,
  DetalleOrdenCompraDto,
  EditarOrdenCompraSolicitudDto,
  ExtraccionOrdenCompraDto,
  FiltrosBandejaOrdenesCompraDto,
  OcAutogeneradaDto,
  PreparacionAnulacionOcDto,
  PreparacionEdicionOrdenCompraDto,
  PreparacionOrdenCompraDto,
  PropuestaDisponibleOcDto,
  RegistrarOrdenCompraSolicitudDto,
  ResultadoGuardarOrdenCompraDto,
  RevalidacionOrdenCompraDto,
  TimelineOrdenCompraDto,
  ValidacionOrdenCompraDto,
} from '../models/ordenes-compra.model';

/**
 * Módulo 6 — Órdenes de Compra (Sprint 4, HU-22 a HU-28 refinadas).
 * Alineado al controller OrdenesCompraController del back.
 */
@Injectable({ providedIn: 'root' })
export class OrdenesCompraService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ══════════════════════════════════════════════════════════════════════════
  // Bandeja y consultas
  // ══════════════════════════════════════════════════════════════════════════

  async obtenerBandeja(filtros: FiltrosBandejaOrdenesCompraDto = {}): Promise<BandejaOrdenesCompraDto> {
    let params = new HttpParams()
      .set('pagina',    (filtros.pagina ?? 1).toString())
      .set('porPagina', (filtros.porPagina ?? 10).toString());
    if (filtros.estado)         params = params.set('estado',        filtros.estado);
    if (filtros.idCliente)      params = params.set('idCliente',     filtros.idCliente.toString());
    if (filtros.idResponsable)  params = params.set('idResponsable', filtros.idResponsable.toString());
    if (filtros.idPropuesta)    params = params.set('idPropuesta',   filtros.idPropuesta.toString());
    if (filtros.fechaDesde)     params = params.set('fechaDesde',    filtros.fechaDesde);
    if (filtros.fechaHasta)     params = params.set('fechaHasta',    filtros.fechaHasta);
    if (filtros.busqueda)       params = params.set('busqueda',      filtros.busqueda);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<BandejaOrdenesCompraDto>>(`${this.base}/api/crm/ordenes-compra`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la bandeja.');
    return r.datos;
  }

  async obtenerPropuestasDisponibles(idCliente?: number | null, idOc?: number | null, busqueda?: string): Promise<PropuestaDisponibleOcDto[]> {
    let params = new HttpParams();
    if (idCliente != null) params = params.set('idCliente', idCliente.toString());
    if (idOc       != null) params = params.set('idOc',      idOc.toString());
    if (busqueda)           params = params.set('busqueda',  busqueda);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PropuestaDisponibleOcDto[]>>(
        `${this.base}/api/crm/ordenes-compra/propuestas-disponibles`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar las propuestas disponibles.');
    return r.datos;
  }

  async obtenerDetalle(idOc: number): Promise<DetalleOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DetalleOrdenCompraDto>>(`${this.base}/api/crm/ordenes-compra/${idOc}`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el detalle.');
    return r.datos;
  }

  async obtenerValidacion(idOc: number, idPropuesta?: number | null): Promise<ValidacionOrdenCompraDto> {
    let params = new HttpParams();
    if (idPropuesta != null) params = params.set('idPropuesta', idPropuesta.toString());
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ValidacionOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/validacion`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la validación IA.');
    return r.datos;
  }

  async obtenerTimeline(idOc: number): Promise<TimelineOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<TimelineOrdenCompraDto>>(`${this.base}/api/crm/ordenes-compra/${idOc}/auditoria`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el timeline.');
    return r.datos;
  }

  async descargarTimelineXlsx(idOc: number, numeroOc: string): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(`${this.base}/api/crm/ordenes-compra/${idOc}/auditoria/xlsx`, { responseType: 'blob' }),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_${numeroOc}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PDF
  // ══════════════════════════════════════════════════════════════════════════

  obtenerUrlPdf(idOc: number, descargar = false): string {
    return `${this.base}/api/crm/ordenes-compra/${idOc}/pdf${descargar ? '?descargar=true' : ''}`;
  }

  async obtenerPdfBlob(idOc: number, descargar = false): Promise<Blob> {
    return await firstValueFrom(this.http.get(this.obtenerUrlPdf(idOc, descargar), { responseType: 'blob' }));
  }

  async abrirPdfEnPestana(idOc: number): Promise<void> {
    const blob = await this.obtenerPdfBlob(idOc);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async descargarPdf(idOc: number, nombreArchivo: string): Promise<void> {
    const blob = await this.obtenerPdfBlob(idOc, true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Ficha de registro / edición
  // ══════════════════════════════════════════════════════════════════════════

  async prepararRegistro(idPropuesta: number, idOcReemplaza?: number | null): Promise<PreparacionOrdenCompraDto> {
    let params = new HttpParams();
    if (idOcReemplaza != null) params = params.set('idOcReemplaza', idOcReemplaza.toString());
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionOrdenCompraDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra/preparar`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar el registro.');
    return r.datos;
  }

  async prepararEdicion(idOc: number): Promise<PreparacionEdicionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionEdicionOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/edicion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la edición.');
    return r.datos;
  }

  /** Lectura del PDF con IA — devuelve datos para precargar la ficha, no guarda. */
  async extraerPdf(archivo: File): Promise<ExtraccionOrdenCompraDto> {
    const fd = new FormData();
    fd.append('archivo', archivo, archivo.name);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ExtraccionOrdenCompraDto>>(`${this.base}/api/crm/ordenes-compra/extraer`, fd),
    );
    if (!r.datos) throw new Error(r.mensaje || 'La IA no pudo leer el PDF.');
    return r.datos;
  }

  /** Validación en vivo (no guarda). conIa=true agrega evaluación de conceptos con IA. */
  async comparar(solicitud: CompararOrdenCompraSolicitudDto, conIa = false): Promise<ComparacionOrdenCompraDto> {
    let params = new HttpParams();
    if (conIa) params = params.set('conIa', 'true');
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ComparacionOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/comparar`, solicitud, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo comparar la OC.');
    return r.datos;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Guardado
  // ══════════════════════════════════════════════════════════════════════════

  async registrarOrdenCompra(idPropuesta: number, solicitud: RegistrarOrdenCompraSolicitudDto, archivo: File): Promise<ResultadoGuardarOrdenCompraDto> {
    const fd = new FormData();
    fd.append('solicitud', JSON.stringify(solicitud));
    fd.append('archivo', archivo, archivo.name);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoGuardarOrdenCompraDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra`, fd),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la OC.');
    return r.datos;
  }

  /** "Generar OC automáticamente" cuando el cliente no emite OC. */
  async autogenerarOc(idPropuesta: number): Promise<OcAutogeneradaDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<OcAutogeneradaDto>>(
        `${this.base}/api/crm/propuestas/${idPropuesta}/orden-compra/autogenerar`, {}),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo autogenerar la OC.');
    return r.datos;
  }

  async editarOrdenCompra(idOc: number, solicitud: EditarOrdenCompraSolicitudDto, archivo?: File | null): Promise<ResultadoGuardarOrdenCompraDto> {
    const fd = new FormData();
    fd.append('solicitud', JSON.stringify(solicitud));
    if (archivo) fd.append('archivo', archivo, archivo.name);
    const r = await firstValueFrom(
      this.http.put<RespuestaApi<ResultadoGuardarOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}`, fd),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo editar la OC.');
    return r.datos;
  }

  /**
   * Reemplazar solo el PDF.
   * @param tipo "reemplazo" | "oc_corregida"
   * @param motivo mínimo 5 caracteres
   * @param datos opcional (solo para "oc_corregida"): datos corregidos de /extraer
   */
  async reemplazarDocumento(idOc: number, tipo: string, motivo: string, archivo: File, datos?: unknown): Promise<ResultadoGuardarOrdenCompraDto> {
    const fd = new FormData();
    fd.append('tipo', tipo);
    fd.append('motivo', motivo);
    fd.append('archivo', archivo, archivo.name);
    if (datos) fd.append('datos', JSON.stringify(datos));
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoGuardarOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/documento`, fd),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo reemplazar el documento.');
    return r.datos;
  }

  /** Re-ejecutar validación IA. idPropuesta=null → todas las propuestas vinculadas. */
  async revalidar(idOc: number, idPropuesta?: number | null): Promise<RevalidacionOrdenCompraDto[]> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<RevalidacionOrdenCompraDto[]>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/revalidar`, { idPropuesta }),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo revalidar.');
    return r.datos;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Anulación
  // ══════════════════════════════════════════════════════════════════════════

  async prepararAnulacion(idOc: number): Promise<PreparacionAnulacionOcDto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionAnulacionOcDto>>(`${this.base}/api/crm/ordenes-compra/${idOc}/anulacion`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el impacto de la anulación.');
    return r.datos;
  }

  async anular(idOc: number, solicitud: AnularOrdenCompraSolicitudDto): Promise<AnulacionOrdenCompraDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<AnulacionOrdenCompraDto>>(
        `${this.base}/api/crm/ordenes-compra/${idOc}/anular`, solicitud),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo anular la OC.');
    return r.datos;
  }
}
