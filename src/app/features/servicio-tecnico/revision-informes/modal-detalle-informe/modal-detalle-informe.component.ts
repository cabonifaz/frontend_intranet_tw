import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RevisionInformesService } from '../../../../core/services/revision-informes.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CabeceraInformeApi, CategoriaHistorial, DetalleInformeApi, EnsayoInformeApi, EventoHistorialApi,
  FotoInformeApi, HistorialInformeApi, MomentoFoto, NivelObservacion, ObservacionInformeApi,
  PasoInformeApi, PrioridadRecomendacion, RecomendacionInformeApi,
} from '../../../../core/models/revision-informes-api.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InicialesPipe } from '../../../../shared/pipes/iniciales.pipe';
import { EnViewportDirective } from '../../../../shared/directives/en-viewport.directive';
import { ResumenViaticosComponent } from '../../../../shared/ui/resumen-viaticos/resumen-viaticos.component';
import { viaticosOsAVm } from '../../../../shared/ui/resumen-viaticos/resumen-viaticos.vm';
import { ViaticosOs } from '../../../../core/models/aprobaciones-viaticos-servicio.model';

/**
 * Estado interno de carga de un archivo de evidencia (HU-57).
 * Las URLs blob viven solo en memoria del componente; se revocan al destruir.
 */
type EstadoFoto =
  | { estado: 'pendiente' }
  | { estado: 'cargando' }
  | { estado: 'listo'; url: string; safeUrl: SafeUrl }
  | { estado: 'error' };

type Tab = 'resumen' | 'detalle' | 'descripcion' | 'observaciones' | 'recomendaciones' | 'ensayos' | 'fotos' | 'viaticos' | 'historial';

/**
 * HU-57 — Modal Detalle del Servicio Técnico (Módulo 12).
 * 8 tabs: Resumen · Detalle del Servicio · Descripción Complementaria · Observaciones · Recomendaciones ·
 * Ensayos · Fotos · Historial. Botones primarios condicionales según `accionPrincipal` de la cabecera:
 *   - registrar_precotizacion → "Registrar Precotización" (HU-58)
 *   - registrar_revision      → "Registrar Revisión" (HU-59)
 *   - null                    → solo lectura (informe ya revisado)
 */
@Component({
  selector: 'app-modal-detalle-informe',
  imports: [CommonModule, ButtonComponent, InicialesPipe, EnViewportDirective, ResumenViaticosComponent],
  templateUrl: './modal-detalle-informe.component.html',
  styleUrl: './modal-detalle-informe.component.scss',
})
export class ModalDetalleInformeComponent implements OnInit, OnDestroy {
  private readonly svc       = inject(RevisionInformesService);
  private readonly toast     = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly idInforme = input.required<number>();

  readonly cerrar      = output<void>();
  readonly editar      = output<number>();
  readonly precotizar  = output<number>();
  readonly revisar     = output<number>();

  readonly cargando = signal(true);
  readonly error    = signal<string | null>(null);
  readonly detalle  = signal<DetalleInformeApi | null>(null);
  readonly tab      = signal<Tab>('resumen');

  // ─── Filtros de galería de fotos ────────────────────────────────────────
  readonly filtroMomento = signal<MomentoFoto | 'TODOS'>('TODOS');

  // ─── Carga diferida de blobs de fotos (HU-57) ───────────────────────────
  /** Caché de la miniatura (imagen o cuadro estático del video) por idEvidencia. */
  readonly estadoFotos = signal<Record<number, EstadoFoto>>({});
  /** Caché aparte del MP4 completo para videos en el lightbox (cuadro=false). */
  readonly estadoVideos = signal<Record<number, EstadoFoto>>({});
  /** Límite de descargas en paralelo (Bryan pidió ~4 para no saturar al back con informes de 28 fotos). */
  private readonly MAX_CONCURRENTES = 4;
  private activas = 0;
  private cola: Array<{ idInforme: number; idEvidencia: number; cuadro: boolean }> = [];

