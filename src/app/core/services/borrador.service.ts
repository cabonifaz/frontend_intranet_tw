import { Injectable } from '@angular/core';

export interface BorradorInfo<T = unknown> {
  data:           T;
  fechaGuardado:  string;   // ISO date
}

@Injectable({ providedIn: 'root' })
export class BorradorService {
  private readonly PREFIX = 'draft:';

  /**
   * Guarda un borrador en localStorage bajo la key dada.
   * Convención: `<ficha>:<nuevo|idEntidad>` — ej: `equipos:nuevo`, `equipos:123`.
   */
  guardar<T>(key: string, data: T): void {
    try {
      const info: BorradorInfo<T> = { data, fechaGuardado: new Date().toISOString() };
      localStorage.setItem(this.PREFIX + key, JSON.stringify(info));
    } catch {
      // localStorage lleno o deshabilitado — fallamos silenciosamente
    }
  }

  /**
   * Recupera el borrador si existe. Devuelve `null` si no hay o si está corrupto.
   */
  obtener<T>(key: string): BorradorInfo<T> | null {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      if (!raw) return null;
      const info = JSON.parse(raw) as BorradorInfo<T>;
      if (!info.data || !info.fechaGuardado) return null;
      return info;
    } catch {
      return null;
    }
  }

  borrar(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  tiene(key: string): boolean {
    return localStorage.getItem(this.PREFIX + key) !== null;
  }
}
