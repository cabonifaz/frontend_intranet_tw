import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CertificadoGuardadoApi,
  CierreEquipoApi,
  ConstanciaApi,
  ContextoRegistroApi,
  EvidenciasApi,
  EnsayosApi,
  FirmaAusentePayload,
  FirmasApi,
  FotoFallaSubidaApi,
  GuardarCabeceraInformeApi,
  GuardarCertificadoPayload,
  GuardarEnsayosApi,
  InformeEnCursoApi,
  InformeGeneradoApi,
  CabeceraInformeIntranetApi,
  PeticionIniciarRegistroApi,
  PeticionVariablesAmbientalesApi,
  RespuestaIntranetApi,
  ResultadoEvidenciaApi,
  ResultadoGuardarCabeceraApi,
  ResultadoIniciarRegistroApi,
  ResultadoPausarEquipoAbiertoApi,
  SolicitarCorrelativoPayload,
  SolicitudCorrelativoApi,
  TicketCreadoApi,
  TrabajoEquipoApi,
} from '../models/registro-informe-intranet-api.model';

/**
 * HU-55 — Registrar Informe Técnico desde Intranet.
 *
 * Cliente de /api/intranet/servicios/{idOs}/equipos/{idOsEquipo}/... y
 * /api/intranet/servicios/{idOs}/{firma-informes|constancia}/...
 *
 * Reglas comunes:
 *  - Envelope { idTipoMensaje, mensaje, datos } — 2 = éxito.
 *  - 409 cuando otra persona tiene el equipo abierto (mensaje indica quién);
 *    lo re-emitimos como un Error con el mensaje del back + un flag `conflicto`.
 *  - 403 si falta el permiso seg_registrar_informe.
 *  - Blobs (archivo de evidencia, foto de constancia) con responseType blob
 *    para que pase el token por el interceptor.
 *
 * Doc: Desarrollo/backend_intranet_tw/docs/HU-55_REGISTRO_INFORME_INTRANET.md
 */
