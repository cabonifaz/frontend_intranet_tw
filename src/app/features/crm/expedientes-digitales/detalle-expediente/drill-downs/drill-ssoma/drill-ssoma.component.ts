import { Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabSsomaExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';

/**
 * Sub-componente del detalle de expediente: drill-down del tab SSOMA.
 * Extraído del componente padre para mantener el budget del .scss bajo control.
 */
@Component({
  selector: 'app-drill-ssoma',
  imports: [CommonModule, SeccionComponent],
  templateUrl: './drill-ssoma.component.html',
  styleUrl: './drill-ssoma.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillSsomaComponent {
  readonly drill = input.required<TabSsomaExpedienteDto>();
}
