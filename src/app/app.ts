import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutenticacionService } from './core/services/autenticacion.service';
import { PermisosService } from './core/services/permisos.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly autenticacionSvc = inject(AutenticacionService);
  private readonly permisosSvc      = inject(PermisosService);

  async ngOnInit(): Promise<void> {
    // Si al refresh ya hay token, carga permisos del usuario para que
    // los *appPermiso en toda la app muestren/oculten correctamente.
    if (this.autenticacionSvc.estaAutenticado()) {
      await this.permisosSvc.cargar();
    }
  }
}
