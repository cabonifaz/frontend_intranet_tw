/**
 * Mapeos semánticos de estado → variant visual.
 *
 * Centraliza la relación entre valores de dominio (estado de RQ, propuesta,
 * prioridad, SLA) y el "variant" que consumen los componentes shared
 * (`app-badge`, `app-button`).
 *
 * Convención semántica:
 *   info     → algo nuevo, informativo (azul)
 *   warning  → requiere atención (ámbar)
 *   success  → completado positivamente (verde)
 *   danger   → crítico, vencido, anulado (rojo)
 *   neutral  → inactivo, cerrado, archivado (gris)
 */

export type VariantSemantico = 'info' | 'warning' | 'success' | 'danger' | 'neutral';

// ─── Estado de Requerimiento ─────────────────────────────────────────────────
export function variantEstadoRq(estado: string): VariantSemantico {
  const mapa: Record<string, VariantSemantico> = {
    nuevo:         'info',
    en_proceso:    'warning',
    con_propuesta: 'success',
    cerrado:       'neutral',
    anulado:       'danger',
  };
  return mapa[estado?.toLowerCase?.() ?? ''] ?? 'neutral';
}

// ─── Estado de Propuesta ─────────────────────────────────────────────────────
export function variantEstadoPropuesta(estado: string): VariantSemantico {
  const mapa: Record<string, VariantSemantico> = {
    borrador:       'neutral',
    pendiente:      'info',
    por_vb:         'warning',
    por_enviar:     'warning',
    en_seguimiento: 'info',
    aceptada:       'success',
    rechazada:      'danger',
    por_consolidar: 'warning',
  };
  return mapa[estado?.toLowerCase?.() ?? ''] ?? 'neutral';
}

// ─── Prioridad ───────────────────────────────────────────────────────────────
export function variantPrioridad(idPrioridad: number | string): VariantSemantico {
  const id = typeof idPrioridad === 'string' ? Number(idPrioridad) : idPrioridad;
  const mapa: Record<number, VariantSemantico> = {
    1: 'danger',   // Alta
    2: 'warning',  // Media
    3: 'info',     // Baja
  };
  return mapa[id] ?? 'neutral';
}

// ─── SLA (basado en días restantes) ─────────────────────────────────────────
export function variantSla(diasRestantes: number): VariantSemantico {
  if (diasRestantes < 0)  return 'danger';   // vencido
  if (diasRestantes <= 3) return 'warning';  // próximo a vencer
  return 'success';                          // en tiempo
}

// ─── Tipo de Propuesta ───────────────────────────────────────────────────────
export function variantTipoPropuesta(tipo: string): VariantSemantico {
  const mapa: Record<string, VariantSemantico> = {
    servicio: 'success',
    mixta:    'warning',
    proyecto: 'info',
  };
  return mapa[tipo?.toLowerCase?.() ?? ''] ?? 'neutral';
}
