import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TabsComponent, Tab } from '../../../../shared/ui/tabs/tabs.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { TimelineEventosComponent, EventoTimeline } from '../../../../shared/ui/timeline-eventos/timeline-eventos.component';
import { ToastService } from '../../../../core/services/toast.service';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { SafeUrlPipe } from '../../../../shared/pipes/safe-url.pipe';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import {
  DetalleOrdenCompraDto,
  PropuestaVinculadaOcDto,
  TimelineOrdenCompraDto,
  ValidacionOrdenCompraDto,
} from '../../../../core/models/ordenes-compra.model';

type TabInterno = 'resumen' | 'propuestas' | 'validacion' | 'timeline' | 'documento';
type FiltroValidacion = 'todas' | 'discrepancias' | 'coincidentes';
type FiltroTimeline   = 'todos' | 'validacion_ia' | 'comercial' | 'documental';

@Component({
  selector: 'app-modal-detalle-oc',
  imports: [
    CommonModule, FormsModule, ModalComponent, ButtonComponent,
    TabsComponent, SeccionComponent, TimelineEventosComponent,
    MonedaPipe, SafeUrlPipe,
  ],
  templateUrl: './modal-detalle-oc.component.html',
  styleUrl: './modal-detalle-oc.component.scss',
})
export class ModalDetalleOcComponent {
  readonly svc            = inject(OrdenesCompraService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  readonly idOc   = input.required<number>();
  readonly cerrar = output<void>();
  readonly accion = output<'editar' | 'anular'>();

  readonly cargando          = signal(true);
  readonly cargandoTimeline  = signal(false);
  readonly cargandoValidacion = signal(false);
  readonly detalle           = signal<DetalleOrdenCompraDto | null>(null);
  readonly timeline          = signal<TimelineOrdenCompraDto | null>(null);
  readonly validacion        = signal<ValidacionOrdenCompraDto | null>(null);
  readonly tab               = signal<TabInterno>('resumen');

  readonly idPropuestaSeleccionada = signal<number | null>(null);
  readonly filtroValidacion = signal<FiltroValidacion>('todas');
  readonly filtroTimeline   = signal<FiltroTimeline>('todos');
  readonly busquedaTimeline = signal<string>('');

  readonly cabecera    = computed(() => this.detalle()?.cabecera ?? null);
  readonly propuestas  = computed(() => this.detalle()?.propuestas ?? []);
  readonly diferencias = computed(() => this.detalle()?.diferencias ?? []);

  readonly propuestaActual = computed<PropuestaVinculadaOcDto | null>(() => {
    const props = this.propuestas();
    const id = this.idPropuestaSeleccionada();
    if (props.length === 0) return null;
    return props.find(p => p.idPropuesta === id) ?? props[0];
  });

  readonly subtituloModal = computed<string | null>(() => {
    const c = this.cabecera();
    if (!c) return null;
    const partes: string[] = [];
    if (c.razonSocial)   partes.push(c.razonSocial);
    if (c.fechaRegistro) partes.push(`Registrada el ${this.formatearFechaCorta(c.fechaRegistro)}`);
    if (c.registradoPor) partes.push(`por ${c.registradoPor}`);
    return partes.length > 0 ? partes.join(' · ') : null;
  });

  private formatearFechaCorta(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  readonly estadoChip = computed(() => {
    const estado = this.cabecera()?.estadoVisual ?? this.cabecera()?.estado ?? '';
    const map: Record<string, { clase: string; label: string }> = {
      autogenerada:         { clase: 'badge--morado', label: 'Autogenerada' },
      validada:             { clase: 'badge--verde',  label: 'Validada' },
      validada_parcial:     { clase: 'badge--verde',  label: 'Validada parcial' },
      observada:            { clase: 'badge--ambar',  label: 'Observada' },
      pendiente_reemplazo:  { clase: 'badge--rojo',   label: 'Pendiente Reemplazo' },
      anulada:              { clase: 'badge--gris',   label: 'Anulada' },
      // Fallbacks temporales mientras el back no actualice los nombres
      recibida:             { clase: 'badge--ambar',  label: 'Recibida' },
      reemplazada:          { clase: 'badge--gris',   label: 'Reemplazada' },
    };
    return map[estado] ?? { clase: 'badge--gris', label: estado };
  });

  /** Devuelve el total de alertas (críticas + advertencias). Útil para el badge del tab. */
  readonly totalAlertas = computed(() => {
    const c = this.cabecera();
    if (!c) return 0;
    return (c.alertasIa ?? 0);
  });

  /** % de asignación (0-100). */
  readonly asignadoPct = computed(() => {
    const c = this.cabecera();
    if (!c) return 0;
    return Math.round((c.asignadoPct ?? 0));
  });

  /** Campos renderizables de la OC con sus etiquetas. */
  readonly camposInfo = computed(() => {
    const c = this.cabecera();
    if (!c) return [] as { codigo: string; etiqueta: string; valor: string; origen: 'ia' | 'manual' | 'ninguno' }[];
    const manual = new Set(c.camposManuales.map(m => m.campo));
    const iaDict = c.camposIa ?? {};
    const campos: { codigo: string; etiqueta: string; valor: string }[] = [
      { codigo: 'numero_oc',         etiqueta: 'N° Orden de Compra', valor: c.numeroOc },
      { codigo: 'fecha_emision',     etiqueta: 'Fecha Emisión',       valor: c.fechaOc ?? '—' },
      { codigo: 'fecha_recepcion',   etiqueta: 'Fecha Recepción',     valor: c.fechaRecepcion ?? '—' },
      { codigo: 'id_moneda',         etiqueta: 'Moneda',              valor: c.moneda ?? c.monedaSimbolo ?? '—' },
      { codigo: 'id_condicion_pago', etiqueta: 'Forma de Pago',       valor: c.condicionPago ?? c.formaPago ?? '—' },
      { codigo: 'igv_pct',           etiqueta: 'Impuesto de Ley (IGV)', valor: c.igvIncluido === true ? `Incluido (${c.igvPct ?? 18}%)` : (c.igvPct != null ? `${c.igvPct}%` : '—') },
    ];
    return campos.map(f => {
      const vieneDeIa = f.codigo in iaDict;
      const corregido = manual.has(f.codigo);
      const origen: 'ia' | 'manual' | 'ninguno' = corregido ? 'manual' : (vieneDeIa ? 'ia' : 'ninguno');
      return { ...f, origen };
    });
  });

  /** Diferencias filtradas por severidad para el tab Validación IA. */
  readonly diferenciasFiltradas = computed(() => {
    const difs = this.diferencias();
    const filtro = this.filtroValidacion();
    if (filtro === 'todas')         return difs;
    if (filtro === 'coincidentes')  return difs.filter(d => d.severidad === 'ok');
    return difs.filter(d => d.severidad !== 'ok');
  });

  readonly conteoTodas         = computed(() => this.diferencias().length);
  readonly conteoDiscrepancias = computed(() => this.diferencias().filter(d => d.severidad !== 'ok').length);
  readonly conteoCoincidentes  = computed(() => this.diferencias().filter(d => d.severidad === 'ok').length);

  /** Eventos filtrados del timeline por categoría + búsqueda. */
  readonly eventosFiltrados = computed(() => {
    const eventos = this.timeline()?.eventos ?? [];
    const cat = this.filtroTimeline();
    const q   = this.busquedaTimeline().trim().toLowerCase();
    return eventos.filter(e => {
      const matchCat = cat === 'todos' || e.categoria === cat;
      const matchQ   = !q || e.titulo.toLowerCase().includes(q)
                       || (e.descripcion ?? '').toLowerCase().includes(q)
                       || (e.usuario    ?? '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  });

  readonly conteoTimeline = computed(() => {
    const eventos = this.timeline()?.eventos ?? [];
    return {
      todos:         eventos.length,
      validacion_ia: eventos.filter(e => e.categoria === 'validacion_ia').length,
      comercial:     eventos.filter(e => e.categoria === 'comercial').length,
      documental:    eventos.filter(e => e.categoria === 'documental').length,
    };
  });

  readonly esValidadaParcial = computed(() => (this.cabecera()?.estadoVisual ?? this.cabecera()?.estado) === 'validada_parcial');

  /** Tabs del detalle: resumen · propuestas · validación · timeline · documento. */
  readonly tabsArr = computed<Tab[]>(() => {
    const c = this.cabecera();
    const n = c?.propuestasVinculadas ?? 0;
    const alertas = this.totalAlertas();
    return [
      { codigo: 'resumen',    label: 'Resumen' },
      { codigo: 'propuestas', label: n > 0 ? `Propuestas Vinculadas (${n})` : 'Propuestas Vinculadas' },
      { codigo: 'validacion', label: alertas > 0 ? `Validación IA (${alertas} alertas)` : 'Validación IA', alerta: alertas > 0 },
      { codigo: 'timeline',   label: 'Timeline' },
      { codigo: 'documento',  label: 'Documento' },
    ];
  });

  /** Eventos del timeline mapeados al formato de `app-timeline-eventos`. */
  readonly eventosTimeline = computed<EventoTimeline[]>(() =>
    this.eventosFiltrados().map(e => ({
      fecha:       e.fecha,
      titulo:      e.titulo,
      descripcion: e.descripcion,
      usuario:     e.usuario ?? (e.automaticoIa ? 'Sistema IA Automático' : null),
      contexto:    e.area,
      icono:       this.iconoEvento(e.categoria),
      nivel:       this.nivelTimeline(e.nivel),
    })),
  );

  private nivelTimeline(nivel: string): 'azul' | 'verde' | 'ambar' | 'rojo' {
    const map: Record<string, 'azul' | 'verde' | 'ambar' | 'rojo'> = {
      exito:   'verde', info: 'azul', alerta: 'ambar', critico: 'rojo', neutro: 'azul',
    };
    return map[nivel] ?? 'azul';
  }

  constructor() {
    effect(() => {
      const id = this.idOc();
      if (id > 0) void this.cargar(id);
    });
  }

  onCerrar(): void { this.cerrar.emit(); }

  async cambiarTab(t: string): Promise<void> {
    this.tab.set(t as TabInterno);
    if (t === 'timeline' && !this.timeline())     await this.cargarTimeline();
    if (t === 'validacion' && !this.validacion()) await this.cargarValidacion();
  }

  seleccionarPropuesta(idPropuesta: number): void { this.idPropuestaSeleccionada.set(idPropuesta); }

  editar(): void { this.accion.emit('editar'); }
  anular(): void { this.accion.emit('anular'); }

  /**
   * "Reemplazar documento" — mismo flujo que reemplazarAuto() pero para OCs observadas / con críticas.
   * Navega a la ficha de registro con ?reemplazar=X para subir el nuevo PDF y re-validar con IA.
   */
  irAReemplazarDocumento(): void {
    const c = this.cabecera();
    if (!c) return;
    const propOrigen = this.propuestas()[0];
    if (!propOrigen) {
      this.toast.error('No se encontró la propuesta de origen.');
      return;
    }
    this.cerrar.emit();
    void this.router.navigate(['/crm/ordenes-compra/nueva', propOrigen.idPropuesta], {
      queryParams: { reemplazar: c.idOc },
    });
  }

  /** Reemplazar OC autogenerada por la OC real del cliente → navega al flujo "nueva" con ?reemplazar=X */
  reemplazarAuto(): void {
    const c = this.cabecera();
    if (!c?.esAutogenerada) return;
    const propOrigen = this.propuestas()[0];
    if (!propOrigen) {
      this.toast.error('No se encontró la propuesta de origen.');
      return;
    }
    this.cerrar.emit();
    void this.router.navigate(
      ['/crm/ordenes-compra/nueva', propOrigen.idPropuesta],
      { queryParams: { reemplazar: c.idOc } },
    );
  }

  /** Navega a la propuesta vinculada (la primera o la seleccionada). */
  abrirPropuesta(): void {
    const prop = this.propuestaActual() ?? this.propuestas()[0];
    if (!prop) return;
    this.cerrar.emit();
    void this.router.navigate(['/crm/propuestas'], { queryParams: { verDetalle: prop.idPropuesta } });
  }

  /** Navega a la ficha del cliente (maestro). */
  abrirFichaCliente(idCliente: number): void {
    if (!idCliente) return;
    this.cerrar.emit();
    void this.router.navigate(['/maestros/clientes', idCliente]);
  }

  async verPdf(): Promise<void> {
    try { await this.svc.abrirPdfEnPestana(this.idOc()); }
    catch (e: unknown) { this.toast.error(e instanceof Error ? e.message : 'No se pudo abrir el PDF.'); }
  }

  async descargarPdf(): Promise<void> {
    const c = this.cabecera();
    if (!c) return;
    try { await this.svc.descargarPdf(this.idOc(), c.nombreArchivoPdf ?? `OC_${c.numeroOc}.pdf`); }
    catch (e: unknown) { this.toast.error(e instanceof Error ? e.message : 'No se pudo descargar el PDF.'); }
  }

  async descargarAuditoria(): Promise<void> {
    const c = this.cabecera();
    if (!c) return;
    try { await this.svc.descargarTimelineXlsx(this.idOc(), c.numeroOc); }
    catch (e: unknown) { this.toast.error(e instanceof Error ? e.message : 'No se pudo descargar la auditoría.'); }
  }

  async revalidar(): Promise<void> {
    try {
      await this.svc.revalidar(this.idOc(), this.idPropuestaSeleccionada());
      this.toast.exito('Revalidación ejecutada.');
      await this.cargar(this.idOc());
      if (this.tab() === 'validacion') await this.cargarValidacion();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo revalidar.');
    }
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    try {
      const d = await this.svc.obtenerDetalle(id);
      this.detalle.set(d);
      this.tab.set('resumen');
      this.timeline.set(null);
      this.validacion.set(null);
      if (d.propuestas.length > 0) {
        this.idPropuestaSeleccionada.set(d.propuestas[0].idPropuesta);
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el detalle.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarTimeline(): Promise<void> {
    this.cargandoTimeline.set(true);
    try {
      const t = await this.svc.obtenerTimeline(this.idOc());
      this.timeline.set(t);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el timeline.');
    } finally {
      this.cargandoTimeline.set(false);
    }
  }

  private async cargarValidacion(): Promise<void> {
    this.cargandoValidacion.set(true);
    try {
      const v = await this.svc.obtenerValidacion(this.idOc(), this.idPropuestaSeleccionada());
      this.validacion.set(v);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la validación IA.');
    } finally {
      this.cargandoValidacion.set(false);
    }
  }

  colorEvento(nivel: string): string {
    return ({ exito: 'verde', alerta: 'ambar', critico: 'rojo', info: 'azul', neutro: 'gris' } as Record<string, string>)[nivel] ?? 'gris';
  }

  iconoEvento(categoria: string): string {
    return ({ validacion_ia: 'auto_awesome', comercial: 'badge', documental: 'description' } as Record<string, string>)[categoria] ?? 'event';
  }

  claseSeveridad(sev: string): string {
    return ({ ok: 'sev--ok', advertencia: 'sev--adv', critico: 'sev--crit', sin_dato: 'sev--neutro' } as Record<string, string>)[sev] ?? 'sev--neutro';
  }

  labelSeveridad(sev: string): string {
    return ({ ok: 'Coincidencia', advertencia: 'Diferencia menor', critico: 'Observación crítica', sin_dato: 'Sin dato' } as Record<string, string>)[sev] ?? sev;
  }
}
