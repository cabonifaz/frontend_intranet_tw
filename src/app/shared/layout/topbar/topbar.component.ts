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
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AutenticacionService } from '../../../core/services/autenticacion.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { NotificacionBandeja } from '../../../core/models/notificaciones.model';

const INTERVALO_POLLING_MS = 30_000;

@Component({
  selector: 'app-topbar',
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly autenticacionSvc = inject(AutenticacionService);
  private readonly notifSvc         = inject(NotificacionesService);
  private readonly router           = inject(Router);

  readonly usuario           = this.autenticacionSvc.usuarioActual;
  readonly panelNotifAbierto = signal(false);
  readonly panelUserAbierto  = signal(false);

  /** Las 5 notificaciones más recientes (leídas o no) que se muestran en el popover. */
  readonly top5 = signal<NotificacionBandeja[]>([]);

  /** Contador real de no leídas — refleja el signal compartido del servicio. */
  readonly noLeidas = computed(() => this.notifSvc.estado().noLeidas);

  /** Cuántas de las 5 visibles están aún sin leer — para el botón del footer. */
  readonly noLeidasVisibles = computed(() => this.top5().filter(n => !n.leida).length);

  /** Badge visual: limita a "99+" cuando hay más de 99. */
  readonly badgeTexto = computed(() => {
    const n = this.noLeidas();
    return n > 99 ? '99+' : String(n);
  });

  private pollingId?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    await this.refrescarPopover();
    this.iniciarPolling();
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  @HostListener('document:visibilitychange')
  onVisibilidadCambio(): void {
    if (document.visibilityState === 'visible') {
      void this.refrescarPopover();
      this.iniciarPolling();
    } else {
      this.detenerPolling();
    }
  }

  // ─── Toggles ─────────────────────────────────────────────────────────────

  toggleNotif(): void {
    this.panelNotifAbierto.update(v => !v);
    if (this.panelUserAbierto()) this.panelUserAbierto.set(false);
    if (this.panelNotifAbierto()) void this.refrescarPopover();
  }

  toggleUser(): void {
    this.panelUserAbierto.update(v => !v);
    if (this.panelNotifAbierto()) this.panelNotifAbierto.set(false);
  }

  // ─── Acciones del popover ────────────────────────────────────────────────

  async marcarLasVisiblesLeidas(): Promise<void> {
    const ids = this.top5().filter(n => !n.leida).map(n => n.idNotificacion);
    if (ids.length === 0) return;
    await this.notifSvc.marcarVariasLeidas(ids);
    await this.refrescarPopover();
  }

  abrirNotificacion(n: NotificacionBandeja): void {
    this.panelNotifAbierto.set(false);
    void this.router.navigate(['/notificaciones'], { queryParams: { id: n.idNotificacion } });
  }

  irACentroNotificaciones(): void {
    this.panelNotifAbierto.set(false);
    void this.router.navigate(['/notificaciones']);
  }

  // ─── Usuario ─────────────────────────────────────────────────────────────

  cerrarSesion(): void {
    this.autenticacionSvc.cerrarSesion();
  }

  // ─── Internas ────────────────────────────────────────────────────────────

  private async refrescarPopover(): Promise<void> {
    try {
      this.top5.set(await this.notifSvc.obtenerPopover());
    } catch { /* silencioso */ }
  }

  private iniciarPolling(): void {
    this.detenerPolling();
    this.pollingId = setInterval(() => void this.refrescarPopover(), INTERVALO_POLLING_MS);
  }

  private detenerPolling(): void {
    if (this.pollingId !== undefined) {
      clearInterval(this.pollingId);
      this.pollingId = undefined;
    }
  }
}
