import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AutenticacionService } from '../../../core/services/autenticacion.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { NotificacionBandeja } from '../../../core/models/notificaciones.model';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  private readonly autenticacionSvc = inject(AutenticacionService);
  private readonly notifSvc         = inject(NotificacionesService);
  private readonly router           = inject(Router);

  readonly usuario           = this.autenticacionSvc.usuarioActual;
  readonly panelNotifAbierto = signal(false);
  readonly panelUserAbierto  = signal(false);

  /**
   * Las 5 notificaciones más recientes (leídas o no) — vienen del signal compartido
   * del service, que a su vez se alimenta de GET /resumen + eventos SignalR en tiempo real.
   */
  readonly top5 = computed<NotificacionBandeja[]>(() => this.notifSvc.estado().ultimas);

  /** Contador real de no leídas — refleja el signal compartido del servicio. */
  readonly noLeidas = computed(() => this.notifSvc.estado().noLeidas);

  /** Cuántas de las 5 visibles están aún sin leer — para el botón del footer. */
  readonly noLeidasVisibles = computed(() => this.top5().filter(n => !n.leida).length);

  /** Badge visual: limita a "99+" cuando hay más de 99. */
  readonly badgeTexto = computed(() => {
    const n = this.noLeidas();
    return n > 99 ? '99+' : String(n);
  });

  async ngOnInit(): Promise<void> {
    // Fetch inicial (si el realtime aún no corrió obtenerResumen). Luego el hub mantiene al día.
    try { await this.notifSvc.obtenerResumen(); } catch { /* silencioso */ }
  }

  // ─── Helpers de UI ───────────────────────────────────────────────────────

  tiempoRelativo(iso: string): string { return this.notifSvc.tiempoRelativo(iso); }

  // ─── Toggles ─────────────────────────────────────────────────────────────

  toggleNotif(): void {
    this.panelNotifAbierto.update(v => !v);
    if (this.panelUserAbierto()) this.panelUserAbierto.set(false);
  }

  toggleUser(): void {
    this.panelUserAbierto.update(v => !v);
    if (this.panelNotifAbierto()) this.panelNotifAbierto.set(false);
  }

  // ─── Acciones del popover ────────────────────────────────────────────────

  async marcarLasVisiblesLeidas(): Promise<void> {
    const ids = this.top5().filter(n => !n.leida).map(n => n.idNotificacion);
    if (ids.length === 0) return;
    try { await this.notifSvc.marcarVariasLeidas(ids); } catch { /* silencioso */ }
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
}
