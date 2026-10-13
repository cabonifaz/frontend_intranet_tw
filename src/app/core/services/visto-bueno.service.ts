import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  BandejaVb,
  ComparacionVersiones,
  CorreccionPropuesta,
  DecisionVb,
  FiltrosBandejaVb,
  ResolverRevocacionVbRequest,
  ResolverVbRequest,
  ResultadoResolverRevocacionVb,
  ResultadoResolverVb,
  ValidacionesVb,
} from '../models/visto-bueno.model';

/**
 * Servicio de Visto Bueno (HU-13 a HU-15).
 * Conectado al back real (migraciones 45/46 + VistoBuenoController).
 */
@Injectable({ providedIn: 'root' })
export class VistoBuenoService {
  private readonly http = inject(HttpClient);
  private readonly baseVb        = `${environment.apiUrl}/api/crm/visto-bueno`;
  private readonly basePropuesta = `${environment.apiUrl}/api/crm/propuestas`;

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-13 — Bandeja (KPIs + items + comerciales + monedas + políticas en UN sólo call)
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerBandeja(filtros: FiltrosBandejaVb = {}): Promise<BandejaVb> {
    let params = new HttpParams()
      .set('pagina',    (filtros.pagina ?? 1).toString())
      .set('porPagina', (filtros.porPagina ?? 10).toString())
      .set('dias',      (filtros.dias ?? 30).toString());

    if (filtros.idComercial) params = params.set('idComercial', filtros.idComercial.toString());
    if (filtros.estado)      params = params.set('estado',      filtros.estado);
    if (filtros.idMoneda)    params = params.set('idMoneda',    filtros.idMoneda.toString());
    if (filtros.sla)         params = params.set('sla',         filtros.sla);

    const r = await firstValueFrom(this.http.get<RespuestaApi<BandejaVb>>(this.baseVb, { params }));
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar la bandeja de visto bueno.');
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-14 — Validaciones previas + Comparar versiones
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerValidaciones(idPropuesta: number): Promise<ValidacionesVb> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ValidacionesVb>>(`${this.basePropuesta}/${idPropuesta}/validaciones`)
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron cargar las validaciones.');
    return r.datos;
  }

  async compararVersiones(idBase: number, idDestino: number): Promise<ComparacionVersiones> {
    const params = new HttpParams().set('base', idBase.toString()).set('destino', idDestino.toString());
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<ComparacionVersiones>>(`${this.basePropuesta}/comparar`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudieron comparar las versiones.');
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-15 — Decisiones (preparar modales + resolver + corrección)
  // ═══════════════════════════════════════════════════════════════════════════
  async prepararDecision(idPropuesta: number): Promise<DecisionVb> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DecisionVb>>(`${this.basePropuesta}/${idPropuesta}/visto-bueno/decision`)
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo preparar la decisión.');
    return r.datos;
  }

  async obtenerCorreccion(idPropuesta: number): Promise<CorreccionPropuesta | null> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<CorreccionPropuesta>>(`${this.basePropuesta}/${idPropuesta}/correccion`)
    );
    return r.datos ?? null;
  }

  /** Endpoint unificado: aprobar | corregir | rechazar según `accion`. */
  async resolver(idPropuesta: number, dto: ResolverVbRequest): Promise<ResultadoResolverVb> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoResolverVb>>(`${this.basePropuesta}/${idPropuesta}/visto-bueno/resolver`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo registrar la decisión.');
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-13b — Resolver solicitud de revocación de VB (aprobar | rechazar)
  // ═══════════════════════════════════════════════════════════════════════════
  async resolverRevocacion(idPropuesta: number, dto: ResolverRevocacionVbRequest): Promise<ResultadoResolverRevocacionVb> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<ResultadoResolverRevocacionVb>>(
        `${this.basePropuesta}/${idPropuesta}/revocacion/resolver`, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'No se pudo resolver la revocación.');
    return r.datos;
  }
}
