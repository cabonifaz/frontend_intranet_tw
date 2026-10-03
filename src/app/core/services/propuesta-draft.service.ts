import { Injectable, computed, signal } from '@angular/core';
import { crearDraftVacio, PropuestaDraft, PasoId } from '../models/propuesta-detalle.model';

// Orden canónico de las secciones del wizard y su mapeo al flag en el draft.
const ORDEN_SECCIONES: { id: PasoId; flag: keyof PropuestaDraft['seccionesIncluidas'] }[] = [
  { id: 'configuracion',        flag: 'configuracion'        },
  { id: 'propuesta',            flag: 'propuesta'            },
  { id: 'opcionales',           flag: 'opcionales'           },
  { id: 'detalle',              flag: 'detalle'              },
  { id: 'recomendaciones',      flag: 'recomendaciones'      },
  { id: 'forma-pago',           flag: 'formaPago'            },
  { id: 'suministros-cliente',  flag: 'suministrosCliente'   },
  { id: 'condiciones',          flag: 'condicionesServicio'  },
  { id: 'listado-equipos',      flag: 'listadoEquipos'       },
];

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
  readonly subtotalBruto = computed(() => {
    const d = this.draft();
    return d.lineasPropuesta.reduce((acc, l) =>
      acc + l.cantidad * l.frecuencia * l.precioUnitario * (1 - l.descuentoPct / 100), 0);
  });

  // Descuento global de la propuesta: si DescuentoPct > 0 tiene prioridad,
  // si no se usa DescuentoMonto. Alineado con la regla del back.
  readonly descuentoGlobal = computed(() => {
    const d = this.draft();
    if ((d.descuentoPct ?? 0) > 0) return this.subtotalBruto() * (d.descuentoPct ?? 0) / 100;
    return d.descuentoMonto ?? 0;
  });

  readonly subtotal = computed(() => Math.max(0, this.subtotalBruto() - this.descuentoGlobal()));

  readonly igv = computed(() => this.draft().igvDesagregado ? this.subtotal() * 0.18 : 0);

  readonly totalEstimado = computed(() => this.subtotal() + this.igv());

  readonly subtotalOpcionalesBruto = computed(() => {
    const d = this.draft();
    return d.lineasOpcionales.reduce((acc, l) =>
      acc + l.cantidad * l.frecuencia * l.precioUnitario * (1 - l.descuentoPct / 100), 0);
  });

  readonly subtotalOpcionales = computed(() =>
    Math.max(0, this.subtotalOpcionalesBruto() - (this.draft().descuentoOpcionales ?? 0))
  );

  readonly totalCuotas = computed(() =>
    this.draft().cuotas.reduce((acc, c) => acc + c.porcentaje, 0));

  /**
   * Devuelve la posición (1-based) de una sección dentro del listado de
   * secciones activas en el draft. Si está desactivada o no existe, retorna 0.
   */
  numeroSecuencial(id: PasoId): number {
    const s = this.draft().seccionesIncluidas;
    const activas = ORDEN_SECCIONES.filter(o => s[o.flag]);
    const idx = activas.findIndex(o => o.id === id);
    return idx + 1;
  }

  // ─── Carga ─────────────────────────────────────────────────────────────────
  cargarDesdeStorage(idOrNuevo: string): void {
    const key = STORAGE_PREFIX + idOrNuevo;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) {
      try { this.draft.set(JSON.parse(raw) as PropuestaDraft); return; } catch { /* ignore */ }
    }
    this.draft.set(crearDraftVacio());
  }

  /**
   * Lee el borrador en localStorage sin aplicarlo al signal `draft`.
   * Útil para decidir si mostrar el modal "Restaurar borrador" antes de cargar.
   */
  peekBorrador(idOrNuevo: string): PropuestaDraft | null {
    const key = STORAGE_PREFIX + idOrNuevo;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return null;
    try { return JSON.parse(raw) as PropuestaDraft; }
    catch { return null; }
  }

  /** Devuelve true si el borrador existente trae cambios significativos del usuario. */
  tieneBorradorConCambios(idOrNuevo: string): boolean {
    const d = this.peekBorrador(idOrNuevo);
    if (!d) return false;
    return (
      d.lineasPropuesta.length > 0 ||
      d.lineasOpcionales.length > 0 ||
      d.bloquesDetalle.length > 0 ||
      d.bloquesRecomendaciones.length > 0 ||
      d.bloquesSuministrosCliente.length > 0 ||
      d.clausulasContrato.length > 0 ||
      d.equiposVinculados.length > 0 ||
      (d.referencia?.trim().length ?? 0) > 0 ||
      (d.notasGenerales?.trim().length ?? 0) > 0 ||
      !!d.requiereTercerizacion ||
      !!d.tipoPropuesta
    );
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
