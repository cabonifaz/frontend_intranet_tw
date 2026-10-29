import { Component, EventEmitter, Output, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabOrdenesCompraExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';
import { ExpedienteHelpersService } from '../../expediente-helpers.service';

/** Sub-componente del detalle de expediente: drill-down del tab Orden de Compra. */
@Component({
  selector: 'app-drill-orden-compra',
  imports: [CommonModule, ButtonComponent, SeccionComponent],
  templateUrl: './drill-orden-compra.component.html',
  styleUrl: './drill-orden-compra.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillOrdenCompraComponent {
  readonly drill = input.required<TabOrdenesCompraExpedienteDto>();

  @Output() readonly irALaOc           = new EventEmitter<number | null | undefined>();
  @Output() readonly irALaPropuesta    = new EventEmitter<number>();
  @Output() readonly verArchivo        = new EventEmitter<string>();
  @Output() readonly descargarArchivo  = new EventEmitter<{ clave: string; nombre?: string | null }>();
  @Output() readonly cambiarOcMostrada = new EventEmitter<number>();

  protected readonly helpers = inject(ExpedienteHelpersService);

  /** Nº de diferencias detectadas por IA. */
  protected readonly difsIa = computed(() =>
    (this.drill().campos ?? []).filter(c => c.severidad && c.severidad !== 'ok').length,
  );

  /** Resultado global de la validación IA. */
  protected readonly resultadoGlobalIa = computed<'ok' | 'advertencia' | 'critico'>(() => {
    const campos = this.drill().campos ?? [];
    if (campos.some(c => c.severidad === 'critico')) return 'critico';
    if (campos.some(c => c.severidad === 'advertencia')) return 'advertencia';
    return 'ok';
  });
}
