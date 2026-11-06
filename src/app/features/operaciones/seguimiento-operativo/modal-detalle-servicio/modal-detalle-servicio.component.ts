import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguimientoOperativoService } from '../../../../core/services/seguimiento-operativo.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  DetalleServicioSeguimiento, EstadoEquipoServicio, EstadoTecnicoCampo,
  ModoRegistro, TipoEventoTimeline,
} from '../../../../core/models/seguimiento-operativo.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';

type TabDetalle =
  | 'resumen' | 'equipos' | 'mapa' | 'timeline'
  | 'demoras' | 'registrar' | 'cierre';

/**
 * HU-52 — Modal "Detalle del Servicio en Ruta" (Módulo 11 Control de Campo).
 * Modal grande (xl) con 7 tabs (6 fijos + Cierre condicional cuando esFinalizado).
 * Auto-refresh cada 15s. Footer sticky con botón "Llamar al técnico".
 */
@Component({
  selector: 'app-modal-detalle-servicio',
  imports: [
    CommonModule, FormsModule, ModalComponent, ButtonComponent,
    KpiGridComponent, KpiCardComponent, TablaPaginadaComponent,
  ],
  templateUrl: './modal-detalle-servicio.component.html',
  styleUrl: './modal-detalle-servicio.component.scss',
})
export class ModalDetalleServicioComponent implements OnInit, OnDestroy {
  private readonly svc   = inject(SeguimientoOperativoService);
  private readonly toast = inject(ToastService);

  readonly idServicio = input.required<number>();

  readonly cerrar     = output<void>();
  readonly actualizado = output<void>();

  readonly tab      = signal<TabDetalle>('resumen');
  readonly cargando = signal(true);
  readonly detalle  = signal<DetalleServicioSeguimiento | null>(null);
  /** Set de idEquipo expandidos en el tab Avance por Equipos. El equipo activo
   *  (en ejecución) se agrega automáticamente al cargar el detalle. */
  readonly equiposExpandidos = signal<Set<number>>(new Set());

  // ─── Timeline del Día (tab 4) ─────────────────────────────────────────
  readonly tiposFiltroTimeline: readonly TipoEventoTimeline[] =
    ['hito_tecnico', 'alerta_sistema', 'demora_incidente', 'registro_asistente'];

  readonly filtrosTimeline = signal<Record<TipoEventoTimeline, boolean>>({
    hito_tecnico:        true,
    alerta_sistema:      true,
    demora_incidente:    true,
    registro_asistente:  true,
  });
  readonly ordenTimeline = signal<'reciente' | 'antiguo'>('reciente');

  readonly conteoTimelinePorTipo = computed(() => {
    const eventos = this.detalle()?.timeline ?? [];
    return {
      hito_tecnico:       eventos.filter(e => e.tipo === 'hito_tecnico').length,
      alerta_sistema:     eventos.filter(e => e.tipo === 'alerta_sistema').length,
      demora_incidente:   eventos.filter(e => e.tipo === 'demora_incidente').length,
      registro_asistente: eventos.filter(e => e.tipo === 'registro_asistente').length,
    };
  });

  readonly eventosTimelineFiltrados = computed(() => {
    const todos = this.detalle()?.timeline ?? [];
    const filtros = this.filtrosTimeline();
    const list = todos.filter(e => filtros[e.tipo]);
    const orden = this.ordenTimeline();
    return [...list].sort((a, b) => {
      const cmp = a.hora.localeCompare(b.hora);
      return orden === 'reciente' ? -cmp : cmp;
    });
  });

  private intervalRefresh: ReturnType<typeof setInterval> | null = null;

  readonly cabecera = computed(() => this.detalle()?.cabecera);

