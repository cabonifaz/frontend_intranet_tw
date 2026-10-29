import { Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabEjecucionExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';

/** Sub-componente del detalle de expediente: drill-down del tab Ejecución. */
@Component({
  selector: 'app-drill-ejecucion',
  imports: [CommonModule, SeccionComponent],
  templateUrl: './drill-ejecucion.component.html',
  styleUrl: './drill-ejecucion.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillEjecucionComponent {
  readonly drill = input.required<TabEjecucionExpedienteDto>();
}
