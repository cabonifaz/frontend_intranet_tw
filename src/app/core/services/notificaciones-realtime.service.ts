import { Injectable, inject, signal } from '@angular/core';
import {
  HubConnection, HubConnectionBuilder, HubConnectionState, HttpTransportType, LogLevel,
} from '@microsoft/signalr';
import { Subject, Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AutenticacionService } from './autenticacion.service';
import { NotificacionesService } from './notificaciones.service';
import {
  EnvolventeEventoNotif, EventoNotifActualizada, EventoNotifCreada,
  EventoRefrescoOc, EventoRefrescoOs, EventoRefrescoPrecotizacion, EventoRefrescoVb,
} from '../models/notificaciones.model';

/**
 * HU-90 — Tiempo real de notificaciones vía SignalR.
 *
 * Hub: `/hubs/notificaciones` — sólo WebSockets, autenticado con el mismo JWT.
 *
 * Eventos consumidos:
 *  - `notificacion.creada`      → prepende al estado + actualiza badge
 *  - `notificacion.actualizada` → sincroniza badge entre pestañas del mismo usuario
 *  - Señales de refresco:         oc.registrada, oc.anulada, vb.asignado, vb.resuelto,
 *                                  os.emitida, os.estado_cambiado, precotizacion.recibida
 *    El hub NO trae datos de negocio; sólo avisa que hay que refrescar. Aplicamos debounce
 *    de 500 ms y emitimos a quien esté suscrito.
 *
 * Al conectar y en cada `onreconnected`, llamamos a `/resumen` para ponernos al día
 * (los eventos perdidos mientras estuvimos desconectados no se reenvían).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesRealtimeService {
  private readonly auth     = inject(AutenticacionService);
  private readonly notifSvc = inject(NotificacionesService);

  private hub?: HubConnection;
  private readonly refrescoSubject = new Subject<SenalRefresco>();
  private refrescoSub?: Subscription;

  /** Estado de la conexión — útil para debug en consola. */
  readonly estadoConexion = signal<'desconectado' | 'conectando' | 'conectado' | 'reconectando'>('desconectado');

  /**
   * Subject público para que los componentes de módulos escuchen señales de refresco
   * (ej. lista de OCs se suscribe y refetch cuando llega `oc.registrada`).
   * Debounced a 500 ms para absorber ráfagas.
   */
  readonly senalesRefresco$ = this.refrescoSubject.asObservable().pipe(auditTime(500));

  async iniciar(): Promise<void> {
    if (this.hub && this.hub.state !== HubConnectionState.Disconnected) return;

    const token = this.auth.obtenerToken();
    if (!token) return;

    this.hub = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notificaciones`, {
        accessTokenFactory: () => this.auth.obtenerToken() ?? '',
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.registrarHandlers(this.hub);

    try {
      this.estadoConexion.set('conectando');
      await this.hub.start();
      this.estadoConexion.set('conectado');
      // Sync inicial: los eventos perdidos no se reenvían, así que pedimos el resumen.
      await this.notifSvc.obtenerResumen().catch(() => { /* silencioso */ });
    } catch {
      this.estadoConexion.set('desconectado');
    }
  }

  async detener(): Promise<void> {
    this.refrescoSub?.unsubscribe();
    this.refrescoSub = undefined;
    if (!this.hub) return;
    try { await this.hub.stop(); } catch { /* ya cerrado */ }
    this.hub = undefined;
    this.estadoConexion.set('desconectado');
  }

  /** Abre el detalle de una ficha → se suscribe a eventos de esa entidad concreta. */
  async suscribirEntidad(tipo: 'oc' | 'os' | 'propuesta', id: number): Promise<boolean> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) return false;
    try {
      return await this.hub.invoke<boolean>('SuscribirEntidad', tipo, id);
    } catch {
      return false;
    }
  }

  async desuscribirEntidad(tipo: 'oc' | 'os' | 'propuesta', id: number): Promise<void> {
    if (!this.hub || this.hub.state !== HubConnectionState.Connected) return;
    try { await this.hub.invoke('DesuscribirEntidad', tipo, id); } catch { /* ignore */ }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────

  private registrarHandlers(hub: HubConnection): void {

    hub.onreconnecting(() => this.estadoConexion.set('reconectando'));
    hub.onreconnected(async () => {
      this.estadoConexion.set('conectado');
      await this.notifSvc.obtenerResumen().catch(() => {});
    });
    hub.onclose(() => this.estadoConexion.set('desconectado'));

    // Notificaciones ─────────────────────────────────────────────────────
    hub.on('notificacion.creada', (e: EnvolventeEventoNotif<EventoNotifCreada>) => {
      this.notifSvc.aplicarCreada(e.datos.notificacion, e.datos.noLeidas);
    });

    hub.on('notificacion.actualizada', (e: EnvolventeEventoNotif<EventoNotifActualizada>) => {
      this.notifSvc.aplicarSincronizacion(e.datos.noLeidas);
    });

    // Señales de refresco ────────────────────────────────────────────────
    // Sólo emitimos por el Subject — a quien le interese se suscribe.

    hub.on('oc.registrada', (e: EnvolventeEventoNotif<EventoRefrescoOc>) =>
      this.refrescoSubject.next({ tipo: 'oc.registrada', datos: e.datos }));
    hub.on('oc.anulada', (e: EnvolventeEventoNotif<EventoRefrescoOc>) =>
      this.refrescoSubject.next({ tipo: 'oc.anulada', datos: e.datos }));

    hub.on('vb.asignado', (e: EnvolventeEventoNotif<EventoRefrescoVb>) =>
      this.refrescoSubject.next({ tipo: 'vb.asignado', datos: e.datos }));
    hub.on('vb.resuelto', (e: EnvolventeEventoNotif<EventoRefrescoVb>) =>
      this.refrescoSubject.next({ tipo: 'vb.resuelto', datos: e.datos }));

    hub.on('os.emitida', (e: EnvolventeEventoNotif<EventoRefrescoOs>) =>
      this.refrescoSubject.next({ tipo: 'os.emitida', datos: e.datos }));
    hub.on('os.estado_cambiado', (e: EnvolventeEventoNotif<EventoRefrescoOs>) =>
      this.refrescoSubject.next({ tipo: 'os.estado_cambiado', datos: e.datos }));

    hub.on('precotizacion.recibida', (e: EnvolventeEventoNotif<EventoRefrescoPrecotizacion>) =>
      this.refrescoSubject.next({ tipo: 'precotizacion.recibida', datos: e.datos }));
  }
}

export type SenalRefresco =
  | { tipo: 'oc.registrada' | 'oc.anulada';              datos: EventoRefrescoOc }
  | { tipo: 'vb.asignado' | 'vb.resuelto';               datos: EventoRefrescoVb }
  | { tipo: 'os.emitida' | 'os.estado_cambiado';         datos: EventoRefrescoOs }
  | { tipo: 'precotizacion.recibida';                    datos: EventoRefrescoPrecotizacion };
