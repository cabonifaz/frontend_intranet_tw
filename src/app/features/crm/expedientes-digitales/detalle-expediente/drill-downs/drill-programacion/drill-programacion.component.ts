import { Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabProgramacionExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';

/**
 * Sub-componente del detalle de expediente: drill-down del tab Programación.
 */
@Component({
  selector: 'app-drill-programacion',
  imports: [CommonModule, SeccionComponent],
  templateUrl: './drill-programacion.component.html',
  styleUrl: './drill-programacion.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillProgramacionComponent {
  readonly drill = input.required<TabProgramacionExpedienteDto>();
}
