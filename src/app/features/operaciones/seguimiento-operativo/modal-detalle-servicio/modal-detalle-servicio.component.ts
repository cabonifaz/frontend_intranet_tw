import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguimientoOperativoService } from '../../../../core/services/seguimiento-operativo.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  COLOR_DEMORA_EN_RUTA, COLOR_DEMORA_INGRESO, etiquetaEstadoCampo, formatearDistancia, formatearDuracionMin,
} from '../../../../core/services/seguimiento-operativo-mapper';
import {
  ConexionGps, DemoraIncidenciaServicio, DetalleServicioSeguimiento, EstadoEquipoCierre, EstadoEquipoServicio,
  EstadoTecnicoCampo, FaseDemora, ModoRegistro, TipoEventoTimeline, TipoHitoGps,
} from '../../../../core/models/seguimiento-operativo.model';
import { FormularioRegistroAsistenteApi, SeccionEquipo, SeccionEquipoApi } from '../../../../core/models/seguimiento-operativo-api.model';
import {
  AprobacionesServicio, AprobacionServicio, TipoAprobacion, ViaticosOs,
} from '../../../../core/models/aprobaciones-viaticos-servicio.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ResumenViaticosComponent, AccionRevisionGasto } from '../../../../shared/ui/resumen-viaticos/resumen-viaticos.component';
import { viaticosOsAVm } from '../../../../shared/ui/resumen-viaticos/resumen-viaticos.vm';
import {
  CirculoMapa, MapaSeguimientoComponent, MarcadorMapa, RutaMapa,
} from '../mapa-seguimiento.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

/** Respaldo si el backend no manda RefrescoSegundos (parámetro SEG_DETALLE_REFRESCO_SEGUNDOS). */
const REFRESCO_POR_DEFECTO_SEG = 15;
const REFRESCO_MINIMO_SEG = 5;

type TabDetalle =
  | 'resumen' | 'equipos' | 'mapa' | 'timeline'
  | 'demoras' | 'aprobaciones' | 'viaticos' | 'registrar' | 'cierre';

type FiltroTipoAprobacion = TipoAprobacion | 'todas';

/**
 * HU-52 — Modal "Detalle del Servicio en Ruta" (Módulo 11 Control de Campo).
 * Modal grande (xl) con 7 tabs (6 fijos + Cierre condicional cuando esFinalizado).
 * Datos reales del backend. Auto-refresh cada `cabecera.refrescoSegundos` (SEG_DETALLE_REFRESCO_SEGUNDOS, 15 s
 * por defecto). Footer sticky con botón "Llamar al técnico".
 */
