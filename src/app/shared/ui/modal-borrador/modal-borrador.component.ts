import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-modal-borrador',
  imports: [DatePipe, ModalComponent],
  templateUrl: './modal-borrador.component.html',
  styleUrl: './modal-borrador.component.scss',
})
export class ModalBorradorComponent {
  readonly fechaGuardado = input.required<string>();

  readonly restaurar = output<void>();
  readonly descartar = output<void>();
}
