import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-form-footer',
  imports: [],
  templateUrl: './form-footer.component.html',
  styleUrl: './form-footer.component.scss',
})
export class FormFooterComponent {
  readonly cancelarTexto = input<string>('Cancelar');
  readonly mostrarCancelar = input<boolean>(true);

  readonly cancelar = output<void>();

  onCancelar(): void { this.cancelar.emit(); }
}