@Injectable({ providedIn: 'root' })
export class RegistroInformeIntranetService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/intranet/servicios`;

  // ─── 1. Lectura ───────────────────────────────────────────────────────

  /** Contexto completo para arrancar el wizard (solo lectura, no toma bloqueo). */
  async contextoRegistro(idOs: number, idOsEquipo: number): Promise<ContextoRegistroApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      return await this.get<ContextoRegistroApi>(
        `${this.base}/${idOs}/equipos/${idOsEquipo}/contexto-registro`,
      );
    } catch (e) { throw this.comoError(e, 'No se pudo cargar el contexto de registro.'); }
  }

  /** Datos ya cargados del equipo (para retomar si se cerró la pantalla). */
  async informeEnCurso(idOs: number, idOsEquipo: number): Promise<InformeEnCursoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      return await this.get<InformeEnCursoApi>(
        `${this.base}/${idOs}/equipos/${idOsEquipo}/informe-en-curso`,
      );
    } catch (e) { throw this.comoError(e, 'No se pudo cargar el informe en curso.'); }
  }

  // ─── 2. Sesión de registro (bloqueo 30 min por inactividad) ───────────

  /** Comienza el registro del equipo con la hora Lima inicio/fin y motivo. 409 si otra persona lo tiene. */
  async iniciarRegistro(
    idOs: number, idOsEquipo: number, datos: PeticionIniciarRegistroApi,
  ): Promise<ResultadoIniciarRegistroApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<ResultadoIniciarRegistroApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/iniciar-registro`, datos,
        ),
      );
      return this.unwrap(r, 'No se pudo iniciar el registro.');
    } catch (e) { throw this.comoError(e, 'No se pudo iniciar el registro.'); }
  }

  /** Libera el bloqueo del equipo (al salir del asistente sin generar). */
  async liberarRegistro(idOs: number, idOsEquipo: number): Promise<void> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<unknown>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/liberar-registro`, {},
        ),
      );
      if (r.idTipoMensaje !== 2) throw new Error(r.mensaje || 'No se pudo liberar el registro.');
    } catch (e) { throw this.comoError(e, 'No se pudo liberar el registro.'); }
  }

  /** Pausa el OTRO equipo que el técnico dejó en ejecución (para poder iniciar éste). */
  async pausarEquipoAbierto(
    idOs: number, idOsEquipo: number, motivo?: string | null,
  ): Promise<ResultadoPausarEquipoAbiertoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<ResultadoPausarEquipoAbiertoApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/pausar-equipo-abierto`,
          { motivo: motivo ?? null },
        ),
      );
      return this.unwrap(r, 'No se pudo pausar el otro equipo abierto.');
    } catch (e) { throw this.comoError(e, 'No se pudo pausar el otro equipo abierto.'); }
  }

  // ─── 3. Variables ambientales ─────────────────────────────────────────

  async guardarVariablesAmbientales(
    idOs: number, idOsEquipo: number, datos: PeticionVariablesAmbientalesApi,
  ): Promise<TrabajoEquipoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.put<RespuestaIntranetApi<TrabajoEquipoApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/variables-ambientales`, datos,
        ),
      );
      return this.unwrap(r, 'No se pudieron guardar las variables ambientales.');
    } catch (e) { throw this.comoError(e, 'No se pudieron guardar las variables ambientales.'); }
  }

  // ─── 4. Evidencias (panel, upload, forzar, quitar adicional, archivo) ─

  async obtenerEvidencias(idOs: number, idOsEquipo: number): Promise<EvidenciasApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      return await this.get<EvidenciasApi>(
        `${this.base}/${idOs}/equipos/${idOsEquipo}/evidencias`,
      );
    } catch (e) { throw this.comoError(e, 'No se pudieron cargar las evidencias.'); }
  }

  /** Sube una foto/video. Devuelve el resultado (aprobada/rechazada por IA). */
  async subirEvidencia(
    idOs: number, idOsEquipo: number,
    campos: {
      codigo: string;
      archivo: File;
      cuadro?: File | null;
      pagina?: number | null;
      duracionSeg?: number | null;
      qrTexto?: string | null;
    },
  ): Promise<ResultadoEvidenciaApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const form = new FormData();
      form.append('codigo', campos.codigo);
      form.append('archivo', campos.archivo);
      if (campos.cuadro)      form.append('cuadro', campos.cuadro);
      if (campos.pagina != null)      form.append('pagina', String(campos.pagina));
      if (campos.duracionSeg != null) form.append('duracionSeg', String(campos.duracionSeg));
      if (campos.qrTexto)             form.append('qrTexto', campos.qrTexto);
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<ResultadoEvidenciaApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/evidencias`, form,
        ),
      );
      return this.unwrap(r, 'No se pudo subir la evidencia.');
    } catch (e) { throw this.comoError(e, 'No se pudo subir la evidencia.'); }
  }

  /** Acepta una foto rechazada por la IA (HU-12). Devuelve el panel actualizado. */
  async forzarEvidencia(
    idOs: number, idOsEquipo: number, idEvidencia: number, motivo: string,
  ): Promise<EvidenciasApi> {
    this.validarIds(idOs, idOsEquipo);
    if (!Number.isInteger(idEvidencia) || idEvidencia <= 0) throw new Error('La evidencia no es válida.');
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<EvidenciasApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/evidencias/${idEvidencia}/forzar`,
          { motivo },
        ),
      );
      return this.unwrap(r, 'No se pudo forzar la evidencia.');
    } catch (e) { throw this.comoError(e, 'No se pudo forzar la evidencia.'); }
  }

  /** Quita una foto adicional (máx 20 por equipo). */
  async quitarEvidenciaAdicional(
    idOs: number, idOsEquipo: number, idEvidencia: number,
  ): Promise<EvidenciasApi> {
    this.validarIds(idOs, idOsEquipo);
    if (!Number.isInteger(idEvidencia) || idEvidencia <= 0) throw new Error('La evidencia no es válida.');
    try {
      const r = await firstValueFrom(
        this.http.delete<RespuestaIntranetApi<EvidenciasApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/evidencias/adicionales/${idEvidencia}`,
        ),
      );
      return this.unwrap(r, 'No se pudo quitar la evidencia adicional.');
    } catch (e) { throw this.comoError(e, 'No se pudo quitar la evidencia adicional.'); }
  }

  /** Descarga el blob de una foto/video. Usar `cuadro=true` para el cuadro estático del video. */
  async obtenerArchivoEvidencia(
    idOs: number, idOsEquipo: number, idEvidencia: number, cuadro = false,
  ): Promise<Blob> {
    this.validarIds(idOs, idOsEquipo);
    if (!Number.isInteger(idEvidencia) || idEvidencia <= 0) throw new Error('La evidencia no es válida.');
    try {
      const params = cuadro ? new HttpParams().set('cuadro', 'true') : undefined;
      return await firstValueFrom(
        this.http.get(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/evidencias/${idEvidencia}/archivo`,
          { params, responseType: 'blob' },
        ),
      );
    } catch (e) { throw this.comoError(e, 'No se pudo descargar el archivo de la evidencia.'); }
  }

  // ─── 5. Ensayos ────────────────────────────────────────────────────────

  async obtenerEnsayos(idOs: number, idOsEquipo: number): Promise<EnsayosApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      return await this.get<EnsayosApi>(`${this.base}/${idOs}/equipos/${idOsEquipo}/ensayos`);
    } catch (e) { throw this.comoError(e, 'No se pudieron cargar los ensayos.'); }
  }

  async guardarEnsayos(
    idOs: number, idOsEquipo: number, datos: GuardarEnsayosApi,
  ): Promise<unknown> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.put<RespuestaIntranetApi<unknown>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/ensayos`, datos,
        ),
      );
      return this.unwrap(r, 'No se pudieron guardar los ensayos.');
    } catch (e) { throw this.comoError(e, 'No se pudieron guardar los ensayos.'); }
  }

  // ─── 6. Cabecera del informe ───────────────────────────────────────────

  async obtenerCabeceraInforme(idOs: number, idOsEquipo: number): Promise<CabeceraInformeIntranetApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      return await this.get<CabeceraInformeIntranetApi>(
        `${this.base}/${idOs}/equipos/${idOsEquipo}/cabecera-informe`,
      );
    } catch (e) { throw this.comoError(e, 'No se pudo cargar la cabecera del informe.'); }
  }

  async guardarCabeceraInforme(
    idOs: number, idOsEquipo: number, datos: GuardarCabeceraInformeApi,
  ): Promise<ResultadoGuardarCabeceraApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.put<RespuestaIntranetApi<ResultadoGuardarCabeceraApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/cabecera-informe`, datos,
        ),
      );
      return this.unwrap(r, 'No se pudo guardar la cabecera del informe.');
    } catch (e) { throw this.comoError(e, 'No se pudo guardar la cabecera del informe.'); }
  }

  /** Sube una foto de falla. Devuelve el idEvidencia para enlazarlo luego en la lista de fotos de la falla. */
  async subirFotoFalla(
    idOs: number, idOsEquipo: number, archivo: File,
  ): Promise<FotoFallaSubidaApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<FotoFallaSubidaApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/cabecera-informe/fotos`, form,
        ),
      );
      return this.unwrap(r, 'No se pudo subir la foto de la falla.');
    } catch (e) { throw this.comoError(e, 'No se pudo subir la foto de la falla.'); }
  }

  // ─── 7. Correlativo y certificado ──────────────────────────────────────

  async obtenerCorrelativo(idOs: number, idOsEquipo: number): Promise<SolicitudCorrelativoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      return await this.get<SolicitudCorrelativoApi>(
        `${this.base}/${idOs}/equipos/${idOsEquipo}/correlativo`,
      );
    } catch (e) { throw this.comoError(e, 'No se pudo cargar el correlativo.'); }
  }

  async solicitarCorrelativo(
    idOs: number, idOsEquipo: number, datos: SolicitarCorrelativoPayload,
  ): Promise<TicketCreadoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<TicketCreadoApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/correlativo/solicitar`, datos,
        ),
      );
      return this.unwrap(r, 'No se pudo solicitar el correlativo.');
    } catch (e) { throw this.comoError(e, 'No se pudo solicitar el correlativo.'); }
  }

  async guardarCertificado(
    idOs: number, idOsEquipo: number, datos: GuardarCertificadoPayload,
  ): Promise<CertificadoGuardadoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.put<RespuestaIntranetApi<CertificadoGuardadoApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/correlativo/certificado`, datos,
        ),
      );
      return this.unwrap(r, 'No se pudo guardar el certificado.');
    } catch (e) { throw this.comoError(e, 'No se pudo guardar el certificado.'); }
  }

  // ─── 8. Cierre (Hard Stop) e informe ───────────────────────────────────

  async verificarCierre(idOs: number, idOsEquipo: number): Promise<CierreEquipoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      return await this.get<CierreEquipoApi>(
        `${this.base}/${idOs}/equipos/${idOsEquipo}/cierre`,
      );
    } catch (e) { throw this.comoError(e, 'No se pudo verificar el cierre.'); }
  }

  /** Genera el informe NNNN-AAAA. Libera el bloqueo. Idempotente contra re-llamadas. */
  async generarInforme(idOs: number, idOsEquipo: number): Promise<InformeGeneradoApi> {
    this.validarIds(idOs, idOsEquipo);
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<InformeGeneradoApi>>(
          `${this.base}/${idOs}/equipos/${idOsEquipo}/informe`, {},
        ),
      );
      return this.unwrap(r, 'No se pudo generar el informe.');
    } catch (e) { throw this.comoError(e, 'No se pudo generar el informe.'); }
  }

  // ─── 9. Firma de informes (nivel OS) ───────────────────────────────────

  async obtenerFirmaInformes(idOs: number): Promise<FirmasApi> {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS no es válida.');
    try {
      return await this.get<FirmasApi>(`${this.base}/${idOs}/firma-informes`);
    } catch (e) { throw this.comoError(e, 'No se pudo cargar la firma de informes.'); }
  }

  /** Firma un informe en formato físico (foto del papel + nombre). */
  async firmarInformeFisico(
    idOs: number, clave: string, foto: File, nombre: string,
  ): Promise<unknown> {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS no es válida.');
    if (!clave || clave.length !== 32) throw new Error('La clave del responsable no es válida.');
    try {
      const form = new FormData();
      form.append('foto', foto);
      form.append('nombre', nombre);
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<unknown>>(
          `${this.base}/${idOs}/firma-informes/${clave}/fisico`, form,
        ),
      );
      return this.unwrap(r, 'No se pudo registrar la firma física.');
    } catch (e) { throw this.comoError(e, 'No se pudo registrar la firma física.'); }
  }

  /** Marca un informe como "cliente ausente" (con motivo 5–300 chars). */
  async firmarInformeAusente(
    idOs: number, clave: string, datos: FirmaAusentePayload,
  ): Promise<unknown> {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS no es válida.');
    if (!clave || clave.length !== 32) throw new Error('La clave del responsable no es válida.');
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<unknown>>(
          `${this.base}/${idOs}/firma-informes/${clave}/ausente`, datos,
        ),
      );
      return this.unwrap(r, 'No se pudo registrar el cliente ausente.');
    } catch (e) { throw this.comoError(e, 'No se pudo registrar el cliente ausente.'); }
  }

  // ─── 10. Constancia (nivel OS) ─────────────────────────────────────────

  async obtenerConstancia(idOs: number): Promise<ConstanciaApi> {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS no es válida.');
    try {
      return await this.get<ConstanciaApi>(`${this.base}/${idOs}/constancia`);
    } catch (e) { throw this.comoError(e, 'No se pudo cargar la constancia.'); }
  }

  async firmarConstanciaFisico(
    idOs: number, foto: File, nombre: string,
  ): Promise<unknown> {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS no es válida.');
    try {
      const form = new FormData();
      form.append('foto', foto);
      form.append('nombre', nombre);
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<unknown>>(
          `${this.base}/${idOs}/constancia/fisico`, form,
        ),
      );
      return this.unwrap(r, 'No se pudo registrar la firma física de la constancia.');
    } catch (e) { throw this.comoError(e, 'No se pudo registrar la firma física de la constancia.'); }
  }

  /** Cierra el servicio generando la constancia (requiere firma del cliente). */
  async generarConstancia(idOs: number): Promise<unknown> {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS no es válida.');
    try {
      const r = await firstValueFrom(
        this.http.post<RespuestaIntranetApi<unknown>>(
          `${this.base}/${idOs}/constancia/generar`, {},
        ),
      );
      return this.unwrap(r, 'No se pudo generar la constancia.');
    } catch (e) { throw this.comoError(e, 'No se pudo generar la constancia.'); }
  }

  async obtenerArchivoConstancia(idOs: number, tipo: 'pdf' | 'foto' = 'pdf'): Promise<Blob> {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS no es válida.');
    try {
      const params = new HttpParams().set('tipo', tipo);
      return await firstValueFrom(
        this.http.get(`${this.base}/${idOs}/constancia/archivo`, { params, responseType: 'blob' }),
      );
    } catch (e) { throw this.comoError(e, 'No se pudo descargar el archivo de la constancia.'); }
  }

  // ─── HTTP helpers ──────────────────────────────────────────────────────

  private validarIds(idOs: number, idOsEquipo: number): void {
    if (!Number.isInteger(idOs) || idOs <= 0) throw new Error('La OS indicada no es válida.');
    if (!Number.isInteger(idOsEquipo) || idOsEquipo <= 0) throw new Error('El equipo indicado no es válido.');
  }

  private async get<T>(url: string, params?: HttpParams): Promise<T> {
    const r = await firstValueFrom(this.http.get<RespuestaIntranetApi<T>>(url, { params }));
    if (r.idTipoMensaje !== 2 || r.datos === null || r.datos === undefined) {
      throw new Error(r.mensaje || 'El servidor no devolvió datos.');
    }
    return r.datos;
  }

  private unwrap<T>(r: RespuestaIntranetApi<T>, mensajeFallback: string): T {
    if (r.idTipoMensaje !== 2 || r.datos === null || r.datos === undefined) {
      throw new Error(r.mensaje || mensajeFallback);
    }
    return r.datos;
  }

  /** Normaliza errores HTTP. En 409 agrega la marca `conflicto` al error para que el componente la detecte. */
  private comoError(e: unknown, porDefecto: string): Error {
    if (e instanceof HttpErrorResponse) {
      if (e.status === 0) return new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
      // Back envuelve en el mismo envelope; el mensaje viene en e.error.mensaje.
      const mensajeBack = (e.error && typeof e.error === 'object' && 'mensaje' in e.error)
        ? String((e.error as { mensaje?: string }).mensaje ?? '').trim()
        : '';
      if (e.status === 409) {
        const err = new Error(mensajeBack || 'Otra persona está registrando este equipo.') as Error & { conflicto: boolean };
        err.conflicto = true;
        return err;
      }
      if (e.status === 403) return new Error(mensajeBack || 'No tienes permiso para esta acción.');
      if (e.status === 400) return new Error(mensajeBack || porDefecto);
      return new Error(mensajeBack || porDefecto);
    }
    return e instanceof Error && e.message ? e : new Error(porDefecto);
  }
}
