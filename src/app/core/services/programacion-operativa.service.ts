import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BusquedaTecnicos,
  CancelacionPreparada,
  CancelacionResultado,
  CancelarRequest,
  CrearProgramacionRequest,
  DerivacionSsoma,
  DerivarSsomaRequest,
  DetalleProgramacion,
  FichaProgramacion,
  FiltrosProgramacionOperativa,
  FiltrosTecnicosProgramacion,
  ListaProgramacion,
  ProgramacionCreada,
  ProgramacionPreparada,
  RegistrarRespuestaClienteRequest,
  ReprogramacionResultado,
  ReprogramarRequest,
  ResolverSolicitudRequest,
  RespuestaClienteRegistrada,
  ResumenProgramacion,
  SolicitudReprogramacion,
  SolicitudResuelta,
} from '../models/programacion-operativa.model';
import {
  CerrarRendicionResultado,
  ComprobanteGasto,
  GuardarViaticosInput,
  GuardarViaticosResultado,
  RevisarGastoInput,
  RevisarGastoResultado,
  ViaticosProgramacion,
} from '../models/programacion-viaticos.model';

interface RespuestaApi<T> {
  idTipoMensaje: number;
  mensaje:       string;
  datos:         T | null;
}

/**
 * Módulo 8 Programación Operativa (Sprint 5) — HU-35 a HU-39 + HU-45.
 * Base: /api/operaciones/programacion. Rutas y permisos los documenta
 * `ProgramacionOperativaController` en el back.
 */
