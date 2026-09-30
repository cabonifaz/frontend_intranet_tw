import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filtros-bar',
  imports: [FormsModule],
  templateUrl: './filtros-bar.component.html',
  styleUrl: './filtros-bar.component.scss',
})
export class FiltrosBarComponent {
  readonly busqueda    = model<string>('');
  readonly placeholder = input<string>('Buscar...');
  readonly buscar      = output<void>();

  onBuscar(): void {
    this.buscar.emit();
  }
}
