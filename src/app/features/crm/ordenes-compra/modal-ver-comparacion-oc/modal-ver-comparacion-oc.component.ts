import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { ComparacionOrdenCompraDto } from '../../../../core/models/ordenes-compra.model';

type Tab = 'campos' | 'conceptos' | 'insights';
type FiltroSeveridad = 'todas' | 'discrepancias' | 'coincidentes';

/**
 * Modal de "Ver detalle completo de validación IA" — usado desde la ficha de registro OC.
 * A diferencia del modal-detalle-validacion-ia (que carga del back), este recibe la comparación
 * en vivo que ya tiene el componente padre (no requiere OC guardada).
 */
@Component({
  selector: 'app-modal-ver-comparacion-oc',
  imports: [CommonModule, ModalComponent, ButtonComponent, SeccionComponent, MonedaPipe],
  templateUrl: './modal-ver-comparacion-oc.component.html',
  styleUrl: './modal-ver-comparacion-oc.component.scss',
})
export class ModalVerComparacionOcComponent {
  readonly comparacion = input.required<ComparacionOrdenCompraDto>();
  readonly numeroOcTemp = input<string>('Nueva OC');
  readonly monedaSimbolo = input<string>('');
  readonly cerrar = output<void>();

  readonly tab = signal<Tab>('campos');
  readonly filtro = signal<FiltroSeveridad>('todas');
  readonly idPropuestaFiltro = signal<number | null>(null);
  readonly now = new Date();

  readonly resumen = computed(() => this.comparacion().resumen);
  readonly propuestas = computed(() => this.comparacion().propuestas);
  readonly todosCampos = computed(() => this.comparacion().campos);
  readonly evaluaciones = computed(() => this.comparacion().evaluacionesIa);

  readonly campos = computed(() => {
    const idP = this.idPropuestaFiltro();
    const base = idP ? this.todosCampos().filter(c => c.idPropuesta === idP) : this.todosCampos();
    const f = this.filtro();
    if (f === 'todas') return base;
    if (f === 'discrepancias') return base.filter(c => c.severidad !== 'ok');
    return base.filter(c => c.severidad === 'ok');
  });

  readonly conceptos = computed(() => {
    const idP = this.idPropuestaFiltro();
    const base = this.evaluaciones();
    const seleccion = idP ? base.filter(e => e.idPropuesta === idP) : base;
    return seleccion.flatMap(e => e.conceptos.map(c => ({ ...c, idPropuesta: e.idPropuesta })));
  });

  readonly insights = computed(() => {
    const idP = this.idPropuestaFiltro();
    const base = this.evaluaciones();
    const seleccion = idP ? base.filter(e => e.idPropuesta === idP) : base;
    return seleccion.flatMap(e => e.insights.map(i => ({ ...i, idPropuesta: e.idPropuesta })));
  });

  readonly conteoTodas = computed(() => this.todosCampos().length);
  readonly conteoDiscrepancias = computed(() => this.todosCampos().filter(c => c.severidad !== 'ok').length);
  readonly conteoCoincidentes = computed(() => this.todosCampos().filter(c => c.severidad === 'ok').length);

  onCerrar(): void { this.cerrar.emit(); }
  cambiarTab(t: Tab): void { this.tab.set(t); }

  claseSeveridad(sev: string): string {
    return ({ ok: 'sev--ok', advertencia: 'sev--adv', critico: 'sev--crit', sin_dato: 'sev--neutro' } as Record<string, string>)[sev] ?? 'sev--neutro';
  }

  iconoSeveridad(sev: string): string {
    switch (sev) {
      case 'ok':          return 'check_circle';
      case 'advertencia': return 'warning';
      case 'critico':     return 'error';
      default:            return 'help';
    }
  }

  labelSeveridad(sev: string): string {
    return ({ ok: 'Coincidencia', advertencia: 'Diferencia menor', critico: 'Observación crítica', sin_dato: 'Sin dato' } as Record<string, string>)[sev] ?? sev;
  }

  // ─── Helpers para desglose por concepto ──────────────────────────────────

  /** Mapea el estado de concepto a la misma clase de severidad que la tabla de comparación. */
  dotEstadoConcepto(estado: string): string {
    return ({
      coincide:         'sev--ok',
      monto_distinto:   'sev--adv',
      falta_en_oc:      'sev--crit',
      adicional_en_oc:  'sev--neutro',
    } as Record<string, string>)[estado] ?? 'sev--neutro';
  }

  iconoEstadoConcepto(estado: string): string {
    switch (estado) {
      case 'coincide':        return 'check_circle';
      case 'monto_distinto':  return 'warning';
      case 'falta_en_oc':     return 'error';
      case 'adicional_en_oc': return 'info';
      default:                return 'help';
    }
  }

  labelEstadoConcepto(estado: string): string {
    return ({
      coincide:         'Coincide',
      monto_distinto:   'Monto distinto',
      falta_en_oc:      'Falta en OC',
      adicional_en_oc:  'Adicional en OC',
    } as Record<string, string>)[estado] ?? estado;
  }

  diferenciaConcepto(montoOc: number | null | undefined, montoPropuesta: number | null | undefined): number | null {
    if (montoOc == null || montoPropuesta == null) return null;
    return montoOc - montoPropuesta;
  }

  formatearMonto(monto: number | null | undefined): string {
    if (monto == null) return '—';
    const s = this.monedaSimbolo();
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`.trim();
  }

  // ─── Dictamen (desde la primera evaluación IA) ───────────────────────────

  readonly dictamenPrimario = computed(() => {
    const ev = this.evaluaciones()[0];
    if (!ev?.dictamen) return null;
    return { texto: ev.dictamen, confianza: ev.confianza, motor: ev.motor };
  });
}
