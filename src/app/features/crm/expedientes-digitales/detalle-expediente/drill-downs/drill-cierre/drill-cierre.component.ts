import { Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabCierreExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';

/** Sub-componente del detalle de expediente: drill-down del tab Cierre. */
@Component({
  selector: 'app-drill-cierre',
  imports: [CommonModule, SeccionComponent],
  templateUrl: './drill-cierre.component.html',
  styleUrl: './drill-cierre.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillCierreComponent {
  readonly drill = input.required<TabCierreExpedienteDto>();
}