  // ─── Visor en grande (lightbox) ─────────────────────────────────────────
  readonly lightbox = signal<FotoInformeApi | null>(null);

  // ─── Historial (tab 8) ──────────────────────────────────────────────────
  readonly categoriaHistorial = signal<CategoriaHistorial>('todos');
  readonly historialCompleto  = signal<HistorialInformeApi | null>(null);
  readonly cargandoHistorial  = signal(false);

  // ─── Viáticos (tab, HU-57 cierre) ──────────────────────────────────────
  readonly viaticos         = signal<ViaticosOs | null>(null);
  readonly cargandoViaticos = signal(false);
  readonly errorViaticos    = signal<string | null>(null);
  readonly viaticosVm       = computed(() => {
    const v = this.viaticos();
    return v ? viaticosOsAVm(v) : null;
  });

  // ─── Derivados ──────────────────────────────────────────────────────────
  readonly cabecera        = computed<CabeceraInformeApi | null>(() => this.detalle()?.cabecera ?? null);
  readonly procedimiento   = computed<PasoInformeApi[]>(() => this.detalle()?.procedimiento ?? []);
  readonly ensayos         = computed<EnsayoInformeApi[]>(() => this.detalle()?.ensayos ?? []);
  readonly observaciones   = computed<ObservacionInformeApi[]>(() => this.detalle()?.observaciones ?? []);
  readonly recomendaciones = computed<RecomendacionInformeApi[]>(() => this.detalle()?.recomendaciones ?? []);
  readonly fotosTodas      = computed<FotoInformeApi[]>(() => this.detalle()?.fotos ?? []);
  readonly historial       = computed(() => this.detalle()?.historialReciente ?? []);

  readonly fotos = computed<FotoInformeApi[]>(() => {
    const m = this.filtroMomento();
    return m === 'TODOS' ? this.fotosTodas() : this.fotosTodas().filter(f => f.momento === m);
  });

  readonly momentosDisponibles = computed<{ codigo: MomentoFoto | 'TODOS', label: string, n: number }[]>(() => {
    const todas = this.fotosTodas();
    const grupos: Record<MomentoFoto, number> = { ANTES: 0, DURANTE: 0, DESPUES: 0, FALLA: 0, VERIFICACION: 0 };
    for (const f of todas) if (f.momento) grupos[f.momento]++;
    return [
      { codigo: 'TODOS' as const, label: 'Todas',        n: todas.length },
      { codigo: 'ANTES' as const, label: 'Antes',        n: grupos.ANTES },
      { codigo: 'DURANTE' as const, label: 'Durante',    n: grupos.DURANTE },
      { codigo: 'DESPUES' as const, label: 'Después',    n: grupos.DESPUES },
      { codigo: 'FALLA' as const, label: 'Falla',        n: grupos.FALLA },
      { codigo: 'VERIFICACION' as const, label: 'Verif.', n: grupos.VERIFICACION },
    ].filter(g => g.codigo === 'TODOS' || g.n > 0);
  });

