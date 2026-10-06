import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';

/**
 * Claves de formato de calidad por ventana. Se corresponden con los seeds
 * de `formato_ventana` creados por la migración 33.
 */
export type ClaveFormato =
  | 'usuario_ficha'
  | 'cliente_ficha'
  | 'requerimiento_ficha'
  | 'propuesta_ficha'
  | 'texto_base_ficha'
  | 'suministro_ficha'
  | 'procedimiento_ficha'
  | 'equipo_cliente_ficha';

export interface FormatoVentana {
  clave: string;
  nombreVentana: string;
  /** Ej. "MTW97". Null si TW no lo asignó. */
  codigoFormato: string | null;
  /** Versión del formato (ej. 10 → se muestra como MTW97-10). */
  version: number | null;
  /** Combinado: `codigoFormato-version` (ej. "MTW97-10"). Null si no hay código. */
  etiqueta: string | null;
  fechaModificacion: string | null;
}

/**
 * Códigos de formato ISO/calidad por ventana. Cada ficha de maestro muestra
 * el valor configurado (ej. "MTW97-10") en su header para auditoría.
 *   GET /api/maestros/formatos-ventana?clave=X
 */
@Injectable({ providedIn: 'root' })
export class FormatosVentanaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros/formatos-ventana`;

  // Cache en memoria por sesión: el formato cambia muy raras veces.
  private readonly cache = new Map<string, FormatoVentana | null>();

  /**
   * Devuelve el formato configurado para la clave, o null si no hay. Nunca
   * tira — un fallo del back se traduce a null para no bloquear el render.
   */
  async obtener(clave: ClaveFormato): Promise<FormatoVentana | null> {
    if (this.cache.has(clave)) return this.cache.get(clave) ?? null;
    try {
      const r = await firstValueFrom(
        this.http.get<RespuestaApi<FormatoVentana[]>>(this.base, { params: { clave } })
      );
      const encontrado = r.datos?.[0] ?? null;
      this.cache.set(clave, encontrado);
      return encontrado;
    } catch {
      this.cache.set(clave, null);
      return null;
    }
  }
}
