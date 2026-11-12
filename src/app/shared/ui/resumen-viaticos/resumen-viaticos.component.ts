import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';
import { KpiGridComponent } from '../kpi-grid/kpi-grid.component';
import {
  EstadoGastoVM, GastoVM, LineaVM, ResumenViaticosVM, TipoSaldoVM,
} from './resumen-viaticos.vm';

export type ModoResumenViaticos = 'asignacion' | 'en-curso' | 'cierre';
export type AccionRevisionGasto = 'aprobar' | 'observar' | 'rechazar';

/**
 * Componente compartido que resume una programación de viáticos en 3 modos:
 *
 *  - `asignacion`: previo al servicio. 3 KPIs + tabla de líneas por técnico y concepto.
 *  - `en-curso`:   durante el servicio. 5 KPIs + adelanto + gastos con revisión (Jefe).
 *  - `cierre`:     solo lectura. Tarjeta de cierre + 4 KPIs + gastos con estado final.
 *
 * Recibe un view-model común `ResumenViaticosVM`. Los callers aplican su mapper:
 *   - `viaticosProgramacionAVm(v)` para el modal de Programación (HU-45, modo `asignacion`)
 *   - `viaticosOsAVm(v)`           para Seguimiento (HU-52, `en-curso`) e Informe (HU-57, `cierre`)
 *
 * No carga datos ni abre modales: emite eventos y el padre decide.
 */
@Component({
  selector: 'app-resumen-viaticos',
  imports: [CommonModule, ButtonComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './resumen-viaticos.component.html',
  styleUrl: './resumen-viaticos.component.scss',
})
export class ResumenViaticosComponent {
  readonly vm             = input.required<ResumenViaticosVM>();
  readonly modo           = input.required<ModoResumenViaticos>();
  /** En `asignacion` y `en-curso`, muestra el footer con el botón "Gestionar viáticos". */
  readonly puedeGestionar = input<boolean>(false);

  readonly abrirGestion    = output<void>();
  readonly revisarGasto    = output<{ idGasto: number; accion: AccionRevisionGasto }>();
  readonly verComprobante  = output<{ idGasto: number; n: number }>();

  // ─── Derivados ────────────────────────────────────────────────────────

  readonly moneda  = computed(() => this.vm().moneda);
  readonly totales = computed(() => this.vm().totales);
  readonly lineas  = computed(() => this.vm().lineas);
  readonly gastos  = computed(() => this.vm().gastos);
  readonly cierre  = computed(() => this.vm().cierre);

  // ─── Helpers de UI ────────────────────────────────────────────────────

  chipDeposito(l: LineaVM): { clase: string; texto: string } {
    return l.estadoDeposito === 'depositado'
      ? { clase: 'chip chip--verde', texto: 'Depositado' }
      : { clase: 'chip chip--ambar', texto: 'Pendiente depósito' };
  }

  chipEstadoGasto(e: EstadoGastoVM): string {
    switch (e) {
      case 'aprobado':  return 'chip chip--verde';
      case 'observado': return 'chip chip--ambar';
      case 'rechazado': return 'chip chip--rojo';
      case 'pendiente': return 'chip chip--azul';
      default:           return 'chip chip--gris';
    }
  }

  etiquetaEstadoGasto(e: EstadoGastoVM): string {
    switch (e) {
      case 'aprobado':  return 'Aprobado';
      case 'observado': return 'Observado';
      case 'rechazado': return 'Rechazado';
      case 'pendiente': return 'Por revisar';
      default:           return e;
    }
  }

  chipSaldo(t: TipoSaldoVM): string {
    switch (t) {
      case 'reembolso':  return 'chip chip--azul';
      case 'devolucion': return 'chip chip--ambar';
      case 'cuadrado':   return 'chip chip--verde';
    }
  }

  etiquetaSaldo(t: TipoSaldoVM, saldo: number, moneda: string): string {
    const m = `${moneda} ${Math.abs(saldo).toFixed(2)}`;
    switch (t) {
      case 'reembolso':  return `Reembolso adicional al técnico · ${m}`;
      case 'devolucion': return `Devolución del técnico · ${m}`;
      case 'cuadrado':   return 'Cuadrado';
    }
  }

  // ─── Delegación de eventos ────────────────────────────────────────────

  onAbrirGestion(): void { this.abrirGestion.emit(); }
  onRevisar(g: GastoVM, accion: AccionRevisionGasto): void {
    this.revisarGasto.emit({ idGasto: g.idGasto, accion });
  }
  onVerComprobante(g: GastoVM, n: number): void {
    if (g.nFotos > 0) this.verComprobante.emit({ idGasto: g.idGasto, n });
  }

  // Array [1..n] para iterar las fotos en el template.
  fotos(g: GastoVM): number[] {
    const arr: number[] = [];
    for (let i = 1; i <= g.nFotos; i++) arr.push(i);
    return arr;
  }
}
