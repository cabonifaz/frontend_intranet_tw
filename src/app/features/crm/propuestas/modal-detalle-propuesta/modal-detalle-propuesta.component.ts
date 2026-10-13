import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import { CorreccionPropuesta } from '../../../../core/models/visto-bueno.model';
import {
  PropuestaDetalleModal,
  WorkflowPropuesta,
  VersionPropuesta,
  ActividadPropuesta,
  DocumentoVinculado,
} from '../../../../core/models/propuesta-modales.model';

type Tab =
  | 'resumen'
  | 'propuesta'     // Incluye Opcionales como subsección
  | 'detalle'       // Incluye Recomendaciones como subsección
  | 'forma_pago'
  | 'suministros_cliente'
  | 'condiciones'
  | 'listado_equipos'
  | 'versiones'
  | 'correccion';   // Solo visible si hay corrección pendiente

interface TabDef { id: Tab; label: string; }

/**
 * Mapeo área del catálogo AREA_CORRECCION_PROPUESTA → tab del modal detalle.
 * Los tabs del modal combinan algunas áreas (propuesta+opcionales, detalle+recomendaciones).
 */
const AREA_A_TAB: Record<string, Tab> = {
  configuracion:       'resumen',   // La configuración se refleja en Información General del Resumen
  propuesta:           'propuesta',
  opcionales:          'propuesta',
  detalle:             'detalle',
  recomendaciones:     'detalle',
  forma_pago:          'forma_pago',
  suministros_cliente: 'suministros_cliente',
  condiciones:         'condiciones',
  listado_equipos:     'listado_equipos',
};

interface GrupoTextos { titulo: string; vinetas: string[]; }

import { SiPermisoDirective } from '../../../../core/directives/si-permiso.directive';

@Component({
  selector: 'app-modal-detalle-propuesta',
  imports: [CommonModule, DatePipe, ButtonComponent, SiPermisoDirective],
  templateUrl: './modal-detalle-propuesta.component.html',
  styleUrl: './modal-detalle-propuesta.component.scss',
})
export class ModalDetallePropuestaComponent {
  private readonly router        = inject(Router);
  private readonly toast         = inject(ToastService);
  private readonly propuestasSvc = inject(PropuestasService);
  private readonly vbSvc         = inject(VistoBuenoService);

  readonly idPropuesta = input.required<number>();
  /** Si true, el modal se abre desde la Bandeja de Visto Bueno: oculta las acciones del
   *  comercial (Editar / Enviar VB / Anular / Nueva Versión) y muestra las del aprobador
   *  (Aprobar / Rechazar / Solicitar Corrección / Comparar Versiones). */
  readonly modoAprobador = input<boolean>(false);

  readonly cerrar      = output<void>();
  /** Se emite cuando el usuario pide abrir un modal relacionado con la propuesta. */
  readonly accion      = output<'enviar_vb' | 'anular' | 'nueva_version' | 'preview_pdf' | 'enviar_cliente' | 'solicitar_revocacion'>();
  /** Se emite con el idRequerimiento cuando el usuario pide "Abrir RQ". El padre swap-ea los modales. */
  readonly verRequerimiento = output<number>();
  /** Acciones del modo aprobador (HU-15). El padre maneja los modales de VB. */
  readonly accionAprobador = output<'aprobar' | 'rechazar' | 'solicitar_correccion' | 'comparar_versiones'>();
  /** El usuario hizo click en una versión distinta a la actual en el tab Versiones. El padre reemplaza el detalle. */
  readonly verVersion = output<number>();

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly datos    = signal<PropuestaDetalleModal | null>(null);
  readonly tab      = signal<Tab>('resumen');
  /** Última solicitud de corrección pendiente (null si no hay o ya está atendida). */
  readonly correccion = signal<CorreccionPropuesta | null>(null);

  /**
   * Tabs del detalle = las 9 secciones del wizard + Versiones + Corrección (si aplica).
   * Algunas secciones son opcionales (dependen de SeccionesActivas del back),
   * otras siempre se muestran (Resumen, Forma de Pago, Listado de Equipos,
   * Versiones). Si la propuesta se creó con 4-5 secciones, el resto se oculta.
   */
  readonly tabs = computed<TabDef[]>(() => {
    const activas = this.seccionesActivas();
    const resultado: TabDef[] = [
      { id: 'resumen', label: 'Resumen' },
    ];
    // Propuesta engloba también Opcionales (una sola pestaña con dos tablas).
    if (activas.has('propuesta') || activas.has('opcionales')) {
      resultado.push({ id: 'propuesta', label: 'Propuesta' });
    }
    // Detalle engloba también Recomendaciones (dos bloques dentro del mismo tab).
    if (activas.has('detalle') || activas.has('recomendaciones')) {
      resultado.push({ id: 'detalle', label: 'Detalle' });
    }
    resultado.push({ id: 'forma_pago', label: 'Forma de Pago' });
    if (activas.has('suministros_cliente')) resultado.push({ id: 'suministros_cliente', label: 'Suministros Cliente' });
    if (activas.has('condiciones'))         resultado.push({ id: 'condiciones',         label: 'Condiciones' });
    resultado.push({ id: 'listado_equipos', label: 'Listado de Equipos' });
    resultado.push({ id: 'versiones',       label: 'Versiones' });
    if (this.correccion()) resultado.push({ id: 'correccion', label: 'Corrección' });
    return resultado;
  });