  readonly chipEstado = computed(() => {
    const c = this.cabecera();
    if (!c) return 'chip chip--gris';
    switch (c.grupoEstado) {
      case 'pendiente_revision':      return 'chip chip--ambar';
      case 'pendiente_precotizacion': return 'chip chip--rojo';
      case 'revisado_con_precot':     return 'chip chip--verde';
      case 'revisado_sin_precot':     return 'chip chip--gris-oscuro';
      default:                        return 'chip chip--gris';
    }
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  ngOnDestroy(): void {
    // Liberamos TODAS las URLs blob creadas para no fugar memoria.
    // Esto cubre: cierre del modal, cambio de informe y destrucción normal del componente.
    for (const e of Object.values(this.estadoFotos())) {
      if (e.estado === 'listo') URL.revokeObjectURL(e.url);
    }
    for (const e of Object.values(this.estadoVideos())) {
      if (e.estado === 'listo') URL.revokeObjectURL(e.url);
    }
    this.estadoFotos.set({});
    this.estadoVideos.set({});
    this.cola = [];
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.detalle.set(await this.svc.obtenerDetalle(this.idInforme()));
      // Dispara en background la carga de viáticos para que el chip del Resumen
      // de Validaciones (y el tab Viáticos) estén listos sin esperar al click.
      void this.cargarViaticos();
    } catch (e: unknown) {
      const m = e instanceof Error && e.message ? e.message : 'No se pudo cargar el detalle del informe.';
      this.error.set(m);
      this.toast.error(m);
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: Tab): void {
    this.tab.set(t);
    // El historial se carga lazy la primera vez que se abre el tab.
    if (t === 'historial' && !this.historialCompleto()) {
      void this.cargarHistorial();
    }
    // HU-57 · viáticos del informe (modo cierre): lazy load.
    if (t === 'viaticos' && !this.viaticos() && !this.cargandoViaticos()) {
      void this.cargarViaticos();
    }
  }

  async cargarHistorial(): Promise<void> {
    this.cargandoHistorial.set(true);
    try {
      this.historialCompleto.set(await this.svc.obtenerHistorial(this.idInforme(), this.categoriaHistorial()));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el historial.');
    } finally {
      this.cargandoHistorial.set(false);
    }
  }

  async cargarViaticos(): Promise<void> {
    if (this.cargandoViaticos()) return;
    this.cargandoViaticos.set(true);
    this.errorViaticos.set(null);
    try {
      this.viaticos.set(await this.svc.obtenerViaticosInforme(this.idInforme()));
    } catch (e: unknown) {
      this.errorViaticos.set(e instanceof Error ? e.message : 'No se pudieron cargar los viáticos.');
    } finally {
      this.cargandoViaticos.set(false);
    }
  }

  async cambiarCategoriaHistorial(c: CategoriaHistorial): Promise<void> {
    if (this.categoriaHistorial() === c) return;
    this.categoriaHistorial.set(c);
    await this.cargarHistorial();
  }

  claseCategoriaHistorial(c: CategoriaHistorial | null): string {
    switch (c) {
      case 'edicion':       return 'ev__dot ev__dot--azul';
      case 'precotizacion': return 'ev__dot ev__dot--rojo';
      case 'revision':      return 'ev__dot ev__dot--verde';
      case 'sistema':       return 'ev__dot ev__dot--gris';
      default:              return 'ev__dot';
    }
  }

  readonly eventosHistorial = computed<EventoHistorialApi[]>(() => this.historialCompleto()?.eventos ?? []);
  readonly contadoresHistorial = computed(() => this.historialCompleto()?.contadores);
  cambiarFiltroMomento(m: MomentoFoto | 'TODOS'): void { this.filtroMomento.set(m); }

  // ─── Carga diferida de blobs — API pública del componente ───────────────

  /** Estado del archivo "miniatura" (imagen completa o cuadro estático del video). */
  estadoDe(idEvidencia: number): EstadoFoto {
    return this.estadoFotos()[idEvidencia] ?? { estado: 'pendiente' };
  }

  /** Estado del video MP4 (solo para evidencias donde `esVideo === true`). */
  estadoVideoDe(idEvidencia: number): EstadoFoto {
    return this.estadoVideos()[idEvidencia] ?? { estado: 'pendiente' };
  }

  /** SafeUrl para pintar en <img [src]="..."> cuando la foto ya cargó; null si todavía no. */
  safeUrlFoto(idEvidencia: number): SafeUrl | null {
    const e = this.estadoDe(idEvidencia);
    return e.estado === 'listo' ? e.safeUrl : null;
  }

  /** SafeUrl del MP4 completo para <video [src]="...">. */
  safeUrlVideo(idEvidencia: number): SafeUrl | null {
    const e = this.estadoVideoDe(idEvidencia);
    return e.estado === 'listo' ? e.safeUrl : null;
  }

  /**
   * Solicita el archivo de una evidencia. Idempotente: si ya está cargado/cargando/error, no hace nada.
   * Respeta el semáforo de MAX_CONCURRENTES y encola el resto.
   * Se llama desde (entra) de la directiva appEnViewport en cada tarjeta.
   */
  solicitarFoto(idEvidencia: number, cuadro = true): void {
    const estado = cuadro ? this.estadoDe(idEvidencia).estado : this.estadoVideoDe(idEvidencia).estado;
    if (estado !== 'pendiente') return;
    this.establecerEstado(idEvidencia, { estado: 'cargando' }, cuadro);
    if (this.activas < this.MAX_CONCURRENTES) this.ejecutarDescarga(idEvidencia, cuadro);
    else                                       this.cola.push({ idInforme: this.idInforme(), idEvidencia, cuadro });
  }

  private async ejecutarDescarga(idEvidencia: number, cuadro: boolean): Promise<void> {
    this.activas++;
    try {
      const blob = await this.svc.obtenerArchivoFoto(this.idInforme(), idEvidencia, cuadro);
      const mapa = cuadro ? this.estadoFotos() : this.estadoVideos();
      // Si el componente se destruyó entremedio, el estado ya se limpió: no sobrescribimos.
      if (!(idEvidencia in mapa)) return;
      const url = URL.createObjectURL(blob);
      const safeUrl = this.sanitizer.bypassSecurityTrustUrl(url);
      this.establecerEstado(idEvidencia, { estado: 'listo', url, safeUrl }, cuadro);
    } catch {
      this.establecerEstado(idEvidencia, { estado: 'error' }, cuadro);
    } finally {
      this.activas--;
      const sig = this.cola.shift();
      if (sig) void this.ejecutarDescarga(sig.idEvidencia, sig.cuadro);
    }
  }

  private establecerEstado(idEvidencia: number, nuevo: EstadoFoto, cuadro = true): void {
    const sig = cuadro ? this.estadoFotos : this.estadoVideos;
    sig.update(mapa => ({ ...mapa, [idEvidencia]: nuevo }));
  }

  // ─── Visor en grande (lightbox) ─────────────────────────────────────────

  abrirLightbox(f: FotoInformeApi): void {
    // La miniatura (cuadro=true) ya está pedida o en curso por appEnViewport de la galería.
    // Si es video, además pedimos el MP4 completo (cuadro=false) para <video controls> del visor.
    this.solicitarFoto(f.idEvidencia, true);
    if (f.esVideo) this.solicitarFoto(f.idEvidencia, false);
    this.lightbox.set(f);
  }

  cerrarLightbox(): void { this.lightbox.set(null); }

  onCerrar(): void { this.cerrar.emit(); }
  onEditar(): void {
    const c = this.cabecera();
    if (c?.puedeEditar) this.editar.emit(c.idInforme);
  }
  onAccionPrincipal(): void {
    const c = this.cabecera();
    if (!c) return;
    if (c.accionPrincipal === 'registrar_precotizacion') this.precotizar.emit(c.idInforme);
    else if (c.accionPrincipal === 'registrar_revision') this.revisar.emit(c.idInforme);
  }

  descargarPdf(): void {
    const url = this.cabecera()?.urlPdf;
    if (url) window.open(url, '_blank');
    else this.toast.info('Este informe no tiene PDF descargable aún.');
  }

  // ─── Helpers de UI ──────────────────────────────────────────────────────

  claseNivel(n: NivelObservacion | null): string {
    switch (n) {
      case 'critico': return 'chip chip--rojo';
      case 'alto':    return 'chip chip--rojo';
      case 'medio':   return 'chip chip--ambar';
      case 'bajo':    return 'chip chip--azul';
      default:        return 'chip chip--gris';
    }
  }
  labelNivel(n: NivelObservacion | null): string {
    switch (n) {
      case 'critico': return 'Crítico';
      case 'alto':    return 'Alto';
      case 'medio':   return 'Medio';
      case 'bajo':    return 'Bajo';
      default:        return '—';
    }
  }

  clasePrioridad(p: PrioridadRecomendacion | null): string {
    switch (p) {
      case 'alta':  return 'chip chip--rojo';
      case 'media': return 'chip chip--ambar';
      case 'baja':  return 'chip chip--azul';
      default:      return 'chip chip--gris';
    }
  }
  labelPrioridad(p: PrioridadRecomendacion | null): string {
    switch (p) {
      case 'alta':  return 'Alta';
      case 'media': return 'Media';
      case 'baja':  return 'Baja';
      default:      return '—';
    }
  }

  claseResultadoEnsayo(r: 'conforme' | 'no_conforme' | null): string {
    if (r === 'conforme')    return 'chip chip--verde';
    if (r === 'no_conforme') return 'chip chip--rojo';
    return 'chip chip--gris';
  }

  // Resumen de validaciones (semáforos del tab Resumen)
  chipFotos(c: CabeceraInformeApi): { clase: string, label: string } {
    if (c.nFotos === 0) return { clase: 'chip chip--gris', label: 'Sin fotos' };
    const ok = c.nFotosValidas === c.nFotos;
    return { clase: ok ? 'chip chip--verde' : 'chip chip--ambar', label: `${c.nFotosValidas} / ${c.nFotos} subidas` };
  }
  chipEnsayos(c: CabeceraInformeApi): { clase: string, label: string } {
    switch (c.estadoEnsayos) {
      case 'completos':   return { clase: 'chip chip--verde', label: 'Completos' };
      case 'incompletos': return { clase: 'chip chip--ambar', label: `Incompletos (${c.nEnsayosSinResultado} pend.)` };
      default:            return { clase: 'chip chip--gris',  label: 'Sin registro' };
    }
  }
  chipObservaciones(c: CabeceraInformeApi): { clase: string, label: string } {
    return c.nObservaciones === 0
      ? { clase: 'chip chip--gris', label: 'Ninguna' }
      : { clase: 'chip chip--rojo', label: `${c.nObservaciones} detectada${c.nObservaciones === 1 ? '' : 's'}` };
  }
  chipRecomendaciones(c: CabeceraInformeApi): { clase: string, label: string } {
    return c.nRecomendaciones === 0
      ? { clase: 'chip chip--gris', label: 'Ninguna' }
      : { clase: 'chip chip--azul', label: `${c.nRecomendaciones}` };
  }
  chipProcedimiento(c: CabeceraInformeApi): { clase: string, label: string } {
    const pct = c.porcentajeProcedimiento ?? 0;
    if (pct === 100) return { clase: 'chip chip--verde', label: '100% completado' };
    if (pct === 0)   return { clase: 'chip chip--gris',  label: 'Sin registro' };
    return { clase: 'chip chip--ambar', label: `${pct}% completado` };
  }

  /** Chip del Resumen de Validaciones para la fila "Rendición de viáticos" (HU-57). */
  chipViaticos(): { clase: string, label: string } {
    const v = this.viaticos();
    if (!v) return { clase: 'chip chip--gris', label: 'Click para ver' };
    const c = v.cierre;
    if (c && c.estado === 'cerrada') {
      const moneda = v.cabecera.moneda || 'PEN';
      switch (c.tipo) {
        case 'reembolso':  return { clase: 'chip chip--azul',  label: `Cerrada · Reembolso ${moneda} ${c.saldo.toFixed(2)}` };
        case 'devolucion': return { clase: 'chip chip--ambar', label: `Cerrada · Devolución ${moneda} ${Math.abs(c.saldo).toFixed(2)}` };
        case 'cuadrado':   return { clase: 'chip chip--verde', label: 'Cerrada · Cuadrado' };
      }
    }
    const n = v.resumen.nPorRevisar;
    return n > 0
      ? { clase: 'chip chip--ambar', label: `Abierta · ${n} gasto${n === 1 ? '' : 's'} por revisar` }
      : { clase: 'chip chip--ambar', label: 'Abierta' };
  }
}
