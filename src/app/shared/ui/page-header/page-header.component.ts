import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  imports: [],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  readonly icono     = input.required<string>();
  readonly titulo    = input.required<string>();
  readonly subtitulo = input<string>('');
}
