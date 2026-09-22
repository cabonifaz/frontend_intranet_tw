import { Component, inject } from '@angular/core';
import { AutenticacionService } from '../../core/services/autenticacion.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="placeholder">
      <h1>Dashboard</h1>
      <p>Bienvenido, <strong>{{ svc.usuarioActual()?.nombre }}</strong></p>
      <button (click)="svc.cerrarSesion()">Cerrar sesión</button>
    </div>
  `,
  styles: [`
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 1rem;
      font-family: var(--tw-fuente, sans-serif);
    }
    button {
      padding: 0.5rem 1.5rem;
      background: var(--tw-primario, #1B2A48);
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      font-size: 0.875rem;
    }
  `],
})
export class DashboardComponent {
  readonly svc = inject(AutenticacionService);
}
