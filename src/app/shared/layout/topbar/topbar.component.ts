import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { AutenticacionService } from '../../../core/services/autenticacion.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { Notificacion } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly autenticacionSvc = inject(AutenticacionService);
  private readonly dashboardSvc     = inject(DashboardService);

  readonly usuario         = this.autenticacionSvc.usuarioActual;
  readonly panelNotifAbierto = signal(false);
  readonly panelUserAbierto  = signal(false);
  readonly notificaciones    = signal<Notificacion[]>([]);

  readonly noLeidas = computed(
    () => this.notificaciones().filter(n => !n.leida).length
  );

  async ngOnInit(): Promise<void> {
    try {
      const notif = await this.dashboardSvc.obtenerNotificaciones();
      this.notificaciones.set(notif);
    } catch { /* silencioso — el topbar no debe bloquear la carga */ }
  }

  toggleNotif(): void {
    this.panelNotifAbierto.update(v => !v);
    if (this.panelUserAbierto()) this.panelUserAbierto.set(false);
  }

  toggleUser(): void {
    this.panelUserAbierto.update(v => !v);
    if (this.panelNotifAbierto()) this.panelNotifAbierto.set(false);
  }

  marcarLeidas(): void {
    this.notificaciones.update(lista => lista.map(n => ({ ...n, leida: true })));
  }

  cerrarSesion(): void {
    this.autenticacionSvc.cerrarSesion();
  }
}