@Injectable({ providedIn: 'root' })
export class ProgramacionOperativaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/operaciones/programacion`;

  // ─── HU-35 Bandeja ─────────────────────────────────────────────────────────

  async obtenerResumen(fechaSemana?: string | null, busqueda?: string | null): Promise<ResumenProgramacion> {
    let params = new HttpParams();
    if (fechaSemana) params = params.set('fechaSemana', fechaSemana);
    if (busqueda)    params = params.set('busqueda',    busqueda);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ResumenProgramacion>>(`${this.base}/resumen`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el resumen.');
    return r.datos;
  }

  async obtenerPendientes(f: FiltrosProgramacionOperativa): Promise<ListaProgramacion> {
    const params = this.armarParams(f);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ListaProgramacion>>(`${this.base}/pendientes`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar las programaciones pendientes.');
    return r.datos;
  }

  async obtenerProgramados(f: FiltrosProgramacionOperativa): Promise<ListaProgramacion> {
    const params = this.armarParams(f);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ListaProgramacion>>(`${this.base}/programados`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar las programaciones.');
    return r.datos;
  }

  async exportarPendientes(f: FiltrosProgramacionOperativa): Promise<Blob> {
    const params = this.armarParams(f);
    return firstValueFrom(
      this.http.get(`${this.base}/pendientes/exportar`, { params, responseType: 'blob' }),
    );
  }

  async exportarProgramados(f: FiltrosProgramacionOperativa): Promise<Blob> {
    const params = this.armarParams(f);
    return firstValueFrom(
      this.http.get(`${this.base}/programados/exportar`, { params, responseType: 'blob' }),
    );
  }

  // ─── HU-36 Ficha Programar Servicio ───────────────────────────────────────

  async prepararProgramacion(idOs: number): Promise<FichaProgramacion> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<FichaProgramacion>>(`${this.base}/ordenes/${idOs}/preparar`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la ficha de programación.');
    return r.datos;
  }

  async buscarTecnicos(idOs: number, f: FiltrosTecnicosProgramacion): Promise<BusquedaTecnicos> {
    let params = new HttpParams();
    if (f.fecha)             params = params.set('fecha',             f.fecha);
    if (f.horaInicio)        params = params.set('horaInicio',        f.horaInicio);
    if (f.horaFin)           params = params.set('horaFin',           f.horaFin);
    if (f.soloDisponibles)   params = params.set('soloDisponibles',   'true');
    if (f.soloSsomaConforme) params = params.set('soloSsomaConforme', 'true');
    if (f.busqueda)          params = params.set('busqueda',          f.busqueda);
    if (f.sedeOperativa)     params = params.set('sedeOperativa',     f.sedeOperativa);
    if (f.tipoRecurso)       params = params.set('tipoRecurso',       f.tipoRecurso);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<BusquedaTecnicos>>(`${this.base}/ordenes/${idOs}/tecnicos`, { params }),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el buscador de técnicos.');
    return r.datos;
  }

  async crearProgramacion(dto: CrearProgramacionRequest): Promise<ProgramacionCreada> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ProgramacionCreada>>(this.base, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo crear la programación.');
    return r.datos;
  }

  async derivarSsoma(idOs: number, dto: DerivarSsomaRequest): Promise<DerivacionSsoma> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<DerivacionSsoma>>(`${this.base}/ordenes/${idOs}/derivar-ssoma`, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo derivar al área SSOMA.');
    return r.datos;
  }

  // ─── HU-37 Detalle + Registrar respuesta cliente ──────────────────────────

  async obtenerDetalleProgramacion(idProgramacion: number): Promise<DetalleProgramacion> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DetalleProgramacion>>(`${this.base}/programaciones/${idProgramacion}`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el detalle de la programación.');
    return r.datos;
  }

  async registrarRespuestaCliente(
    idProgramacion: number,
    dto: RegistrarRespuestaClienteRequest,
  ): Promise<RespuestaClienteRegistrada> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<RespuestaClienteRegistrada>>(
        `${this.base}/programaciones/${idProgramacion}/respuesta-cliente`, dto,
      ),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la respuesta del cliente.');
    return r.datos;
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  // ─── HU-38 Reprogramación + Cancelación ───────────────────────────────────

  async prepararReprogramacion(idProgramacion: number): Promise<ProgramacionPreparada> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ProgramacionPreparada>>(
        `${this.base}/programaciones/${idProgramacion}/reprogramar/preparar`,
      ),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la reprogramación.');
    return r.datos;
  }

  async reprogramar(idProgramacion: number, dto: ReprogramarRequest): Promise<ReprogramacionResultado> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ReprogramacionResultado>>(
        `${this.base}/programaciones/${idProgramacion}/reprogramar`, dto,
      ),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo reprogramar.');
    return r.datos;
  }

  async obtenerSolicitud(idSolicitud: number): Promise<SolicitudReprogramacion> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SolicitudReprogramacion>>(`${this.base}/solicitudes/${idSolicitud}`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la solicitud.');
    return r.datos;
  }

  async aprobarSolicitud(idSolicitud: number, dto: ResolverSolicitudRequest): Promise<SolicitudResuelta> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<SolicitudResuelta>>(`${this.base}/solicitudes/${idSolicitud}/aprobar`, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo aprobar la solicitud.');
    return r.datos;
  }

  async rechazarSolicitud(idSolicitud: number, dto: ResolverSolicitudRequest): Promise<SolicitudResuelta> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<SolicitudResuelta>>(`${this.base}/solicitudes/${idSolicitud}/rechazar`, dto),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo rechazar la solicitud.');
    return r.datos;
  }

  async retirarSolicitud(idSolicitud: number): Promise<SolicitudResuelta> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<SolicitudResuelta>>(`${this.base}/solicitudes/${idSolicitud}/retirar`, {}),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo retirar la solicitud.');
    return r.datos;
  }

  async prepararCancelacion(idProgramacion: number): Promise<CancelacionPreparada> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CancelacionPreparada>>(
        `${this.base}/programaciones/${idProgramacion}/cancelar/preparar`,
      ),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la cancelación.');
    return r.datos;
  }

  async cancelarProgramacion(idProgramacion: number, dto: CancelarRequest): Promise<CancelacionResultado> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<CancelacionResultado>>(
        `${this.base}/programaciones/${idProgramacion}/cancelar`, dto,
      ),
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo cancelar la programación.');
    return r.datos;
  }

  // ─── HU-45 Viáticos ────────────────────────────────────────────────────────

  async obtenerViaticos(idProgramacion: number): Promise<ViaticosProgramacion> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ViaticosProgramacion>>(`${this.base}/programaciones/${idProgramacion}/viaticos`),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar los viáticos.');
    return r.datos;
  }

  async guardarViaticos(idProgramacion: number, dto: GuardarViaticosInput): Promise<GuardarViaticosResultado> {
    const r = await firstValueFrom(
      this.http.put<RespuestaApi<GuardarViaticosResultado>>(
        `${this.base}/programaciones/${idProgramacion}/viaticos`, dto,
      ),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo guardar la asignación.');
    return r.datos;
  }

  async revisarGasto(idProgramacion: number, idGasto: number, dto: RevisarGastoInput): Promise<RevisarGastoResultado> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<RevisarGastoResultado>>(
        `${this.base}/programaciones/${idProgramacion}/viaticos/gastos/${idGasto}/revision`, dto,
      ),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo registrar la revisión del gasto.');
    return r.datos;
  }

  async obtenerComprobante(idProgramacion: number, idGasto: number): Promise<ComprobanteGasto> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ComprobanteGasto>>(
        `${this.base}/programaciones/${idProgramacion}/viaticos/gastos/${idGasto}/comprobante`,
      ),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo obtener el comprobante.');
    return r.datos;
  }

  async cerrarRendicion(idProgramacion: number): Promise<CerrarRendicionResultado> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<CerrarRendicionResultado>>(
        `${this.base}/programaciones/${idProgramacion}/viaticos/cierre`, {},
      ),
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cerrar la rendición.');
    return r.datos;
  }

  private armarParams(f: FiltrosProgramacionOperativa): HttpParams {
    let p = new HttpParams()
      .set('pagina',    f.pagina)
      .set('porPagina', f.porPagina);
    if (f.subEstado   && f.subEstado  !== 'todos') p = p.set('subEstado',   f.subEstado);
    if (f.rango       && f.rango      !== 'todos') p = p.set('rango',       f.rango);
    if (f.fechaDesde)  p = p.set('fechaDesde', f.fechaDesde);
    if (f.fechaHasta)  p = p.set('fechaHasta', f.fechaHasta);
    if (f.tipo        && f.tipo       !== 'todos') p = p.set('tipo',        f.tipo);
    if (f.idCliente   != null)  p = p.set('idCliente', String(f.idCliente));
    if (f.idArea      != null)  p = p.set('idArea',    String(f.idArea));
    if (f.idTecnico   != null)  p = p.set('idTecnico', String(f.idTecnico));
    if (f.idSede      != null)  p = p.set('idSede',    String(f.idSede));
    if (f.zona)       p = p.set('zona',     f.zona);
    if (f.busqueda)   p = p.set('busqueda', f.busqueda);
    return p;
  }
}
