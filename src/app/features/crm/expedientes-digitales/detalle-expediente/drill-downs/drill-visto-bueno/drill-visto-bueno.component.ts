import { Component, EventEmitter, Output, ViewEncapsulation, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabVistoBuenoExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';
import { ExpedienteHelpersService } from '../../expediente-helpers.service';

/**
 * Sub-componente del detalle de expediente: renderiza el drill-down del tab "Visto Bueno".
 * Se extrajo del componente padre para bajar el peso del .scss (budget de Angular).
 *
 * Reutiliza las clases helpers del padre (chip-estado, info-grid, card-aprobador,
 * descripcion-bloque, tl, responsable-mini, prop-pills-bar) porque el padre está en
 * ViewEncapsulation.None y esas clases son globales.
 */
@Component({
  selector: 'app-drill-visto-bueno',
  imports: [CommonModule, ButtonComponent, SeccionComponent],
  templateUrl: './drill-visto-bueno.component.html',
  styleUrl: './drill-visto-bueno.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillVistoBuenoComponent {
  readonly drill = input.required<TabVistoBuenoExpedienteDto>();

  @Output() readonly irAVistoBueno        = new EventEmitter<number | null | undefined>();
  @Output() readonly cambiarPropuestaVb   = new EventEmitter<string>();

  protected readonly helpers = inject(ExpedienteHelpersService);
}
