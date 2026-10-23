import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  BandejaExpedientesDto,
  CandidatoResponsableDto,
  CarteraComercialExpedienteDto,
  ComparacionVersionesExpedienteDto,
  DetalleExpedienteDto,
  DocumentosExpedienteDto,
  FiltrosBandejaExpedientesDto,
  FiltrosDocumentosExpedienteDto,
  FiltrosHistorialExpedienteDto,
  HistorialExpedienteDto,
  PreparacionReasignacionExpedienteDto,
  ReasignacionExpedienteDto,
  ReasignarResponsableExpedienteDto,
  TabCierreExpedienteDto,
  TabEjecucionExpedienteDto,
  TabOrdenServicioExpedienteDto,
  TabOrdenesCompraExpedienteDto,
  TabProgramacionExpedienteDto,
  TabPropuestasExpedienteDto,
  TabRqExpedienteDto,
  TabSeguimientoExpedienteDto,
  TabSsomaExpedienteDto,
  TabVistoBuenoExpedienteDto,
} from '../models/expedientes-digitales.model';

/**
 * Módulo 7 — Expediente Digital (HU-29 a HU-33).
 * Rutas /api/expedientes/*. El back entrega los tabs de la HU-30 con carga perezosa (un endpoint por tab).
 */
@Injectable({ providedIn: 'root' })
export class ExpedientesDigitalesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly ruta = `${this.base}/api/expedientes`;

  private aplicarFiltrosBandeja(f: FiltrosBandejaExpedientesDto): HttpParams {
    let p = new HttpParams()
      .set('pagina',    (f.pagina ?? 1).toString())
      .set('porPagina', (f.porPagina ?? 10).toString());
    if (f.estado)        p = p.set('estado',        f.estado);
    if (f.etapa)         p = p.set('etapa',         f.etapa);
    if (f.idCliente)     p = p.set('idCliente',     f.idCliente.toString());
    if (f.area)          p = p.set('area',          f.area);
    if (f.tipoPropuesta) p = p.set('tipoPropuesta', f.tipoPropuesta);
    if (f.desde)         p = p.set('desde',         f.desde);
    if (f.hasta)         p = p.set('hasta',         f.hasta);
    if (f.sla)           p = p.set('sla',           f.sla);
    if (f.busqueda)      p = p.set('busqueda',      f.busqueda);
    return p;
  }

  private aplicarFiltrosDocumentos(f: FiltrosDocumentosExpedienteDto): HttpParams {
    let p = new HttpParams();
    if (f.categoria) p = p.set('categoria', f.categoria);
    if (f.busqueda)  p = p.set('busqueda',  f.busqueda);
    if (f.desde)     p = p.set('desde',     f.desde);
    if (f.hasta)     p = p.set('hasta',     f.hasta);
    if (f.estado)    p = p.set('estado',    f.estado);
    if (f.formato)   p = p.set('formato',   f.formato);
    if (f.orden)     p = p.set('orden',     f.orden);
    return p;
  }

  private aplicarFiltrosHistorial(f: FiltrosHistorialExpedienteDto): HttpParams {
    let p = new HttpParams();
    if (f.busqueda)   p = p.set('busqueda',   f.busqueda);
    if (f.idUsuario)  p = p.set('idUsuario',  f.idUsuario.toString());
    if (f.etapa)      p = p.set('etapa',      f.etapa);
    if (f.tipoEvento) p = p.set('tipoEvento', f.tipoEvento);
    if (f.desde)      p = p.set('desde',      f.desde);
    if (f.hasta)      p = p.set('hasta',      f.hasta);
    return p;
  }

  private async get<T>(url: string, params?: HttpParams): Promise<T> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<T>>(url, params ? { params } : {}),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar.');
    return r.datos;
  }

  // ══════════════════════ HU-29 Bandeja ══════════════════════

  async obtenerBandeja(filtros: FiltrosBandejaExpedientesDto = {}): Promise<BandejaExpedientesDto> {
    return this.get<BandejaExpedientesDto>(this.ruta, this.aplicarFiltrosBandeja(filtros));
  }

  async descargarBandejaXlsx(filtros: FiltrosBandejaExpedientesDto = {}): Promise<Blob> {
    return await firstValueFrom(this.http.get(`${this.ruta}/xlsx`,
      { params: this.aplicarFiltrosBandeja(filtros), responseType: 'blob' }));
  }

  // ══════════════════════ HU-30 Ficha ══════════════════════

  obtenerDetalle(idExpediente: number): Promise<DetalleExpedienteDto> {
    return this.get<DetalleExpedienteDto>(`${this.ruta}/${idExpediente}`);
  }

  obtenerTabRq(idExpediente: number): Promise<TabRqExpedienteDto> {
    return this.get<TabRqExpedienteDto>(`${this.ruta}/${idExpediente}/rq`);
  }

  obtenerTabPropuestas(idExpediente: number, idPropuesta?: number | null): Promise<TabPropuestasExpedienteDto> {
    let p = new HttpParams();
    if (idPropuesta != null) p = p.set('idPropuesta', idPropuesta.toString());
    return this.get<TabPropuestasExpedienteDto>(`${this.ruta}/${idExpediente}/propuestas`, p);
  }

  async compararVersionesPropuesta(idExpediente: number, idBase: number, idDestino: number): Promise<ComparacionVersionesExpedienteDto> {
    const p = new HttpParams().set('base', idBase.toString()).set('destino', idDestino.toString());
    return this.get<ComparacionVersionesExpedienteDto>(`${this.ruta}/${idExpediente}/propuestas/comparar`, p);
  }

  obtenerTabVistoBueno(idExpediente: number, numero?: string | null): Promise<TabVistoBuenoExpedienteDto> {
    let p = new HttpParams();
    if (numero) p = p.set('numero', numero);
    return this.get<TabVistoBuenoExpedienteDto>(`${this.ruta}/${idExpediente}/visto-bueno`, p);
  }

  obtenerTabSeguimiento(idExpediente: number, numero?: string | null): Promise<TabSeguimientoExpedienteDto> {
    let p = new HttpParams();
    if (numero) p = p.set('numero', numero);
    return this.get<TabSeguimientoExpedienteDto>(`${this.ruta}/${idExpediente}/seguimiento`, p);
  }

  obtenerTabOrdenesCompra(idExpediente: number, idOc?: number | null): Promise<TabOrdenesCompraExpedienteDto> {
    let p = new HttpParams();
    if (idOc != null) p = p.set('idOc', idOc.toString());
    return this.get<TabOrdenesCompraExpedienteDto>(`${this.ruta}/${idExpediente}/ordenes-compra`, p);
  }

  obtenerTabOrdenServicio(idExpediente: number, idOs?: number | null): Promise<TabOrdenServicioExpedienteDto> {
    let p = new HttpParams();
    if (idOs != null) p = p.set('idOs', idOs.toString());
    return this.get<TabOrdenServicioExpedienteDto>(`${this.ruta}/${idExpediente}/orden-servicio`, p);
  }

  obtenerTabProgramacion(idExpediente: number): Promise<TabProgramacionExpedienteDto> {
    return this.get<TabProgramacionExpedienteDto>(`${this.ruta}/${idExpediente}/programacion`);
  }

  obtenerTabSsoma(idExpediente: number): Promise<TabSsomaExpedienteDto> {
    return this.get<TabSsomaExpedienteDto>(`${this.ruta}/${idExpediente}/ssoma`);
  }

  obtenerTabEjecucion(idExpediente: number): Promise<TabEjecucionExpedienteDto> {
    return this.get<TabEjecucionExpedienteDto>(`${this.ruta}/${idExpediente}/ejecucion`);
  }

  obtenerTabCierre(idExpediente: number): Promise<TabCierreExpedienteDto> {
    return this.get<TabCierreExpedienteDto>(`${this.ruta}/${idExpediente}/cierre`);
  }

  async descargarExpedienteZip(idExpediente: number): Promise<Blob> {
    return await firstValueFrom(this.http.get(`${this.ruta}/${idExpediente}/exportar`, { responseType: 'blob' }));
  }

  // ══════════════════════ HU-31 Documentos ══════════════════════

  obtenerDocumentos(idExpediente: number, filtros: FiltrosDocumentosExpedienteDto = {}): Promise<DocumentosExpedienteDto> {
    return this.get<DocumentosExpedienteDto>(
      `${this.ruta}/${idExpediente}/documentos`, this.aplicarFiltrosDocumentos(filtros));
  }

  async descargarDocumentosXlsx(idExpediente: number, filtros: FiltrosDocumentosExpedienteDto = {}): Promise<Blob> {
    return await firstValueFrom(this.http.get(
      `${this.ruta}/${idExpediente}/documentos/xlsx`,
      { params: this.aplicarFiltrosDocumentos(filtros), responseType: 'blob' },
    ));
  }

  /** Preview (inline) o descargar (descargar=true) un documento por su clave. */
  async obtenerArchivoDocumento(idExpediente: number, clave: string, descargar = false): Promise<Blob> {
    let p = new HttpParams();
    if (descargar) p = p.set('descargar', 'true');
    return await firstValueFrom(this.http.get(
      `${this.ruta}/${idExpediente}/documentos/${encodeURIComponent(clave)}`,
      { params: p, responseType: 'blob' },
    ));
  }

  // ══════════════════════ HU-32 Historial ══════════════════════

  obtenerHistorial(idExpediente: number, filtros: FiltrosHistorialExpedienteDto = {}): Promise<HistorialExpedienteDto> {
    return this.get<HistorialExpedienteDto>(
      `${this.ruta}/${idExpediente}/historial`, this.aplicarFiltrosHistorial(filtros));
  }

  async descargarHistorial(
    idExpediente: number,
    tab: string,
    formato: 'xlsx' | 'pdf',
    filtros: FiltrosHistorialExpedienteDto = {},
  ): Promise<Blob> {
    const p = this.aplicarFiltrosHistorial(filtros).set('tab', tab).set('formato', formato);
    return await firstValueFrom(this.http.get(
      `${this.ruta}/${idExpediente}/historial/exportar`,
      { params: p, responseType: 'blob' },
    ));
  }

  // ══════════════════════ HU-33 Reasignación ══════════════════════

  prepararReasignacion(idExpediente: number): Promise<PreparacionReasignacionExpedienteDto> {
    return this.get<PreparacionReasignacionExpedienteDto>(`${this.ruta}/${idExpediente}/reasignacion`);
  }

  obtenerCarteraComercial(idExpediente: number, idResponsable?: number | null): Promise<CarteraComercialExpedienteDto> {
    let p = new HttpParams();
    if (idResponsable != null) p = p.set('idResponsable', idResponsable.toString());
    return this.get<CarteraComercialExpedienteDto>(`${this.ruta}/${idExpediente}/reasignacion/cartera`, p);
  }

  buscarCandidatos(busqueda?: string | null, excluir?: number | null): Promise<CandidatoResponsableDto[]> {
    let p = new HttpParams();
    if (busqueda) p = p.set('busqueda', busqueda);
    if (excluir != null) p = p.set('excluir', excluir.toString());
    return this.get<CandidatoResponsableDto[]>(`${this.ruta}/reasignacion/candidatos`, p);
  }

  async reasignar(idExpediente: number, datos: ReasignarResponsableExpedienteDto): Promise<ReasignacionExpedienteDto> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ReasignacionExpedienteDto>>(
        `${this.ruta}/${idExpediente}/reasignar`, datos),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo reasignar.');
    return r.datos;
  }
}
