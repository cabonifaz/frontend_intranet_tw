import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import { AccionPermitida, PermisoModulo } from '../models/permisos.model';

/**
 * Permisos del usuario autenticado (ticket #4301).
 *
 * - `cargar()` se llama al iniciar sesión / arrancar la app.
 * - `puede(accion)` responde en memoria sin volver al back.
 * - El back ya cachea 30 s por usuario (PermisosFilter).
 */
@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  private readonly _acciones = signal<AccionPermitida[]>([]);
  private readonly _permisos = signal<PermisoModulo[]>([]);
  private readonly _cargado  = signal(false);

  readonly cargado  = this._cargado.asReadonly();
  readonly acciones = this._acciones.asReadonly();
  readonly permisos = this._permisos.asReadonly();

  /** Set de acciones permitidas, para lookups O(1) en `puede(accion)`. */
  private readonly accionesPermitidas = computed(
    () => new Set(this._acciones().filter(a => a.permitido).map(a => a.accion))
  );

  async cargar(): Promise<void> {
    try {
      const [accR, perR] = await Promise.all([
        firstValueFrom(this.http.get<RespuestaApi<AccionPermitida[]>>(`${this.base}/autenticacion/acciones`)),
        firstValueFrom(this.http.get<RespuestaApi<PermisoModulo[]>>(`${this.base}/autenticacion/permisos`)),
      ]);
      this._acciones.set(accR?.datos ?? []);
      this._permisos.set(perR?.datos ?? []);
    } catch {
      // Sin permisos cargados: el front cae a su comportamiento conservador
      // (ocultar). El back igualmente valida con [RequierePermiso].
      this._acciones.set([]);
      this._permisos.set([]);
    } finally {
      this._cargado.set(true);
    }
  }

  limpiar(): void {
    this._acciones.set([]);
    this._permisos.set([]);
    this._cargado.set(false);
  }

  /** Rápido: ¿el usuario puede ejecutar esta acción? */
  puede(accion: string): boolean {
    return this.accionesPermitidas().has(accion);
  }

  /** Rápido: nivel de acceso del usuario a un módulo. 'ninguno' si no tiene. */
  accesoAModulo(modulo: string): PermisoModulo['acceso'] {
    return this._permisos().find(p => p.modulo === modulo)?.acceso ?? 'ninguno';
  }
}
