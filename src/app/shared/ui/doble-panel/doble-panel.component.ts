import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Layout genérico "catálogo ↔ selección" usado por 6 de las 9 secciones del
 * wizard de propuestas (Propuesta, Opcionales, Detalle, Recomendaciones,
 * Suministros Cliente, Condiciones, Listado Equipos).
 *
 * Expone:
 *  - 3 slots de contenido (header, panel-izq, panel-der) via ng-content.
 *  - Buscador integrado opcional (buscable=true + evento buscar).
 *  - Botones centrales (añadir →, ← quitar) con eventos agregar/quitar.
 *  - Footer con totales libre via ng-content select="[footer]".
 */
@Component({
  selector: 'app-doble-panel',
  imports: [FormsModule],
  templateUrl: './doble-panel.component.html',
  styleUrl: './doble-panel.component.scss',
})
export class DoblePanelComponent {
  readonly tituloCatalogo    = input<string>('Catálogo');
  readonly tituloSeleccion   = input<string>('Selección');
  readonly countCatalogo     = input<string>('');
  readonly countSeleccion    = input<string>('');
  readonly buscable          = input<boolean>(true);
  readonly placeholderBuscar = input<string>('Buscar...');
  readonly textoFlechaDer    = input<string>('Añadir');
  readonly textoFlechaIzq    = input<string>('Quitar');

  busqueda = '';

  readonly buscar  = output<string>();
  readonly agregar = output<void>();
  readonly quitar  = output<void>();

  onBuscar(): void { this.buscar.emit(this.busqueda); }
}
