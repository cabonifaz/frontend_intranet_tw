import { Component, input } from '@angular/core';

@Component({
  selector: 'app-campo',
  imports: [],
  templateUrl: './campo.component.html',
  styleUrl: './campo.component.scss',
})
export class CampoComponent {
  readonly label   = input<string>('');
  readonly hint    = input<string>('');
  readonly error   = input<string>('');
  readonly ancho   = input<'auto' | 'full'>('full');
}
