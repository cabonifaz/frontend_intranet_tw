import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import { EntidadSiguienteCodigo, SiguienteCodigo } from './ubigeo.service';

/**
 * Próximo código de ficha (preview en modo "nuevo"). Lo lee del back.
 *   GET /api/maestros/siguiente-codigo/{entidad}
 * Entidades soportadas por el back hoy: requerimiento, propuesta, suministro, equipo_cliente.
 * Clientes y Usuarios NO están soportados aún — el front mantiene fallback hardcoded.
 */
@Injectable({ providedIn: 'root' })
export class SiguienteCodigoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros/siguiente-codigo`;

  async obtener(entidad: EntidadSiguienteCodigo): Promise<string> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SiguienteCodigo>>(`${this.base}/${entidad}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos.codigo;
  }
}