@Component({
  selector: 'app-modal-detalle-servicio',
  imports: [
    CommonModule, FormsModule, ModalComponent, ButtonComponent,
    KpiGridComponent, KpiCardComponent, TablaPaginadaComponent, MapaSeguimientoComponent,
    ResumenViaticosComponent,
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
  /** El padre coordina cerrar este modal y abrir el de detalle de incidencia (incluye el N° OS para el header). */
  readonly verIncidencia = output<{ evento: DemoraIncidenciaServicio; numeroOs: string }>();

  readonly tab      = signal<TabDetalle>('resumen');
  readonly cargando = signal(true);
  readonly detalle  = signal<DetalleServicioSeguimiento | null>(null);
  /** Error de la primera carga (el modal no tiene datos que mostrar): se pinta dentro del modal. */
  readonly error    = signal<string | null>(null);
  /** Error de un refresco automático: se conservan los últimos datos y se avisa en la franja superior. */
  readonly errorActualizacion = signal<string | null>(null);
  /** Set de idEquipo expandidos en el tab Avance por Equipos. El equipo activo
   *  (en ejecución) se agrega automáticamente al cargar el detalle. */
  readonly equiposExpandidos = signal<Set<number>>(new Set());

  /** Auditoría del cierre (tab Cierre, solo si esFinalizado). */
  readonly auditoriaCierre = signal<unknown | null>(null);
  readonly cargandoAuditoriaCierre = signal(false);
  readonly mostrandoAuditoria = signal(false);


  /** Sub-tab activo por equipo (drill-down). Key = idEquipo, value = sección. */
  readonly subtabActivoPorEquipo = signal<Map<number, SeccionEquipo>>(new Map());
  /** Contenido cargado por (idEquipo, sección). Key = `${idEquipo}:${seccion}`. */
  readonly contenidoSeccionEquipo = signal<Map<string, SeccionEquipoApi>>(new Map());
  readonly cargandoSeccionEquipo  = signal<Set<string>>(new Set());

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

  /** El backend entrega el timeline en orden cronológico (orden=antiguo); "más reciente primero" lo invierte. */
  readonly eventosTimelineFiltrados = computed(() => {
    const todos = this.detalle()?.timeline ?? [];
    const filtros = this.filtrosTimeline();
    const list = todos.filter(e => filtros[e.tipo]);
    return this.ordenTimeline() === 'reciente' ? [...list].reverse() : list;
  });

  /** Mapa clave → DemoraIncidenciaServicio: usado por el timeline para saber si un evento tiene foto adjunta. */
  readonly demorasPorClave = computed<Map<string, DemoraIncidenciaServicio>>(() => {
    const filas = this.detalle()?.demoras ?? [];
    const m = new Map<string, DemoraIncidenciaServicio>();
    for (const f of filas) m.set(f.idDemora, f);
    return m;
  });

  /** Devuelve la demora/incidencia si el evento del timeline tiene una (match por clave), o null. */
  demoraDeEvento(idEvento: string): DemoraIncidenciaServicio | null {
    return this.demorasPorClave().get(idEvento) ?? null;
  }

  /** true si el evento del timeline corresponde a una demora/registro que tiene foto adjunta. */
  eventoTieneFoto(idEvento: string): boolean {
    const d = this.demoraDeEvento(idEvento);
    return !!d && !!d.nFotos && d.nFotos > 0;
  }

  /** Click en un evento del timeline: si corresponde a una demora/registro, abre el modal detalle. */
  onClicEventoTimeline(idEvento: string): void {
    const d = this.demoraDeEvento(idEvento);
    if (d) this.verIncidencia.emit({ evento: d, numeroOs: this.cabecera()?.numero ?? '' });
  }

  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private destruido = false;
  private cargandoAhora = false;

  readonly cabecera = computed(() => this.detalle()?.cabecera);

  readonly tabsVisibles = computed<TabDetalle[]>(() => {
    const base: TabDetalle[] = ['resumen', 'equipos', 'mapa', 'timeline', 'demoras', 'aprobaciones', 'viaticos', 'registrar'];
    return this.cabecera()?.esFinalizado ? [...base, 'cierre'] : base;
  });

  /** HU-54: cuando el servicio está finalizado, Registrar queda bloqueado. */
  readonly registrarDeshabilitado = computed<boolean>(() => !!this.cabecera()?.esFinalizado);
  readonly tooltipRegistrarBloqueado = 'Servicio finalizado — Para registrar observaciones post-cierre, pedir reapertura al Jefe de Operaciones';

  // ─── Mapa GPS (tab 3): datos para el componente de mapa ──────────────────
  /** Posición actual, planta del cliente, hitos (salida/pre-llegada/llegada) y demoras con su GPS. */
  readonly marcadoresGps = computed<MarcadorMapa[]>(() => {
    const d = this.detalle();
    if (!d) return [];
    const g = d.gps;
    const marcadores: MarcadorMapa[] = [];

    if (g.planta) {
      marcadores.push({
        id: 'planta', lat: g.planta.lat, lng: g.planta.lng, tipo: 'planta', color: '#DC2626', icono: 'business',
        titulo: `Planta del cliente · ${g.planta.nombre}`,
        popup: ['Planta del cliente', d.cabecera.cliente, g.planta.nombre, ...(g.planta.direccion ? [g.planta.direccion] : []),
          ...(g.planta.mostrarRadio ? [`Radio de proximidad: ${g.planta.radioM} m`] : [])],
        prioridad: 100,
      });
    }

    for (const h of g.cronograma) {
      if (!h.hora || h.lat === null || h.lng === null) continue;
      if (g.planta && h.lat === g.planta.lat && h.lng === g.planta.lng) continue;   // ya lo marca el pin de la planta
      marcadores.push({
        id: `hito-${h.tipo}`, lat: h.lat, lng: h.lng, tipo: 'hito', color: '#10B981', icono: this.iconoHito(h.tipo),
        titulo: `${h.evento} · ${h.hora}`,
        popup: [h.evento, `Hora: ${h.hora}`, ...(h.detalle ? [h.detalle] : [])],
        prioridad: 200,
      });
    }

    g.demoras.forEach((dm, i) => {
      marcadores.push({
        id: `demora-${i}-${dm.hora}`, lat: dm.lat, lng: dm.lng, tipo: 'demora',
        color: dm.fase === 'ingreso' ? COLOR_DEMORA_INGRESO : COLOR_DEMORA_EN_RUTA,
        icono: dm.fase === 'ingreso' ? 'hourglass_top' : 'warning',
        titulo: `${dm.faseLabel} · ${dm.motivo}`,
        popup: [dm.faseLabel, dm.motivo, `${dm.hora} · ${dm.duracionMin} min`],
        prioridad: 300,
      });
    });

    const u = g.ultimaUbicacion;
    if (u.lat !== null && u.lng !== null) {
      marcadores.push({
        id: 'actual', lat: u.lat, lng: u.lng, tipo: 'actual', color: '#2563EB', icono: 'navigation',
        pulso: g.estadoSenal.conexion === 'gps_activo',
        titulo: `${d.cabecera.tecnico} · posición actual`,
        popup: [d.cabecera.tecnico, 'Posición actual', g.estadoSenal.hace, u.nombreLugar,
          ...(u.velocidadKmh !== null ? [`Velocidad: ${u.velocidadKmh} km/h`] : [])],
        prioridad: 1000,
      });
    }
    return marcadores;
  });

  /** Polilínea con toda la ruta recorrida hoy por el técnico (puntos GPS del celular, en orden cronológico). */
  readonly rutaGps = computed<RutaMapa | null>(() => {
    const ruta = this.detalle()?.gps.ruta ?? [];
    return ruta.length >= 2 ? { puntos: ruta.map(p => [p.lat, p.lng] as [number, number]) } : null;
  });

  /** Círculo de proximidad (RadioProximidadM) alrededor de la planta, cuando el backend indica que corresponde. */
  readonly circuloGps = computed<CirculoMapa | null>(() => {
    const p = this.detalle()?.gps.planta;
    return p && p.mostrarRadio ? { lat: p.lat, lng: p.lng, radioM: p.radioM } : null;
  });

  // ─── HU-52 · Aprobaciones del servicio ─────────────────────────────────
  private readonly sanitizer = inject(DomSanitizer);

  readonly aprobaciones         = signal<AprobacionesServicio | null>(null);
  readonly cargandoAprobaciones = signal(false);
  readonly errorAprobaciones    = signal<string | null>(null);
  readonly filtroAprobacion     = signal<FiltroTipoAprobacion>('todas');

  readonly aprobacionesFiltradas = computed<AprobacionServicio[]>(() => {
    const data = this.aprobaciones();
    if (!data) return [];
    const f = this.filtroAprobacion();
    return f === 'todas' ? data.aprobaciones : data.aprobaciones.filter(a => a.tipo === f);
  });

  readonly conteoPorTipo = computed(() => {
    const data = this.aprobaciones();
    if (!data) return { salida: 0, llegada: 0, evidencia: 0, ensayo: 0 };
    const pend = (t: TipoAprobacion) => data.aprobaciones.filter(a => a.tipo === t && a.estado === 'pendiente').length;
    return { salida: pend('salida'), llegada: pend('llegada'), evidencia: pend('evidencia'), ensayo: pend('ensayo') };
  });

  /** Modal secundario: resolver (aprobar/rechazar) una aprobación. */
  readonly itemResolver        = signal<AprobacionServicio | null>(null);
  readonly accionResolver      = signal<'aprobar' | 'rechazar' | null>(null);
  readonly comentarioResolver  = signal('');
  readonly resolviendo         = signal(false);

  // ─── HU-52 · Viáticos y Gastos del servicio ────────────────────────────
  readonly viaticos         = signal<ViaticosOs | null>(null);
  readonly cargandoViaticos = signal(false);
  readonly errorViaticos    = signal<string | null>(null);
  readonly viaticosVm       = computed(() => {
    const v = this.viaticos();
    return v ? viaticosOsAVm(v) : null;
  });

  /** Modal secundario: revisar un gasto (aprobar/observar/rechazar). */
  readonly gastoRevisar        = signal<{ idGasto: number; concepto: string } | null>(null);
  readonly accionRevisarGasto  = signal<AccionRevisionGasto | null>(null);
  readonly comentarioRevisar   = signal('');
  readonly revisandoGasto      = signal(false);

  /** Lightbox para el comprobante blob. */
  readonly comprobanteAbierto    = signal<{ idGasto: number; n: number; nFotos: number } | null>(null);
  readonly comprobanteCargando   = signal(false);
  readonly comprobanteError      = signal<string | null>(null);
  readonly comprobanteSafeUrl    = signal<SafeUrl | null>(null);
  private comprobanteUrl: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.limpiarTemporizador();
    const previo = this.evidenciaPreview();
    if (previo) URL.revokeObjectURL(previo);
    if (this.comprobanteUrl) URL.revokeObjectURL(this.comprobanteUrl);
  }

  // ─── Aprobaciones · acciones ───────────────────────────────────────────

  async cargarAprobaciones(): Promise<void> {
    if (this.cargandoAprobaciones()) return;
    this.cargandoAprobaciones.set(true);
    this.errorAprobaciones.set(null);
    try {
      this.aprobaciones.set(await this.svc.obtenerAprobacionesServicio(this.idServicio()));
    } catch (e: unknown) {
      this.errorAprobaciones.set(e instanceof Error ? e.message : 'No se pudieron cargar las aprobaciones.');
    } finally {
      this.cargandoAprobaciones.set(false);
    }
  }

  abrirResolver(item: AprobacionServicio, accion: 'aprobar' | 'rechazar'): void {
    this.itemResolver.set(item);
    this.accionResolver.set(accion);
    this.comentarioResolver.set('');
  }
  cerrarResolver(): void {
    if (this.resolviendo()) return;
    this.itemResolver.set(null);
    this.accionResolver.set(null);
    this.comentarioResolver.set('');
  }
  async confirmarResolver(): Promise<void> {
    const item   = this.itemResolver();
    const accion = this.accionResolver();
    if (!item || !accion) return;
    const com = this.comentarioResolver().trim();
    if (accion === 'rechazar' && com.length < 1) {
      this.toast.error('El comentario es obligatorio al rechazar.');
      return;
    }
    if (com.length > 500) {
      this.toast.error('El comentario no puede superar 500 caracteres.');
      return;
    }
    this.resolviendo.set(true);
    try {
      await this.svc.resolverAprobacion(this.idServicio(), item.tipo, item.id, {
        aprobar:    accion === 'aprobar',
        comentario: com,
      });
      this.toast.exito(accion === 'aprobar' ? 'Aprobación registrada.' : 'Solicitud rechazada.');
      this.cerrarResolver();
      await this.cargarAprobaciones();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo resolver la aprobación.');
    } finally {
      this.resolviendo.set(false);
    }
  }

  cambiarFiltroAprobacion(f: FiltroTipoAprobacion): void { this.filtroAprobacion.set(f); }

  // ─── Viáticos · acciones ───────────────────────────────────────────────

  async cargarViaticos(): Promise<void> {
    if (this.cargandoViaticos()) return;
    this.cargandoViaticos.set(true);
    this.errorViaticos.set(null);
    try {
      this.viaticos.set(await this.svc.obtenerViaticosServicio(this.idServicio()));
    } catch (e: unknown) {
      this.errorViaticos.set(e instanceof Error ? e.message : 'No se pudieron cargar los viáticos.');
    } finally {
      this.cargandoViaticos.set(false);
    }
  }

  abrirRevisarGasto(ev: { idGasto: number; accion: AccionRevisionGasto }): void {
    const g = this.viaticos()?.gastos.find(x => x.idGasto === ev.idGasto);
    if (!g) return;
    this.gastoRevisar.set({ idGasto: g.idGasto, concepto: g.concepto });
    this.accionRevisarGasto.set(ev.accion);
    this.comentarioRevisar.set('');
  }
  cerrarRevisarGasto(): void {
    if (this.revisandoGasto()) return;
    this.gastoRevisar.set(null);
    this.accionRevisarGasto.set(null);
    this.comentarioRevisar.set('');
  }
  async confirmarRevisarGasto(): Promise<void> {
    const g      = this.gastoRevisar();
    const accion = this.accionRevisarGasto();
    if (!g || !accion) return;
    const com = this.comentarioRevisar().trim();
    const requiereComentario = accion === 'observar' || accion === 'rechazar';
    if (requiereComentario && com.length < 1) {
      this.toast.error('El comentario es obligatorio al observar o rechazar.');
      return;
    }
    if (com.length > 500) {
      this.toast.error('El comentario no puede superar 500 caracteres.');
      return;
    }
    this.revisandoGasto.set(true);
    try {
      await this.svc.revisarGastoServicio(this.idServicio(), g.idGasto, {
        accion,
        comentario: com || null,
      });
      this.toast.exito('Gasto actualizado.');
      this.cerrarRevisarGasto();
      await this.cargarViaticos();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo revisar el gasto.');
    } finally {
      this.revisandoGasto.set(false);
    }
  }

  // ─── Comprobante · lightbox ────────────────────────────────────────────

  async abrirComprobante(ev: { idGasto: number; n: number }): Promise<void> {
    const g = this.viaticos()?.gastos.find(x => x.idGasto === ev.idGasto);
    if (!g) return;
    this.cerrarComprobante();
    this.comprobanteAbierto.set({ idGasto: g.idGasto, n: ev.n, nFotos: g.nFotos });
    await this.cargarComprobante(g.idGasto, ev.n);
  }

  async cambiarFotoComprobante(delta: number): Promise<void> {
    const c = this.comprobanteAbierto();
    if (!c) return;
    const n = ((c.n - 1 + delta + c.nFotos) % c.nFotos) + 1;
    this.comprobanteAbierto.set({ ...c, n });
    await this.cargarComprobante(c.idGasto, n);
  }

  private async cargarComprobante(idGasto: number, n: number): Promise<void> {
    if (this.comprobanteUrl) { URL.revokeObjectURL(this.comprobanteUrl); this.comprobanteUrl = null; }
    this.comprobanteSafeUrl.set(null);
    this.comprobanteError.set(null);
    this.comprobanteCargando.set(true);
    try {
      const blob = await this.svc.obtenerComprobanteGasto(this.idServicio(), idGasto, n);
      this.comprobanteUrl = URL.createObjectURL(blob);
      this.comprobanteSafeUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.comprobanteUrl));
    } catch (e: unknown) {
      this.comprobanteError.set(e instanceof Error ? e.message : 'No se pudo cargar el comprobante.');
    } finally {
      this.comprobanteCargando.set(false);
    }
  }

  cerrarComprobante(): void {
    if (this.comprobanteUrl) { URL.revokeObjectURL(this.comprobanteUrl); this.comprobanteUrl = null; }
    this.comprobanteSafeUrl.set(null);
    this.comprobanteError.set(null);
    this.comprobanteCargando.set(false);
    this.comprobanteAbierto.set(null);
  }

  // ─── Labels ────────────────────────────────────────────────────────────

  labelTipoAprobacion(t: TipoAprobacion): string {
    switch (t) {
      case 'salida':    return 'Salida';
      case 'llegada':   return 'Llegada';
      case 'evidencia': return 'Evidencia';
      case 'ensayo':    return 'Ensayo';
    }
  }

  iconoTipoAprobacion(t: TipoAprobacion): string {
    switch (t) {
      case 'salida':    return 'logout';
      case 'llegada':   return 'login';
      case 'evidencia': return 'photo_camera';
      case 'ensayo':    return 'science';
    }
  }

  chipEstadoAprobacion(e: 'pendiente' | 'aprobada' | 'rechazada'): string {
    switch (e) {
      case 'pendiente': return 'chip chip--ambar';
      case 'aprobada':  return 'chip chip--verde';
      case 'rechazada': return 'chip chip--rojo';
    }
  }

  labelEstadoAprobacion(e: 'pendiente' | 'aprobada' | 'rechazada'): string {
    switch (e) {
      case 'pendiente': return 'Pendiente';
      case 'aprobada':  return 'Aprobada';
      case 'rechazada': return 'Rechazada';
    }
  }

  async cargar(silencioso = false): Promise<void> {
    if (this.cargandoAhora) return;   // un refresco no se solapa con otra carga en curso
    this.cargandoAhora = true;
    this.limpiarTemporizador();
    if (!silencioso) this.cargando.set(true);
    try {
      const d = await this.svc.obtenerDetalleServicio(this.idServicio());
      this.detalle.set(d);
      this.error.set(null);
      this.errorActualizacion.set(null);
      // Primera carga: auto-expandir el equipo activo (en ejecución)
      if (!silencioso) {
        const activo = d.equipos.find(eq => eq.activo);
        if (activo) this.equiposExpandidos.set(new Set([activo.idEquipo]));
      }
    } catch (e: unknown) {
      const mensaje = e instanceof Error && e.message ? e.message : 'No se pudo cargar el detalle.';
      if (!this.detalle()) this.error.set(mensaje);
      else if (silencioso) this.errorActualizacion.set(mensaje);
      else this.toast.error(mensaje);
    } finally {
      this.cargando.set(false);
      this.cargandoAhora = false;
      this.programarRefresco();
    }
  }

  /** Auto-refresh con el intervalo que indica el backend (RefrescoSegundos) en cada respuesta. */
  private programarRefresco(): void {
    if (this.destruido) return;
    const seg = Math.max(REFRESCO_MINIMO_SEG, this.cabecera()?.refrescoSegundos ?? REFRESCO_POR_DEFECTO_SEG);
    this.temporizador = setTimeout(() => void this.cargar(true), seg * 1000);
  }

  private limpiarTemporizador(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  private iconoHito(t: TipoHitoGps): string {
    switch (t) {
      case 'salida':      return 'play_arrow';
      case 'pre_llegada': return 'near_me';
      case 'llegada':     return 'flag';
    }
  }

  toggleEquipo(idEquipo: number): void {
    const estabaExpandido = this.equiposExpandidos().has(idEquipo);
    const set = new Set(this.equiposExpandidos());
    if (estabaExpandido) set.delete(idEquipo);
    else set.add(idEquipo);
    this.equiposExpandidos.set(set);
    // Al expandir por primera vez, cargar el sub-tab por defecto (fotos)
    if (!estabaExpandido) {
      void this.cargarSeccionEquipo(idEquipo, this.subtabEquipo(idEquipo));
    }
  }

  /** Devuelve el sub-tab activo de un equipo. Default: 'fotos'. */
  subtabEquipo(idEquipo: number): SeccionEquipo {
    return this.subtabActivoPorEquipo().get(idEquipo) ?? 'fotos';
  }

  contenidoSeccion(idEquipo: number, seccion: SeccionEquipo): SeccionEquipoApi | null {
    return this.contenidoSeccionEquipo().get(`${idEquipo}:${seccion}`) ?? null;
  }

  estaCargandoSeccion(idEquipo: number, seccion: SeccionEquipo): boolean {
    return this.cargandoSeccionEquipo().has(`${idEquipo}:${seccion}`);
  }

  /** Cambia el sub-tab de un equipo. Carga el contenido si aún no lo tiene. */
  async cambiarSubtabEquipo(idEquipo: number, seccion: SeccionEquipo): Promise<void> {
    const m = new Map(this.subtabActivoPorEquipo());
    m.set(idEquipo, seccion);
    this.subtabActivoPorEquipo.set(m);
    await this.cargarSeccionEquipo(idEquipo, seccion);
  }

  private async cargarSeccionEquipo(idEquipo: number, seccion: SeccionEquipo): Promise<void> {
    const key = `${idEquipo}:${seccion}`;
    if (this.contenidoSeccionEquipo().has(key) || this.cargandoSeccionEquipo().has(key)) return;
    const cargando = new Set(this.cargandoSeccionEquipo()); cargando.add(key);
    this.cargandoSeccionEquipo.set(cargando);
    try {
      const r = await this.svc.obtenerSeccionEquipo(this.idServicio(), idEquipo, seccion);
      const m = new Map(this.contenidoSeccionEquipo()); m.set(key, r);
      this.contenidoSeccionEquipo.set(m);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la sección del equipo.');
    } finally {
      const c = new Set(this.cargandoSeccionEquipo()); c.delete(key);
      this.cargandoSeccionEquipo.set(c);
    }
  }

  /** Toggle del panel de auditoría del cierre. Carga la info la primera vez. */
  async verAuditoriaCierre(): Promise<void> {
    if (this.mostrandoAuditoria()) { this.mostrandoAuditoria.set(false); return; }
    this.mostrandoAuditoria.set(true);
    if (this.auditoriaCierre()) return;
    this.cargandoAuditoriaCierre.set(true);
    try {
      this.auditoriaCierre.set(await this.svc.obtenerAuditoriaCierre(this.idServicio()));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la auditoría del cierre.');
    } finally {
      this.cargandoAuditoriaCierre.set(false);
    }
  }

  /** El DTO de auditoría trae { entradas: [{fecha, origen, accion, usuario, descripcion}] }. */
  get auditoriaEntradas(): { fecha: string; origen: string; accion: string; usuario: string | null; descripcion: string | null }[] {
    const a = this.auditoriaCierre() as { entradas?: unknown[] } | null;
    return (a?.entradas ?? []) as { fecha: string; origen: string; accion: string; usuario: string | null; descripcion: string | null }[];
  }

  /** Emite al padre para que cierre este modal y abra el de detalle de la incidencia. */
  abrirIncidenciaModal(ev: DemoraIncidenciaServicio): void {
    this.verIncidencia.emit({ evento: ev, numeroOs: this.cabecera()?.numero ?? '' });
  }

  estaExpandido(idEquipo: number): boolean {
    return this.equiposExpandidos().has(idEquipo);
  }

  cambiarTab(t: TabDetalle): void {
    // HU-54: si el servicio está finalizado, Registrar queda bloqueado (no permite navegación)
    if (t === 'registrar' && this.registrarDeshabilitado()) {
      this.toast.info(this.tooltipRegistrarBloqueado);
      return;
    }
    this.tab.set(t);
    // HU-53: cargar formulario del registro la primera vez que se visita la pestaña Registrar
    if (t === 'registrar' && !this.formRegistro() && !this.cargandoFormRegistro()) {
      this.cargarFormularioRegistro();
    }
    // HU-52: lazy load Aprobaciones y Viáticos la primera vez que se abren
    if (t === 'aprobaciones' && !this.aprobaciones() && !this.cargandoAprobaciones()) {
      void this.cargarAprobaciones();
    }
    if (t === 'viaticos' && !this.viaticos() && !this.cargandoViaticos()) {
      void this.cargarViaticos();
    }
  }

  /** Exportar CSV de Demoras/Incidencias — sin confirmaciones, descarga directa. */
  async exportarCsvIncidencias(): Promise<void> {
    try {
      const blob = await this.svc.exportarIncidenciasCsv(this.idServicio());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidencias-${this.cabecera()?.numero ?? this.idServicio()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo exportar el CSV.');
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  /** Llama al técnico con el teléfono que trae la cabecera (TelefonoTecnico). */
  llamarTecnico(): void {
    const c = this.cabecera();
    if (!c) return;
    if (!c.telefono) {
      this.toast.info(`${c.tecnico} no tiene un teléfono registrado.`);
      return;
    }
    window.open(`tel:${c.telefono.replace(/[^\d+]/g, '')}`, '_self');
  }

  /** Desde la columna GPS de Demoras/Incidencias: abre el mapa, donde está el pin de la demora. */
  verEnMapa(): void { this.tab.set('mapa'); }

  /** Valor numérico opcional con su unidad, o "—" cuando el celular no lo envió (satélites, latencia, etc.). */
  dato(v: number | null | undefined, unidad = '', decimales = 0): string {
    if (v === null || v === undefined || !Number.isFinite(v)) return '—';
    return `${decimales > 0 ? v.toFixed(decimales) : Math.round(v)}${unidad}`;
  }

  distancia(m: number | null): string {
    return formatearDistancia(m);
  }

  /** Duración en minutos como "45 min" / "2h 02min" (o "—"). */
  duracion(min: number | null): string {
    return formatearDuracionMin(min);
  }

  /** "HH:mm · título" del evento del timeline al que se vinculó una nota del Asistente (null si no está). */
  tituloVinculo(clave: string): string | null {
    const ev = this.detalle()?.timeline.find(e => e.idEvento === clave);
    return ev ? `${ev.hora} · ${ev.titulo}` : null;
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
    return etiquetaEstadoCampo(e);
  }

  // ─── Señal GPS (tab Mapa) ─────────────────────────────────────────────
  chipConexion(c: ConexionGps): string {
    switch (c) {
      case 'gps_activo': return 'chip chip--verde';
      case 'gps_parado': return 'chip chip--ambar';
      case 'sin_senal':  return 'chip chip--rojo';
    }
  }

  etiquetaConexion(c: ConexionGps): string {
    switch (c) {
      case 'gps_activo': return '● GPS activo';
      case 'gps_parado': return '● GPS parado';
      case 'sin_senal':  return '● Sin señal';
    }
  }

  // ─── Resumen (helpers) ────────────────────────────────────────────────
  labelRol(r: 'principal' | 'apoyo' | 'supervisor'): string {
    switch (r) {
      case 'principal':  return 'Principal';
      case 'apoyo':      return 'Apoyo';
      case 'supervisor': return 'Supervisión técnica';
    }
  }

  chipSsoma(e: string | null): string {
    switch ((e ?? '').toLowerCase()) {
      case 'conforme':   return 'chip chip--verde';
      case 'por_vencer': return 'chip chip--ambar';
      case 'incompleto': return 'chip chip--ambar';
      case 'bloqueado':  return 'chip chip--rojo';
      default:            return 'chip chip--gris';
    }
  }

  labelSsoma(e: string | null): string {
    switch ((e ?? '').toLowerCase()) {
      case 'conforme':   return 'Conforme';
      case 'por_vencer': return 'Por vencer';
      case 'incompleto': return 'Incompleto';
      case 'bloqueado':  return 'Bloqueado';
      default:            return e ?? '—';
    }
  }

  /** Momento de la demora de la app: en ruta (azul) vs ingreso a planta (morado), igual que sus pines. */
  chipMomento(f: FaseDemora | null): string {
    return f === 'ingreso' ? 'chip chip--morado' : 'chip chip--azul';
  }

  chipEstadoEquipoCierre(e: EstadoEquipoCierre): string {
    switch (e) {
      case 'finalizado':   return 'chip chip--verde';
      case 'parcial':      return 'chip chip--ambar';
      case 'pendiente':    return 'chip chip--gris';
      case 'reprogramado': return 'chip chip--azul';
      case 'anulado':      return 'chip chip--rojo';
    }
  }

  tabIcono(t: TabDetalle): string {
    switch (t) {
      case 'resumen':       return 'description';
      case 'equipos':       return 'precision_manufacturing';
      case 'mapa':          return 'map';
      case 'timeline':      return 'history';
      case 'demoras':       return 'warning';
      case 'aprobaciones':  return 'task_alt';
      case 'viaticos':      return 'account_balance_wallet';
      case 'registrar':     return 'edit_note';
      case 'cierre':        return 'check_circle';
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

  /** Formulario traído del back (catálogos + contexto + mis registros de hoy). */
  readonly formRegistro      = signal<FormularioRegistroAsistenteApi | null>(null);
  readonly cargandoFormRegistro = signal(false);
  readonly guardandoRegistro = signal(false);

  // Observación / Nota
  readonly obsDescripcion     = signal<string>('');
  readonly obsVincularEvento  = signal<string | null>(null);
  readonly obsFuente          = signal<'llamada_telefonica' | 'whatsapp' | 'contacto_planta' | 'observacion_directa' | null>(null);

  // Demora / Incidente — catálogos vienen del back (formRegistro.tiposDemora)
  readonly demIdTipo        = signal<number | null>(null);
  readonly demDuracionMin   = signal<number | null>(null);
  readonly demDescripcion   = signal<string>('');
  readonly demImpacto       = signal<'retrasa' | 'detiene' | null>(null);
  // HU-53 evidencia foto (opcional en los 3 modos: observación, demora/incidente y cambio de estado crítico)
  readonly evidenciaArchivo = signal<File | null>(null);
  readonly evidenciaPreview = signal<string | null>(null);
  readonly subiendoEvidencia = signal(false);
  /** JPG/PNG/WEBP hasta 5 MB (restricción del back). */
  readonly MAX_EVIDENCIA_BYTES = 5 * 1024 * 1024;

  // Cambio de Estado crítico — catálogos vienen del back (formRegistro.motivos / .estados)
  readonly cesIdMotivo     = signal<number | null>(null);
  readonly cesNuevoEstado  = signal<string | null>(null);
  readonly cesComentario   = signal<string>('');

  readonly puedeRegistrar = computed<boolean>(() => {
    const ctx = this.formRegistro()?.contexto;
    if (!ctx?.puedeRegistrar) return false;
    if (this.guardandoRegistro()) return false;
    switch (this.modoRegistro()) {
      case 'observacion':
        return this.obsDescripcion().trim().length > 0;
      case 'demora_incidente':
        return this.demDescripcion().trim().length > 0 && this.demIdTipo() != null;
      case 'cambio_estado_critico':
        return this.cesComentario().trim().length > 0 && !!this.cesNuevoEstado() && this.cesIdMotivo() != null;
    }
  });

  cambiarModo(m: ModoRegistro): void {
    this.modoRegistro.set(m);
  }

  setObsFuente(f: 'llamada_telefonica' | 'whatsapp' | 'contacto_planta' | 'observacion_directa'): void {
    this.obsFuente.set(this.obsFuente() === f ? null : f);
  }

  /** HU-53 — Selección del archivo de evidencia (opcional en los 3 modos). Valida tipo y tamaño en el front. */
  onSeleccionarEvidencia(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) return;
    const tiposValidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposValidos.includes(archivo.type)) {
      this.toast.error('Solo se admiten imágenes JPG, PNG o WEBP.');
      input.value = '';
      return;
    }
    if (archivo.size > this.MAX_EVIDENCIA_BYTES) {
      this.toast.error(`La imagen supera el límite de 5 MB (${(archivo.size / 1024 / 1024).toFixed(1)} MB).`);
      input.value = '';
      return;
    }
    const previoAnterior = this.evidenciaPreview();
    if (previoAnterior) URL.revokeObjectURL(previoAnterior);
    this.evidenciaArchivo.set(archivo);
    this.evidenciaPreview.set(URL.createObjectURL(archivo));
  }

  quitarEvidencia(): void {
    const previo = this.evidenciaPreview();
    if (previo) URL.revokeObjectURL(previo);
    this.evidenciaArchivo.set(null);
    this.evidenciaPreview.set(null);
  }

  /** GET …/registros — primero al abrir el tab, se mantiene con los últimos valores. */
  async cargarFormularioRegistro(): Promise<void> {
    this.cargandoFormRegistro.set(true);
    try {
      this.formRegistro.set(await this.svc.obtenerFormularioRegistro(this.idServicio()));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el formulario de registro.');
    } finally {
      this.cargandoFormRegistro.set(false);
    }
  }

  async onRegistrar(): Promise<void> {
    if (!this.puedeRegistrar()) return;
    this.guardandoRegistro.set(true);
    try {
      // Mapear modo del front → modo del back (observacion | demora | cambio_estado)
      const modoBack =
        this.modoRegistro() === 'observacion'       ? 'observacion' :
        this.modoRegistro() === 'demora_incidente'  ? 'demora'      : 'cambio_estado';

      // HU-53 — Si hay foto adjunta (en cualquiera de los 3 modos), la subimos primero
      // y mandamos la URL devuelta como evidenciaUrl en el POST /registros.
      let evidenciaUrl: string | null = null;
      if (this.evidenciaArchivo()) {
        this.subiendoEvidencia.set(true);
        try {
          const subida = await this.svc.subirEvidencia(this.idServicio(), this.evidenciaArchivo()!);
          evidenciaUrl = subida.url;
        } finally {
          this.subiendoEvidencia.set(false);
        }
      }

      const r = await this.svc.registrarAsistente(this.idServicio(), {
        modo:        modoBack,
        descripcion: this.modoRegistro() === 'observacion' ? this.obsDescripcion() : this.demDescripcion() || null,
        fuente:      this.modoRegistro() === 'observacion' ? this.obsFuente()      : null,
        vinculo:     this.modoRegistro() === 'observacion' ? this.obsVincularEvento() : null,
        idTipo:      this.modoRegistro() === 'demora_incidente' ? this.demIdTipo()  : null,
        duracionMin: this.modoRegistro() === 'demora_incidente' ? this.demDuracionMin() : null,
        impacto:     this.modoRegistro() === 'demora_incidente' ? this.demImpacto() : null,
        evidenciaUrl,
        nuevoEstado: this.modoRegistro() === 'cambio_estado_critico' ? this.cesNuevoEstado() : null,
        idMotivo:    this.modoRegistro() === 'cambio_estado_critico' ? this.cesIdMotivo()    : null,
        comentario:  this.modoRegistro() === 'cambio_estado_critico' ? this.cesComentario()  : null,
      });
      this.toast.exito(`Registro creado · ${r.notificados} notificado(s).`);
      // Limpio los campos editables
      this.obsDescripcion.set(''); this.obsFuente.set(null); this.obsVincularEvento.set(null);
      this.demDescripcion.set(''); this.demDuracionMin.set(null); this.demIdTipo.set(null); this.demImpacto.set(null);
      this.quitarEvidencia();
      this.cesComentario.set(''); this.cesIdMotivo.set(null); this.cesNuevoEstado.set(null);
      // Recargo formulario (para refrescar "Mis registros") + todo el detalle (timeline, incidencias, cabecera)
      await Promise.all([this.cargarFormularioRegistro(), this.cargar(true)]);
      this.actualizado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar.');
    } finally {
      this.guardandoRegistro.set(false);
    }
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
      case 'resumen':       return 'Resumen';
      case 'equipos':       return 'Avance por Equipos';
      case 'mapa':          return 'Mapa GPS';
      case 'timeline':      return 'Timeline del Día';
      case 'demoras':       return 'Demoras / Incidencias';
      case 'aprobaciones':  return 'Aprobaciones';
      case 'viaticos':      return 'Viáticos y Gastos';
      case 'registrar':     return 'Registrar';
      case 'cierre':        return 'Cierre del Servicio';
    }
  }
}
