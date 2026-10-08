import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';

export type CampoVerificable = 'tipo_suministro' | 'subtipo' | 'marca' | 'modelo' | 'area_cliente';

export interface ValorSimilar {
  valor: string;
  detalle: string;
  usos: number;
  similitud: number;
  probableDuplicado: boolean;
}

export interface VerificacionDuplicados {
  texto: string;
  existeExacto: boolean;
  similares: ValorSimilar[];
}

@Injectable({ providedIn: 'root' })
export class VerificarDuplicadosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async verificar(
    campo: CampoVerificable,
    texto: string,
    idCliente?: number,
  ): Promise<VerificacionDuplicados> {
    let params = new HttpParams().set('campo', campo).set('texto', texto);
    if (idCliente) params = params.set('idCliente', idCliente.toString());

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<VerificacionDuplicados>>(`${this.base}/similares`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }
}
