import { Component, EventEmitter, Output, ViewEncapsulation, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../../../shared/ui/seccion/seccion.component';
import { TabSeguimientoExpedienteDto } from '../../../../../../core/models/expedientes-digitales.model';
import { ExpedienteHelpersService } from '../../expediente-helpers.service';

/** Sub-componente del detalle de expediente: drill-down del tab Seguimiento. */
@Component({
  selector: 'app-drill-seguimiento',
  imports: [CommonModule, ButtonComponent, SeccionComponent],
  templateUrl: './drill-seguimiento.component.html',
  styleUrl: './drill-seguimiento.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrillSeguimientoComponent {
  readonly drill = input.required<TabSeguimientoExpedienteDto>();

  @Output() readonly irAlSeguimiento              = new EventEmitter<void>();
  @Output() readonly verArchivo                   = new EventEmitter<string>();
  @Output() readonly descargarArchivo             = new EventEmitter<{ clave: string; nombre?: string | null }>();
  @Output() readonly cambiarPropuestaSeguimiento  = new EventEmitter<string>();

  protected readonly helpers = inject(ExpedienteHelpersService);
}
