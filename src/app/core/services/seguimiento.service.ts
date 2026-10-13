import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  BandejaSeguimiento,
  CerrarSinVentaRequest,
  CorreoSeguimientoRequest,
  DetalleSeguimiento,
  FiltrosBandejaSeguimiento,
  PreparacionCierreSeguimiento,
  PreparacionRegistroSeguimiento,
  PreparacionReprogramacion,
  RegistrarAceptacionRequest,
  RegistrarLlamadaRequest,
  RegistrarRechazoRequest,
  RegistrarSeguimientoRequest,
  ReprogramarAccionRequest,
  ResultadoCierreSeguimiento,
  ResultadoRegistroSeguimiento,
  ResultadoReprogramacion,
} from '../models/seguimiento.model';

/**
 * HU-17 Bandeja · HU-18 Detalle · HU-19 Registro · HU-20 Reprogramación · HU-21 Cierre
 * del Seguimiento Comercial. Conectado al back real (SeguimientoComercialController).
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm/seguimiento`;

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-17 — Bandeja
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerBandeja(filtros: FiltrosBandejaSeguimiento = {}): Promise<BandejaSeguimiento> {
    let params = new HttpParams()
      .set('pagina',    (filtros.pagina ?? 1).toString())
      .set('porPagina', (filtros.porPagina ?? 10).toString());
    if (filtros.idResponsable) params = params.set('idResponsable', filtros.idResponsable.toString());
    if (filtros.estado)        params = params.set('estado',        filtros.estado);
    if (filtros.busqueda)      params = params.set('busqueda',      filtros.busqueda);

    const r = await firstValueFrom(this.http.get<RespuestaApi<BandejaSeguimiento>>(this.base, { params }));
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la bandeja.');
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-18 — Detalle
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerDetalle(idPropuesta: number): Promise<DetalleSeguimiento> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DetalleSeguimiento>>(`${this.base}/${idPropuesta}`)
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el detalle.');
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-19 — Registro
  // ═══════════════════════════════════════════════════════════════════════════
  async prepararRegistro(idPropuesta: number): Promise<PreparacionRegistroSeguimiento> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionRegistroSeguimiento>>(`${this.base}/${idPropuesta}/registro/preparar`)
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar el registro.');
    return r.datos;
  }

  async registrarSeguimiento(idPropuesta: number, dto: RegistrarSeguimientoRequest): Promise<ResultadoRegistroSeguimiento> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoRegistroSeguimiento>>(`${this.base}/${idPropuesta}/registros`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar el seguimiento.');
    return r.datos;
  }

  async registrarLlamada(idPropuesta: number, dto: RegistrarLlamadaRequest): Promise<ResultadoRegistroSeguimiento> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoRegistroSeguimiento>>(`${this.base}/${idPropuesta}/llamadas`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la llamada.');
    return r.datos;
  }

  async guardarBorradorCorreo(idPropuesta: number, dto: CorreoSeguimientoRequest): Promise<ResultadoRegistroSeguimiento> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoRegistroSeguimiento>>(`${this.base}/${idPropuesta}/correos/borrador`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo guardar el borrador.');
    return r.datos;
  }

  async enviarCorreo(idPropuesta: number, dto: CorreoSeguimientoRequest): Promise<ResultadoRegistroSeguimiento> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoRegistroSeguimiento>>(`${this.base}/${idPropuesta}/correos/enviar`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo enviar el correo.');
    return r.datos;
  }

  async subirAdjuntos(idSeguimiento: number, archivos: File[]): Promise<unknown> {
    const fd = new FormData();
    for (const a of archivos) fd.append('archivos', a, a.name);
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<unknown>>(`${this.base}/registros/${idSeguimiento}/adjuntos`, fd)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudieron subir los adjuntos.');
    return r.datos;
  }

  obtenerAdjuntoUrl(idAdjunto: number): string {
    return `${this.base}/adjuntos/${idAdjunto}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-20 — Reprogramación
  // ═══════════════════════════════════════════════════════════════════════════
  async prepararReprogramacion(idPropuesta: number): Promise<PreparacionReprogramacion> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionReprogramacion>>(`${this.base}/${idPropuesta}/reprogramacion/preparar`)
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la reprogramación.');
    return r.datos;
  }

  async reprogramar(idPropuesta: number, dto: ReprogramarAccionRequest): Promise<ResultadoReprogramacion> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoReprogramacion>>(`${this.base}/${idPropuesta}/reprogramar`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo reprogramar.');
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-21 — Cierre
  // ═══════════════════════════════════════════════════════════════════════════
  async prepararCierre(idPropuesta: number): Promise<PreparacionCierreSeguimiento> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PreparacionCierreSeguimiento>>(`${this.base}/${idPropuesta}/cierre/preparar`)
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar el cierre.');
    return r.datos;
  }

  async aceptar(idPropuesta: number, dto: RegistrarAceptacionRequest): Promise<ResultadoCierreSeguimiento> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoCierreSeguimiento>>(`${this.base}/${idPropuesta}/aceptar`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la aceptación.');
    return r.datos;
  }

  async rechazar(idPropuesta: number, dto: RegistrarRechazoRequest): Promise<ResultadoCierreSeguimiento> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoCierreSeguimiento>>(`${this.base}/${idPropuesta}/rechazar`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar el rechazo.');
    return r.datos;
  }

  async cerrarSinVenta(idPropuesta: number, dto: CerrarSinVentaRequest): Promise<ResultadoCierreSeguimiento> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoCierreSeguimiento>>(`${this.base}/${idPropuesta}/cerrar-sin-venta`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo cerrar sin venta.');
    return r.datos;
  }
}
