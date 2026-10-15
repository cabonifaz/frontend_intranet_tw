import { Component, input, output } from '@angular/core';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';
import { ButtonComponent } from '../button/button.component';
import { SiPermisoDirective } from '../../../core/directives/si-permiso.directive';

/**
 * Encabezado estándar de bandejas: breadcrumb + título + subtítulo + CTA opcional
 * con permiso.
 *
 * Para botones secundarios o contenido custom en la zona derecha, usar el
 * content projection con `[accionesExtra]`.
 *
 * @example
 *   <app-header-bandeja
 *     [breadcrumb]="breadcrumb"
 *     titulo="CRM / Órdenes de Compra"
 *     subtitulo="Control de OC recibidas, cobertura económica y habilitación del flujo operativo"
 *     textoBoton="+ Nueva Orden de Compra"
 *     permisoBoton="oc_registrar"
 *     (clicBoton)="nuevaOc()" />
 */
@Component({
  selector: 'app-header-bandeja',
  imports: [BreadcrumbComponent, ButtonComponent, SiPermisoDirective],
  templateUrl: './header-bandeja.component.html',
  styleUrl: './header-bandeja.component.scss',
})
export class HeaderBandejaComponent {
  readonly breadcrumb = input<BreadcrumbItem[]>([]);
  readonly titulo     = input.required<string>();
  readonly subtitulo  = input<string>('');

  // Botón principal (opcional)
  readonly textoBoton    = input<string>('');
  readonly iconoBoton    = input<string>('add');
  readonly permisoBoton  = input<string>('');
  readonly clicBoton     = output<void>();

  onClic(): void { this.clicBoton.emit(); }
}
