import { Component, EventEmitter, Output, ViewEncapsulation, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import {
  CabeceraExpedienteDto,
  TabPropuestasExpedienteDto,
} from '../../../../../../core/models/expedientes-digitales.model';
import { ExpedienteHelpersService } from '../../expediente-helpers.service';

/**
 * Sub-componente del detalle de expediente: renderiza el drill-down del tab "Propuesta".
 * Se extrajo del componente padre para bajar el peso del .scss (budget de Angular).
 *
 * Visualmente no cambia nada: el CSS específico del drill-propuesta vive aquí
 * (con ViewEncapsulation.None para que las clases helpers compartidas sigan matcheando).
 */
@Component({
  selector: 'app-drill-propuesta',
  imports: [CommonModule, ButtonComponent, SeccionComponent],
  templateUrl: './drill-propuesta.component.html',
  styleUrl: './drill-propuesta.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillPropuestaComponent {
  readonly drill    = input.required<TabPropuestasExpedienteDto>();
  readonly cabecera = input<CabeceraExpedienteDto | null | undefined>(null);

  @Output() readonly irAPropuesta           = new EventEmitter<number>();
  @Output() readonly irAOc                  = new EventEmitter<number>();
  @Output() readonly irAOs                  = new EventEmitter<number>();
  @Output() readonly verArchivo             = new EventEmitter<string>();
  @Output() readonly descargarArchivo       = new EventEmitter<{ clave: string; nombre?: string | null }>();
  @Output() readonly cambiarPropuestaMostrada = new EventEmitter<number>();

  protected readonly helpers = inject(ExpedienteHelpersService);
}
