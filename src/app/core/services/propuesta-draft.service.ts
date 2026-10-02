import { Injectable, computed, signal } from '@angular/core';
import { crearDraftVacio, PropuestaDraft } from '../models/propuesta-detalle.model';

const STORAGE_PREFIX = 'tw-propuesta-draft:';

/**
 * State compartido del wizard de propuesta (HU-07).
 *
 * - Mantiene el draft activo como signal.
 * - Persiste cada mutación en localStorage para que F5 no pierda cambios.
 * - Expone computeds para el sidebar (totales, estado del flujo, etc.).
 *
 * Nota: todavía no hay back. Al cerrar el wizard el draft se descarta del
 *       service pero queda en localStorage hasta que el componente lo limpie
 *       explícitamente (p. ej. al "finalizar y generar" propuesta).
 */
@Injectable({ providedIn: 'root' })
export class PropuestaDraftService {
  // ─── State ─────────────────────────────────────────────────────────────────
  readonly draft = signal<PropuestaDraft>(crearDraftVacio());

  // ─── Derivados para el sidebar ─────────────────────────────────────────────
  readonly subtotal = computed(() => {
    const d = this.draft();
    return d.lineasPropuesta.reduce((acc, l) =>
      acc + l.cantidad * l.frecuencia * l.precioUnitario * (1 - l.descuentoPct / 100), 0);
  });

  readonly igv = computed(() => this.draft().igvDesagregado ? this.subtotal() * 0.18 : 0);

  readonly totalEstimado = computed(() => this.subtotal() + this.igv());

  readonly subtotalOpcionales = computed(() => {
    const d = this.draft();
    return d.lineasOpcionales.reduce((acc, l) =>
      acc + l.cantidad * l.frecuencia * l.precioUnitario * (1 - l.descuentoPct / 100), 0);
  });

  readonly totalCuotas = computed(() =>
    this.draft().cuotas.reduce((acc, c) => acc + c.porcentaje, 0));

  // ─── Carga ─────────────────────────────────────────────────────────────────
  cargarDesdeStorage(idOrNuevo: string): void {
    const key = STORAGE_PREFIX + idOrNuevo;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      try { this.draft.set(JSON.parse(raw) as PropuestaDraft); return; } catch { /* ignore */ }
    }
    this.draft.set(crearDraftVacio());
  }

  cargarDraft(nuevo: PropuestaDraft): void {
    this.draft.set({ ...nuevo, ultimaModificacion: new Date().toISOString() });
    this.persistir();
  }

  // ─── Mutaciones ────────────────────────────────────────────────────────────
  actualizar(parcial: Partial<PropuestaDraft>): void {
    this.draft.update(d => ({
      ...d,
      ...parcial,
      ultimaModificacion: new Date().toISOString(),
    }));
    this.persistir();
  }

  resetear(): void {
    this.draft.set(crearDraftVacio());
    this.persistir();
  }

  limpiarStorage(idOrNuevo: string): void {
    const key = STORAGE_PREFIX + idOrNuevo;
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  }

  // ─── Internal ──────────────────────────────────────────────────────────────
  private persistir(): void {
    if (typeof localStorage === 'undefined') return;
    const d = this.draft();
    const id = d.idPropuesta != null ? String(d.idPropuesta) : 'nueva';
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(d));
  }
}
