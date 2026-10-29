import { Component, EventEmitter, Output, ViewEncapsulation, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabRqExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';
import { ExpedienteHelpersService } from '../../expediente-helpers.service';

/** Sub-componente del detalle de expediente: drill-down del tab Requerimiento. */
@Component({
  selector: 'app-drill-requerimiento',
  imports: [CommonModule, ButtonComponent, SeccionComponent],
  templateUrl: './drill-requerimiento.component.html',
  styleUrl: './drill-requerimiento.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillRequerimientoComponent {
  readonly drill = input.required<TabRqExpedienteDto>();

  @Output() readonly irAlRequerimiento = new EventEmitter<number | null | undefined>();
  @Output() readonly irALaPropuesta    = new EventEmitter<number>();
  @Output() readonly verArchivo        = new EventEmitter<string>();
  @Output() readonly descargarArchivo  = new EventEmitter<{ clave: string; nombre?: string | null }>();

  protected readonly helpers = inject(ExpedienteHelpersService);
}