  /** Tabs que tienen al menos un área marcada en la corrección pendiente. */
  readonly tabsConCorreccion = computed<Set<Tab>>(() => {
    const c = this.correccion();
    if (!c?.areas?.length) return new Set();
    const s = new Set<Tab>();
    for (const a of c.areas) {
      const tab = AREA_A_TAB[a.codigo];
      if (tab) s.add(tab);
    }
    return s;
  });

  tabTieneCorreccion(id: Tab): boolean { return this.tabsConCorreccion().has(id); }

  /** Devuelve el texto de observación si el tab tiene corrección, null si no. */
  observacionTab(id: Tab): string | null {
    return this.tabTieneCorreccion(id) ? (this.correccion()?.observaciones ?? null) : null;
  }

  /** Tooltip del chip de corrección en el header: resume áreas, observación y fecha límite. */
  tooltipCorreccion(): string {
    const c = this.correccion();
    if (!c) return '';
    const partes = [`Áreas: ${c.areas?.map(a => a.etiqueta).join(', ') || '—'}`];
    if (c.observaciones) partes.push(c.observaciones);
    if (c.fechaLimite) {
      const d = new Date(c.fechaLimite);
      partes.push(`Límite: ${d.toLocaleString('es-PE')}${c.vencida ? ' (VENCIDA)' : ''}`);
    }
    return partes.join('\n');
  }

  tieneOpcionales(): boolean      { return this.seccionesActivas().has('opcionales'); }
  tieneRecomendaciones(): boolean { return this.seccionesActivas().has('recomendaciones'); }

  /** Set con las secciones activas del back para lookup O(1). */
  readonly seccionesActivas = computed<Set<string>>(() => {
    const p: any = this.datos()?.propuesta;
    return new Set<string>(p?.seccionesActivas ?? []);
  });

  // ─── Resumen económico (reactivo al cambio del detalle) ────────────────────
  readonly resumenEconomico = computed(() => {
    const p: any = this.datos()?.propuesta;
    if (!p) return { subtotal: 0, descuento: 0, igv: 0, total: 0, igvPct: 0, moneda: 'S/' };
    return {
      subtotal:  Number(p.subtotal ?? 0),
      descuento: Number(p.descuentoTotal ?? p.descuento ?? 0),
      igv:       Number(p.igv ?? 0),
      total:     Number(p.total ?? 0),
      igvPct:    Number(p.igvPct ?? 18),
      moneda:    p.monedaSimbolo ?? (p.moneda === 'USD' ? 'US$' : 'S/'),
    };
  });

  // ─── Workflow con layout del prototipo (6 pasos horizontales) ─────────────
  readonly workflowPasos = computed(() => this.datos()?.workflow.pasos ?? []);

  // ─── Items separados por sección (principal / opcional) ───────────────────
  readonly itemsPrincipales = computed(() =>
    ((this.datos()?.propuesta as any)?.items ?? []).filter((i: any) => i.seccion === 'principal')
  );
  readonly itemsOpcionales = computed(() =>
    ((this.datos()?.propuesta as any)?.items ?? []).filter((i: any) => i.seccion === 'opcional')
  );

  // ─── Textos agrupados por sección (los 4 bloques de texto) ─────────────────
  readonly textosDetalle            = computed(() => this.agruparTextos('detalle'));
  readonly textosRecomendaciones    = computed(() => this.agruparTextos('recomendaciones'));
  readonly textosSuministrosCliente = computed(() => this.agruparTextos('suministros_cliente'));
  readonly textosCondiciones        = computed(() => this.agruparTextos('condiciones'));

  readonly formasPago = computed<any[]>(() => (this.datos()?.propuesta as any)?.formasPago ?? []);
  readonly equipos    = computed<any[]>(() => (this.datos()?.propuesta as any)?.equipos ?? []);

  private agruparTextos(seccion: string): GrupoTextos[] {
    const textos: any[] = (this.datos()?.propuesta as any)?.textos ?? [];
    const filtrados = textos.filter(t => t.seccion === seccion).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const grupos: GrupoTextos[] = [];
    let actual: GrupoTextos | null = null;
    for (const t of filtrados) {
      if (t.tipo === 'titulo') {
        actual = { titulo: t.texto ?? '', vinetas: [] };
        grupos.push(actual);
      } else {
        if (!actual) {
          actual = { titulo: '', vinetas: [] };
          grupos.push(actual);
        }
        actual.vinetas.push(t.texto ?? '');
      }
    }
    return grupos;
  }

