import { Component, input } from '@angular/core';

@Component({
  selector: 'app-seccion-placeholder',
  template: `
    <div class="placeholder">
      <div class="placeholder__icono">
        <span class="material-symbols-outlined">construction</span>
      </div>
      <h2 class="placeholder__titulo">{{ numero() }}. {{ titulo() }}</h2>
      <p class="placeholder__texto">
        Esta sección se implementará en los próximos iterables del sprint.
      </p>
      <span class="placeholder__pill">En construcción</span>
    </div>
  `,
  styles: `
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px 24px;
      text-align: center;
      color: #64748B;
      min-height: 300px;

      &__icono {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        background: #EFF6FF;
        color: #2563EB;
        border: 1px solid #BFDBFE;
        display: flex;
        align-items: center;
        justify-content: center;

        .material-symbols-outlined { font-size: 32px; }
      }

      &__titulo {
        font-size: 20px;
        font-weight: 700;
        color: #0F172A;
        margin: 0;
      }

      &__texto {
        font-size: 13px;
        color: #94A3B8;
        margin: 0;
        max-width: 420px;
      }

      &__pill {
        display: inline-block;
        padding: 4px 12px;
        background: #FFFBEB;
        color: #B45309;
        border: 1px solid #FDE68A;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
      }
    }
  `,
})
export class SeccionPlaceholderComponent {
  readonly numero = input.required<number>();
  readonly titulo = input.required<string>();
}