  readonly tabsVisibles = computed<TabDetalle[]>(() => {
    const base: TabDetalle[] = ['resumen', 'equipos', 'mapa', 'timeline', 'demoras', 'registrar'];
    return this.cabecera()?.esFinalizado ? [...base, 'cierre'] : base;
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
    // HU-52: auto-refresh cada 15 segundos
    this.intervalRefresh = setInterval(() => this.cargar(true), 15_000);
  }

  ngOnDestroy(): void {
    if (this.intervalRefresh) clearInterval(this.intervalRefresh);
  }

  async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    try {
      const d = await this.svc.obtenerDetalleServicio(this.idServicio());
      this.detalle.set(d);
      // Primera carga: auto-expandir el equipo activo (en ejecución)
      if (!silencioso) {
        const activo = d.equipos.find(eq => eq.activo);
        if (activo) this.equiposExpandidos.set(new Set([activo.idEquipo]));
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el detalle.');
      if (!silencioso) this.cerrar.emit();
    } finally {
      this.cargando.set(false);
    }
  }

  toggleEquipo(idEquipo: number): void {
    const set = new Set(this.equiposExpandidos());
    if (set.has(idEquipo)) set.delete(idEquipo);
    else set.add(idEquipo);
    this.equiposExpandidos.set(set);
  }

  estaExpandido(idEquipo: number): boolean {
    return this.equiposExpandidos().has(idEquipo);
  }

  cambiarTab(t: TabDetalle): void { this.tab.set(t); }

  onCerrar(): void { this.cerrar.emit(); }

  llamarTecnico(): void {
    const c = this.cabecera();
    if (!c) return;
    this.toast.info(`Llamando a ${c.tecnico} (${c.telefono})…`);
  }

  // ─── Helpers de estilo ────────────────────────────────────────────────

  claseEstado(e: EstadoTecnicoCampo): string {
    switch (e) {
      case 'sin_salir':      return 'chip chip--gris';
      case 'en_ruta':        return 'chip chip--azul';
      case 'en_planta':
      case 'en_ejecucion':   return 'chip chip--verde';
      case 'con_demora':     return 'chip chip--ambar';
      case 'con_incidente':  return 'chip chip--rojo';
      case 'finalizado':     return 'chip chip--verde';
      default:                return 'chip';
    }
  }

  etiquetaEstado(e: EstadoTecnicoCampo): string {
    switch (e) {
      case 'sin_salir':      return 'Sin salir';
      case 'en_ruta':        return 'En ruta';
      case 'en_planta':      return 'En planta';
      case 'en_ejecucion':   return 'En ejecución';
      case 'con_demora':     return 'Con demora';
      case 'con_incidente':  return 'Incidente crítico';
      case 'finalizado':     return 'Finalizado';
      default:                return e;
    }
  }

  tabIcono(t: TabDetalle): string {
    switch (t) {
      case 'resumen':    return 'description';
      case 'equipos':    return 'precision_manufacturing';
      case 'mapa':       return 'map';
      case 'timeline':   return 'history';
      case 'demoras':    return 'warning';
      case 'registrar':  return 'edit_note';
      case 'cierre':     return 'check_circle';
    }
  }

  chipEstadoEquipo(e: EstadoEquipoServicio): string {
    switch (e) {
      case 'pendiente':    return 'chip chip--gris';
      case 'en_ejecucion': return 'chip chip--azul';
      case 'finalizado':   return 'chip chip--verde';
      case 'parcial':      return 'chip chip--ambar';
      case 'reprogramado': return 'chip chip--ambar';
      case 'anulado':      return 'chip chip--rojo';
      default:              return 'chip';
    }
  }

  labelEstadoEquipo(e: EstadoEquipoServicio): string {
    switch (e) {
      case 'pendiente':    return 'Pendiente';
      case 'en_ejecucion': return 'En ejecución';
      case 'finalizado':   return 'Finalizado';
      case 'parcial':      return 'Parcial';
      case 'reprogramado': return 'Reprogramado';
      case 'anulado':      return 'Anulado';
      default:              return e;
    }
  }

  // ─── Timeline del Día (helpers) ───────────────────────────────────────
  toggleFiltroTimeline(tipo: TipoEventoTimeline): void {
    const actuales = this.filtrosTimeline();
    this.filtrosTimeline.set({ ...actuales, [tipo]: !actuales[tipo] });
  }

  toggleOrdenTimeline(): void {
    this.ordenTimeline.set(this.ordenTimeline() === 'reciente' ? 'antiguo' : 'reciente');
  }

  iconoEvento(t: TipoEventoTimeline): string {
    switch (t) {
      case 'hito_tecnico':       return 'play_arrow';
      case 'alerta_sistema':     return 'wifi_off';
      case 'demora_incidente':   return 'warning';
      case 'registro_asistente': return 'edit_note';
    }
  }

  colorEventoTl(t: TipoEventoTimeline): string {
    switch (t) {
      case 'hito_tecnico':       return 'verde';
      case 'alerta_sistema':     return 'ambar';
      case 'demora_incidente':   return 'rojo';
      case 'registro_asistente': return 'azul';
    }
  }

  // ─── Tab Registrar (HU-53) ────────────────────────────────────────────
  readonly modoRegistro = signal<ModoRegistro>('observacion');

  // Observación / Nota
  readonly obsDescripcion     = signal<string>('');
  readonly obsVincularEvento  = signal<number | null>(null);
  readonly obsFuente          = signal<'llamada' | 'whatsapp' | 'reporte' | 'directa' | null>(null);

  // Demora / Incidente
  readonly demTipo          = signal<string>('trafico');
  readonly demDuracionMin   = signal<number | null>(null);
  readonly demDescripcion   = signal<string>('');

  // Cambio de Estado crítico
  readonly cesMotivo       = signal<string>('celular_robado');
  readonly cesNuevoEstado  = signal<string>('ingreso_planta');
  readonly cesComentario   = signal<string>('');

  readonly tiposDemora = [
    'Tráfico', 'Accidente propio', 'Accidente ajeno', 'Falla vehículo',
    'Clima adverso', 'Cliente no disponible', 'Problema de acceso',
    'Falta repuesto', 'Otros',
  ] as const;

  readonly motivosCriticos: { id: string; label: string }[] = [
    { id: 'celular_robado',  label: 'Celular robado / perdido' },
    { id: 'bateria_agotada', label: 'Batería agotada sin posibilidad de carga' },
    { id: 'equipo_danado',   label: 'Equipo dañado (celular roto)' },
    { id: 'error_app',       label: 'App móvil con error técnico' },
    { id: 'otro',            label: 'Otro (especificar en comentario)' },
  ];

  readonly estadosManuales: { id: string; label: string }[] = [
    { id: 'salida',         label: 'Salida de base' },
    { id: 'en_ruta',        label: 'En ruta' },
    { id: 'llegada',        label: 'Llegada' },
    { id: 'ingreso_planta', label: 'Ingreso a planta' },
    { id: 'inicio_servicio',label: 'Inicio de servicio' },
    { id: 'finalizado',     label: 'Finalizado' },
  ];

  readonly puedeRegistrar = computed<boolean>(() => {
    switch (this.modoRegistro()) {
      case 'observacion':
        return this.obsDescripcion().trim().length > 0;
      case 'demora_incidente':
        return this.demDescripcion().trim().length > 0;
      case 'cambio_estado_critico':
        return this.cesComentario().trim().length > 0;
    }
  });

  cambiarModo(m: ModoRegistro): void {
    this.modoRegistro.set(m);
  }

  setObsFuente(f: 'llamada' | 'whatsapp' | 'reporte' | 'directa'): void {
    this.obsFuente.set(this.obsFuente() === f ? null : f);
  }

  async onRegistrar(): Promise<void> {
    if (!this.puedeRegistrar()) return;
    // TODO: back pendiente. Por ahora solo toast + limpieza.
    const modo = this.modoRegistro();
    const etiquetas: Record<ModoRegistro, string> = {
      observacion: 'Observación / Nota',
      demora_incidente: 'Demora / Incidente',
      cambio_estado_critico: 'Cambio de estado (crítico)',
    };
    this.toast.exito(`${etiquetas[modo]} registrado en el servicio.`);
    this.obsDescripcion.set('');
    this.obsVincularEvento.set(null);
    this.obsFuente.set(null);
    this.demDuracionMin.set(null);
    this.demDescripcion.set('');
    this.cesComentario.set('');
    // Recargamos el detalle para ver el nuevo evento en el timeline
    await this.cargar(true);
    this.actualizado.emit();
  }

  // ─── Demoras / Incidencias (helpers) ──────────────────────────────────
  chipImpacto(d: { retrasa: boolean; detiene: boolean }): string {
    if (d.detiene) return 'chip chip--rojo';
    if (d.retrasa) return 'chip chip--ambar';
    return 'chip chip--gris';
  }
  labelImpacto(d: { retrasa: boolean; detiene: boolean }): string {
    if (d.detiene) return 'DETIENE';
    if (d.retrasa) return 'RETRASA';
    return 'SIN IMPACTO';
  }
  chipOrigen(o: 'tecnico' | 'asistente' | 'sistema'): string {
    switch (o) {
      case 'tecnico':   return 'chip chip--verde';
      case 'asistente': return 'chip chip--azul';
      case 'sistema':   return 'chip chip--gris';
    }
  }
  labelOrigen(o: 'tecnico' | 'asistente' | 'sistema'): string {
    switch (o) {
      case 'tecnico':   return 'Técnico (app móvil)';
      case 'asistente': return 'Asistente (manual)';
      case 'sistema':   return 'Sistema (automático)';
    }
  }
  iconoOrigen(o: 'tecnico' | 'asistente' | 'sistema'): string {
    switch (o) {
      case 'tecnico':   return 'smartphone';
      case 'asistente': return 'person';
      case 'sistema':   return 'settings_suggest';
    }
  }
  iconoOrigenCompacto(o: 'tecnico' | 'asistente' | 'sistema'): string {
    switch (o) {
      case 'tecnico':   return 'smartphone';     // celular
      case 'asistente': return 'laptop_mac';     // laptop
      case 'sistema':   return 'computer';       // pc
    }
  }

  inicialesAutor(nombre: string): string {
    if (!nombre) return '?';
    if (nombre.toLowerCase().startsWith('sistema')) return 'SY';
    const partes = nombre.trim().split(/\s+/);
    const a = partes[0]?.[0] ?? '';
    const b = partes.length > 1 ? partes[1][0] : (partes[0]?.[1] ?? '');
    return (a + b).toUpperCase();
  }

  labelFuente(t: TipoEventoTimeline): string {
    switch (t) {
      case 'hito_tecnico':       return 'Técnico (app móvil)';
      case 'alerta_sistema':     return 'Sistema (automático)';
      case 'demora_incidente':   return 'Demora / incidencia';
      case 'registro_asistente': return 'Asistente (manual)';
    }
  }

  chipFuente(t: TipoEventoTimeline): string {
    switch (t) {
      case 'hito_tecnico':       return 'chip chip--verde';
      case 'alerta_sistema':     return 'chip chip--gris';
      case 'demora_incidente':   return 'chip chip--rojo';
      case 'registro_asistente': return 'chip chip--azul';
    }
  }

  labelFiltro(t: TipoEventoTimeline): string {
    switch (t) {
      case 'hito_tecnico':       return 'Hitos del técnico';
      case 'alerta_sistema':     return 'Alertas del sistema';
      case 'demora_incidente':   return 'Demoras/incidencias';
      case 'registro_asistente': return 'Registros del Asistente';
    }
  }

  tabLabel(t: TabDetalle): string {
    switch (t) {
      case 'resumen':    return 'Resumen';
      case 'equipos':    return 'Avance por Equipos';
      case 'mapa':       return 'Mapa GPS';
      case 'timeline':   return 'Timeline del Día';
      case 'demoras':    return 'Demoras / Incidencias';
      case 'registrar':  return 'Registrar';
      case 'cierre':     return 'Cierre del Servicio';
    }
  }
}