  constructor() {
    // Recarga el detalle cada vez que cambia idPropuesta (incluido saltos entre versiones
    // desde el tab Versiones sin cerrar el modal).
    effect(() => {
      const id = this.idPropuesta();
      if (id <= 0) return;
      void this.cargarDetalle(id);
    });
  }

  private async cargarDetalle(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.datos.set(null);
    this.correccion.set(null);
    this.tab.set('resumen');
    try {
      const [detalle, corr] = await Promise.all([
        this.propuestasSvc.obtenerDetalleModal(id),
        this.vbSvc.obtenerCorreccion(id).catch(() => null),
      ]);
      this.datos.set(detalle);
      // Solo mostramos el banner si la corrección sigue pendiente (no atendida).
      this.correccion.set(corr && corr.estado === 'pendiente' ? corr : null);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar la propuesta.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: Tab): void { this.tab.set(t); }

  onCerrar(): void { this.cerrar.emit(); }

  irAEditar(): void {
    this.onCerrar();
    this.router.navigate(['/crm/propuestas', this.idPropuesta(), 'editar', 'propuesta']);
  }

  abrirRequerimiento(): void {
    const id = (this.datos()?.propuesta as any)?.idRequerimiento;
    if (!id) { this.toast.info('No hay requerimiento vinculado.'); return; }
    this.verRequerimiento.emit(id);
  }

  abrirExpediente(): void {
    const exp = this.datos()?.documentos.find(d => d.tipo === 'expediente');
    if (!exp?.codigo) { this.toast.info('Aún no se generó el expediente.'); return; }
    this.toast.info(`Expediente ${exp.codigo} — vista pendiente (otro módulo).`);
  }

  accionPrincipal(): void {
    const acc = this.datos()?.acciones;
    if (!acc) return;
    if (acc.accionPrincipal === 'editar')         this.irAEditar();
    else if (acc.accionPrincipal === 'nueva_version') this.accion.emit('nueva_version');
    else this.toast.info('Esta propuesta no admite edición directa.');
  }

  pedirEnviarVB():         void { this.accion.emit('enviar_vb'); }
  pedirAnular():           void { this.accion.emit('anular'); }
  pedirPreviewPdf():       void { this.accion.emit('preview_pdf'); }
  pedirEnviarCliente():    void { this.accion.emit('enviar_cliente'); }
  pedirSolicitarRevocacion(): void { this.accion.emit('solicitar_revocacion'); }

  esAprobado(): boolean {
    return (this.datos()?.propuesta?.estado || '').toLowerCase() === 'aprobado';
  }

  esPendienteRevocacion(): boolean {
    return (this.datos()?.propuesta?.estado || '').toLowerCase() === 'pendiente_revocacion';
  }

  irAVersion(v: VersionPropuesta): void {
    if (v.esActual || v.idPropuesta === this.idPropuesta()) return;
    this.verVersion.emit(v.idPropuesta);
  }

  // ─── Helpers de render ─────────────────────────────────────────────────────
  formatearSla(): string {
    const sla = this.datos()?.sla;
    if (!sla) {
      // El back solo emite SLA en etapas 'visto_bueno' (pendiente de VB) y
      // 'vigencia' (enviada). Si no hay SLA, se muestra el estado del flujo.
      const estado = (this.datos()?.propuesta?.estado || '').toLowerCase();
      if (estado === 'borrador') return 'En borrador';
      if (estado.includes('acepta') || estado.includes('rechaz') || estado.includes('anul')) return 'Finalizado';
      return 'No aplica';
    }
    const min = sla.minutosRestantes;
    if (sla.vencido) return 'Vencido';
    const horas = Math.floor(min / 60);
    const dias  = Math.floor(horas / 24);
    if (dias   >= 1) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
    if (horas  >= 1) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    return `${min} min`;
  }

  iconoDocumento(d: DocumentoVinculado): string {
    switch (d.tipo) {
      case 'requerimiento': return 'description';
      case 'expediente':    return 'folder_open';
      case 'orden_compra':  return 'receipt_long';
      case 'adjunto':       return 'attach_file';
      default:              return 'insert_drive_file';
    }
  }

  estadoClase(estado: string): string {
    const e = estado.toLowerCase();
    if (e.includes('aprob') || e.includes('acepta')) return 'estado--verde';
    if (e.includes('rechaz'))                        return 'estado--rojo';
    if (e.includes('anul'))                          return 'estado--gris';
    if (e.includes('vencid'))                        return 'estado--rojo';
    if (e.includes('devuel') || e.includes('correc')) return 'estado--amber';
    if (e.includes('pendient'))                      return 'estado--amber';
    if (e.includes('enviad') || e.includes('seguim')) return 'estado--azul';
    if (e.includes('borrad'))                        return 'estado--gris-claro';
    return 'estado--gris-claro';
  }
}
