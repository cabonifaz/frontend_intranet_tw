import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
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
  imports: [CommonModule, ModalComponent, ButtonComponent, MonedaPipe],
  templateUrl: './modal-ver-comparacion-oc.component.html',
  styleUrl: './modal-ver-comparacion-oc.component.scss',
})
export class ModalVerComparacionOcComponent {
  readonly comparacion = input.required<ComparacionOrdenCompraDto>();
  readonly numeroOcTemp = input<string>('Nueva OC');
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
}
