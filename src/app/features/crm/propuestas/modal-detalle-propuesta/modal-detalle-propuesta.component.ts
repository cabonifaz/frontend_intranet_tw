import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { PropuestasService } from '../../../../core/services/propuestas.service';
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
  | 'versiones';

interface TabDef { id: Tab; label: string; }

interface GrupoTextos { titulo: string; vinetas: string[]; }

@Component({
  selector: 'app-modal-detalle-propuesta',
  imports: [CommonModule, DatePipe, ButtonComponent],
  templateUrl: './modal-detalle-propuesta.component.html',
  styleUrl: './modal-detalle-propuesta.component.scss',
})
export class ModalDetallePropuestaComponent {
  private readonly router        = inject(Router);
  private readonly toast         = inject(ToastService);
  private readonly propuestasSvc = inject(PropuestasService);

  readonly idPropuesta = input.required<number>();
  /** Si true, el modal se abre desde la Bandeja de Visto Bueno: oculta las acciones del
   *  comercial (Editar / Enviar VB / Anular / Nueva Versión) y muestra las del aprobador
   *  (Aprobar / Rechazar / Solicitar Corrección / Reasignar / Comparar Versiones). */
  readonly modoAprobador = input<boolean>(false);

  readonly cerrar      = output<void>();
  /** Se emite cuando el usuario pide abrir el modal "Enviar a VB" / "Anular" / "Nueva Versión" / "Preview PDF". */
  readonly accion      = output<'enviar_vb' | 'anular' | 'nueva_version' | 'preview_pdf'>();
  /** Se emite con el idRequerimiento cuando el usuario pide "Abrir RQ". El padre swap-ea los modales. */
  readonly verRequerimiento = output<number>();
  /** Acciones del modo aprobador (HU-15 / HU-16). El padre maneja los modales de VB. */
  readonly accionAprobador = output<'aprobar' | 'rechazar' | 'solicitar_correccion' | 'reasignar' | 'comparar_versiones'>();

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly datos    = signal<PropuestaDetalleModal | null>(null);
  readonly tab      = signal<Tab>('resumen');

  /**
   * Tabs del detalle = las 9 secciones del wizard + Versiones.
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
    return resultado;
  });

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

  async ngOnInit(): Promise<void> {
    try {
      const r = await this.propuestasSvc.obtenerDetalleModal(this.idPropuesta());
      this.datos.set(r);
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

  pedirEnviarVB():   void { this.accion.emit('enviar_vb'); }
  pedirAnular():     void { this.accion.emit('anular'); }
  pedirPreviewPdf(): void { this.accion.emit('preview_pdf'); }

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
    if (e.includes('acepta'))  return 'estado--verde';
    if (e.includes('rechaz'))  return 'estado--rojo';
    if (e.includes('vencid') || e.includes('anul'))  return 'estado--gris';
    if (e.includes('seguim'))  return 'estado--azul';
    if (e.includes('borrad'))  return 'estado--gris-claro';
    return 'estado--amber';
  }
}
