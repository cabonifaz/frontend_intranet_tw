import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { AutenticacionService } from '../../../core/services/autenticacion.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { Notificacion } from '../../../core/models/dashboard.model';

const INTERVALO_POLLING_MS = 30_000;

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit, OnDestroy {
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

  private pollingId?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    await this.cargarNotificaciones();
    this.iniciarPolling();
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  @HostListener('document:visibilitychange')
  onVisibilidadCambio(): void {
    if (document.visibilityState === 'visible') {
      void this.cargarNotificaciones();
      this.iniciarPolling();
    } else {
      this.detenerPolling();
    }
  }

  toggleNotif(): void {
    this.panelNotifAbierto.update(v => !v);
    if (this.panelUserAbierto()) this.panelUserAbierto.set(false);
    if (this.panelNotifAbierto()) void this.cargarNotificaciones();
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

  private async cargarNotificaciones(): Promise<void> {
    try {
      const notif = await this.dashboardSvc.obtenerNotificaciones();
      this.notificaciones.set(notif);
    } catch { /* silencioso — el topbar no debe bloquear la carga */ }
  }

  private iniciarPolling(): void {
    this.detenerPolling();
    this.pollingId = setInterval(() => void this.cargarNotificaciones(), INTERVALO_POLLING_MS);
  }

  private detenerPolling(): void {
    if (this.pollingId !== undefined) {
      clearInterval(this.pollingId);
      this.pollingId = undefined;
    }
  }
}
