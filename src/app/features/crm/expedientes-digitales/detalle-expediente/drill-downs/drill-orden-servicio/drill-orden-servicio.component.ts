import { Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabOrdenServicioExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';

/** Sub-componente del detalle de expediente: drill-down del tab Orden de Servicio. */
@Component({
  selector: 'app-drill-orden-servicio',
  imports: [CommonModule, SeccionComponent],
  templateUrl: './drill-orden-servicio.component.html',
  styleUrl: './drill-orden-servicio.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillOrdenServicioComponent {
  readonly drill = input.required<TabOrdenServicioExpedienteDto>();
}
