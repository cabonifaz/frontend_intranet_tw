import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import {
  EstadoFiltro, GrupoNotificaciones, ModuloCodigo, NotificacionBandeja,
  RangoFecha, TipoNotificacion,
} from '../../../core/models/notificaciones.model';
import { HeaderBandejaComponent } from '../../../shared/ui/header-bandeja/header-bandeja.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BreadcrumbItem } from '../../../shared/ui/breadcrumb/breadcrumb.component';
import { ToastService } from '../../../core/services/toast.service';

/**
 * HU-90 — Centro de Notificaciones (Módulo 16).
 * Patrón email: lista agrupada (40%) + detalle (60%).
 */
@Component({
  selector: 'app-centro-notificaciones',
  imports: [CommonModule, FormsModule, HeaderBandejaComponent, ButtonComponent],
  templateUrl: './centro-notificaciones.component.html',
  styleUrl: './centro-notificaciones.component.scss',
})
export class CentroNotificacionesComponent implements OnInit {
  private readonly svc    = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly toast  = inject(ToastService);

  readonly breadcrumb: BreadcrumbItem[] = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'Notificaciones' },
  ];

  // Filtros ────────────────────────────────────────────────────────────────
  readonly estado    = signal<EstadoFiltro>('no_leidas');
  readonly modulo    = signal<ModuloCodigo | 'todos'>('todos');
  readonly tipo      = signal<TipoNotificacion | 'todos'>('todos');
  readonly rango     = signal<RangoFecha>('hoy');
  readonly busqueda  = signal('');
  readonly cargando  = signal(false);

  // Data ───────────────────────────────────────────────────────────────────
  readonly items     = signal<NotificacionBandeja[]>([]);
  readonly noLeidas  = signal(0);
  readonly seleccion = signal<NotificacionBandeja | null>(null);

  readonly grupos = computed<GrupoNotificaciones[]>(() => this.svc.agrupar(this.items()));

  readonly moduloOpciones: Array<{ v: ModuloCodigo | 'todos'; l: string }> = [
    { v: 'todos',            l: 'Todos' },
    { v: 'propuestas',       l: 'Propuestas' },
    { v: 'vb',               l: 'Visto Bueno' },
    { v: 'oc',               l: 'Órdenes de Compra' },
    { v: 'os',               l: 'Órdenes de Servicio' },
    { v: 'seguimiento',      l: 'Seguimiento' },
    { v: 'programacion',     l: 'Programación' },
    { v: 'control_campo',    l: 'Control de Campo' },
    { v: 'ssoma',            l: 'SSOMA' },
    { v: 'revision_tecnica', l: 'Revisión Técnica' },
    { v: 'expedientes',      l: 'Expedientes' },
    { v: 'sistema',          l: 'Sistema' },
  ];

  readonly tipoOpciones: Array<{ v: TipoNotificacion | 'todos'; l: string }> = [
    { v: 'todos',                l: 'Todos' },
    { v: 'aprobacion_pendiente', l: 'Aprobación pendiente' },
    { v: 'alerta_operativa',     l: 'Alerta operativa' },
    { v: 'cambio_estado',        l: 'Cambio de estado' },
    { v: 'recordatorio',         l: 'Recordatorio' },
    { v: 'ssoma',                l: 'SSOMA' },
    { v: 'sistema',              l: 'Sistema' },
  ];

  async ngOnInit(): Promise<void> {
    // Si viene con ?id=X (click desde el popover del bell), relajamos los filtros
    // iniciales para asegurarnos de que la notif esté en la lista y la seleccionamos.
    const idSeleccion = Number(this.route.snapshot.queryParamMap.get('id') ?? 0);
    if (idSeleccion > 0) {
      this.estado.set('todas');
      this.rango.set('todas');
    }
    await this.cargar();
    if (idSeleccion > 0) {
      const n = this.items().find(i => i.idNotificacion === idSeleccion);
      if (n) await this.abrir(n);
    }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await this.svc.obtenerBandeja({
        estado:   this.estado(),
        modulo:   this.modulo() === 'todos' ? null : [this.modulo() as ModuloCodigo],
        tipo:     this.tipo()   === 'todos' ? null : [this.tipo()   as TipoNotificacion],
        rango:    this.rango(),
        busqueda: this.busqueda() || null,
      });
      this.items.set(r.items);
      this.noLeidas.set(r.noLeidas);
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Acciones ────────────────────────────────────────────────────────────

  async abrir(n: NotificacionBandeja): Promise<void> {
    this.seleccion.set(n);
    if (!n.leida) {
      const nl = await this.svc.marcarLeida(n.idNotificacion);
      this.noLeidas.set(nl);
      this.items.update(list => list.map(i => i.idNotificacion === n.idNotificacion ? { ...i, leida: true } : i));
      this.seleccion.update(s => s ? { ...s, leida: true } : s);
    }
  }

  async marcarTodasLeidas(): Promise<void> {
    await this.svc.marcarTodasLeidas();
    this.toast.exito('Todas las notificaciones fueron marcadas como leídas.');
    await this.cargar();
  }

  async archivar(n: NotificacionBandeja): Promise<void> {
    const nl = await this.svc.archivar(n.idNotificacion);
    this.noLeidas.set(nl);
    this.toast.exito('Notificación archivada.');
    this.items.update(list => list.filter(i => i.idNotificacion !== n.idNotificacion));
    this.seleccion.set(this.items()[0] ?? null);
  }

  irAlOrigen(n: NotificacionBandeja): void {
    const d = this.svc.resolverDestino(n);
    if (!d) {
      this.toast.error('Esta notificación no tiene un elemento origen navegable.');
      return;
    }
    this.router.navigate(d.rutaDestino, { queryParams: d.queryParams });
  }

  limpiarFiltros(): void {
    this.estado.set('no_leidas');
    this.modulo.set('todos');
    this.tipo.set('todos');
    this.rango.set('hoy');
    this.busqueda.set('');
    void this.cargar();
  }

  onBuscar(): void { void this.cargar(); }

  onCambioFiltro(): void { void this.cargar(); }

  // ─── Helpers visual ──────────────────────────────────────────────────────

  iconoPorModulo(c: ModuloCodigo): string {
    switch (c) {
      case 'propuestas':       return 'description';
      case 'vb':               return 'verified';
      case 'oc':               return 'shopping_cart';
      case 'os':               return 'engineering';
      case 'seguimiento':      return 'track_changes';
      case 'programacion':     return 'event';
      case 'control_campo':    return 'location_on';
      case 'ssoma':            return 'health_and_safety';
      case 'revision_tecnica': return 'fact_check';
      case 'expedientes':      return 'folder';
      default:                 return 'info';
    }
  }

  chipTipo(t: TipoNotificacion): string {
    switch (t) {
      case 'alerta_operativa':     return 'chip chip--rojo';
      case 'aprobacion_pendiente': return 'chip chip--ambar';
      case 'cambio_estado':        return 'chip chip--azul';
      case 'ssoma':                return 'chip chip--ambar';
      case 'recordatorio':         return 'chip chip--gris';
      default:                     return 'chip chip--gris';
    }
  }

  chipModulo(_: ModuloCodigo): string {
    return 'chip chip--violeta';
  }
}
