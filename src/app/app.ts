import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AutenticacionService } from './core/services/autenticacion.service';
import { PermisosService } from './core/services/permisos.service';
import { NotificacionesRealtimeService } from './core/services/notificaciones-realtime.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly autenticacionSvc = inject(AutenticacionService);
  private readonly permisosSvc      = inject(PermisosService);
  private readonly notifRealtime    = inject(NotificacionesRealtimeService);

  constructor() {
    // Hub SignalR: se levanta/baja según el estado de sesión del usuario. Evita el ciclo
    // circular que habría si auth dependiera de realtime (realtime ya depende de auth).
    effect(() => {
      const u = this.autenticacionSvc.usuarioActual();
      if (u) void this.notifRealtime.iniciar();
      else   void this.notifRealtime.detener();
    });
  }

  async ngOnInit(): Promise<void> {
    // Si al refresh ya hay token, carga permisos del usuario para que
    // los *appPermiso en toda la app muestren/oculten correctamente.
    if (this.autenticacionSvc.estaAutenticado()) {
      await this.permisosSvc.cargar();
    }
  }
}
