import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import {
  AuditoriaOrdenCompraDto,
  DetalleOrdenCompraDto,
  DocumentosOrdenCompraDto,
  EventoTimelineAuditoriaDto,
  VersionDocumentoOrdenCompraDto,
  VinculacionOrdenCompraDto,
} from '../../../../core/models/ordenes-compra.model';
import { TimelineEventosComponent, EventoTimeline } from '../../../../shared/ui/timeline-eventos/timeline-eventos.component';

type Tab = 'resumen' | 'aplicaciones' | 'documentos' | 'validaciones' | 'workflow' | 'historial';

@Component({
  selector: 'app-modal-detalle-oc',
  imports: [CommonModule, FormsModule, DatePipe, ButtonComponent, ModalComponent, TimelineEventosComponent],
  templateUrl: './modal-detalle-oc.component.html',
  styleUrl: './modal-detalle-oc.component.scss',
})
export class ModalDetalleOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc   = input.required<number>();
  readonly cerrar = output<void>();
  readonly accion = output<'editar' | 'validar' | 'observar' | 'liberar' | 'distribuir' | 'complementaria'>();

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly datos    = signal<DetalleOrdenCompraDto | null>(null);
  readonly tab      = signal<Tab>('resumen');

  // Tab Documentos
  readonly docs            = signal<DocumentosOrdenCompraDto | null>(null);
  readonly cargandoDocs    = signal(false);
  readonly reemplazando    = signal(false);
  readonly guardandoDoc    = signal(false);
  nuevoArchivo: File | null = null;
  nuevoNombre = '';
  motivoReemplazo = '';

  // Tab Historial
  readonly auditoria       = signal<AuditoriaOrdenCompraDto | null>(null);
  readonly cargandoAudit   = signal(false);

  readonly checklistOk = computed(() => {
    const d = this.datos();
    return d ? d.checklist.every(c => c.cumple) : false;
  });

  constructor() {
    effect(() => {
      const id = this.idOc();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.datos.set(null);
    this.docs.set(null);
    this.auditoria.set(null);
    this.cancelarReemplazo();
    this.tab.set('resumen');
    try {
      const d = await this.svc.obtenerDetalle(id);
      this.datos.set(d);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el detalle de la OC.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarTab(t: Tab): Promise<void> {
    this.tab.set(t);
    if (t === 'documentos' && !this.docs()) await this.cargarDocumentos();
    if (t === 'historial'  && !this.auditoria()) await this.cargarAuditoria();
  }
  onCerrar(): void { this.cerrar.emit(); }

  editar(): void   { this.accion.emit('editar'); }
  validar(): void  { this.accion.emit('validar'); }
  observar(): void { this.accion.emit('observar'); }
  liberarParaProgramacion(): void { this.accion.emit('liberar'); }
  distribuir(): void            { this.accion.emit('distribuir'); }
  registrarComplementaria(): void { this.accion.emit('complementaria'); }

  // ─── Tab Documentos ──────────────────────────────────────────
  private async cargarDocumentos(): Promise<void> {
    this.cargandoDocs.set(true);
    try {
      this.docs.set(await this.svc.obtenerDocumentos(this.idOc()));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar documentos.');
    } finally {
      this.cargandoDocs.set(false);
    }
  }

  abrirReemplazo(): void { this.reemplazando.set(true); }
  cancelarReemplazo(): void {
    this.reemplazando.set(false);
    this.nuevoArchivo = null;
    this.nuevoNombre = '';
    this.motivoReemplazo = '';
  }

  onArchivoSeleccionado(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      this.toast.error('Solo se admite PDF.');
      return;
    }
    this.nuevoArchivo = file;
    this.nuevoNombre = file.name;
  }

  async guardarNuevaVersion(): Promise<void> {
    if (!this.nuevoArchivo || !this.motivoReemplazo.trim()) {
      this.toast.error('Adjunta el archivo e indica el motivo del reemplazo.');
      return;
    }
    this.guardandoDoc.set(true);
    try {
      await this.svc.reemplazarDocumento(this.idOc(), this.motivoReemplazo.trim(), this.nuevoArchivo);
      this.toast.exito('Nueva versión registrada.');
      await this.cargarDocumentos();
      this.cancelarReemplazo();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo subir la nueva versión.');
    } finally {
      this.guardandoDoc.set(false);
    }
  }

  async verVersion(v: VersionDocumentoOrdenCompraDto): Promise<void> {
    try {
      await this.svc.abrirPdfEnPestana(this.idOc(), v.idDocumento);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo abrir el PDF.');
    }
  }

  async descargarVersion(v: VersionDocumentoOrdenCompraDto): Promise<void> {
    try {
      await this.svc.descargarPdf(this.idOc(), v.nombreArchivo, v.idDocumento);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo descargar el PDF.');
    }
  }

  // ─── Tab Historial ───────────────────────────────────────────
  private async cargarAuditoria(): Promise<void> {
    this.cargandoAudit.set(true);
    try {
      this.auditoria.set(await this.svc.obtenerAuditoria(this.idOc()));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar la auditoría.');
    } finally {
      this.cargandoAudit.set(false);
    }
  }

  async descargarXlsx(): Promise<void> {
    try {
      await this.svc.descargarAuditoriaXlsx(this.idOc(), this.datos()?.resumen.numeroOc ?? 'oc');
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo descargar la auditoría.');
    }
  }

  get timelineUi(): EventoTimeline[] {
    const a = this.auditoria();
    if (!a) return [];
    return a.timeline.map(ev => ({
      fecha: ev.fecha,
      titulo: ev.titulo,
      descripcion: ev.descripcion,
      usuario: ev.usuario,
      contexto: ev.area,
      icono: this.iconoEvento(ev.codigo),
      nivel: this.nivelDe(ev.nivel),
    }));
  }

  private nivelDe(n: string): 'azul' | 'verde' | 'ambar' | 'rojo' {
    switch (n) {
      case 'exito':  return 'verde';
      case 'alerta': return 'ambar';
      case 'error':  return 'rojo';
      default:       return 'azul';
    }
  }

  iconoEvento(codigo: string): string {
    if (codigo.includes('creada') || codigo.includes('registro')) return 'add_circle';
    if (codigo.includes('editada') || codigo.includes('edicion')) return 'edit';
    if (codigo.includes('documento') || codigo.includes('pdf'))   return 'autorenew';
    if (codigo.includes('observada') || codigo.includes('observ')) return 'flag';
    if (codigo.includes('validada') || codigo.includes('valid'))  return 'verified';
    if (codigo.includes('liberada') || codigo.includes('liber'))  return 'rocket_launch';
    if (codigo.includes('anulada'))                                return 'cancel';
    if (codigo.includes('complementaria'))                         return 'add_to_queue';
    if (codigo.includes('distribu'))                               return 'account_tree';
    return 'history';
  }

  claseEvento(nivel: string): string {
    switch (nivel) {
      case 'exito':      return 'ev--verde';
      case 'alerta':     return 'ev--ambar';
      case 'documento':  return 'ev--azul';
      case 'neutro':     return 'ev--azul';
      case 'info':
      default:           return 'ev--azul';
    }
  }

  trackEvento = (_: number, e: EventoTimelineAuditoriaDto) => `${e.fecha}-${e.codigo}`;
  abrirPropuesta(id: number | null | undefined): void {
    if (!id) return;
    this.toast.info(`Abrir propuesta ${id} — pendiente de navegación.`);
  }
  abrirExpediente(id: number | null | undefined): void {
    if (!id) return;
    this.toast.info(`Abrir expediente ${id} — Módulo 7.`);
  }

  formatearMonto(monto: number | null | undefined, simbolo?: string | null): string {
    if (monto == null) return '—';
    const s = simbolo ?? 'S/';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`;
  }

  estadoChip(estado: string): { clase: string; label: string } {
    const mapa: Record<string, { clase: string; label: string }> = {
      pendiente_validacion: { clase: 'chip-estado chip-estado--ambar', label: 'Pend. Validar' },
      validada:             { clase: 'chip-estado chip-estado--verde', label: 'Validada' },
      validada_parcial:     { clase: 'chip-estado chip-estado--verde', label: 'Validada (parcial)' },
      vigente:              { clase: 'chip-estado chip-estado--verde', label: 'Validada' },
      liberada:             { clase: 'chip-estado chip-estado--azul',  label: 'Liberada' },
      observada:            { clase: 'chip-estado chip-estado--rojo',  label: 'Observada' },
      bloqueada:            { clase: 'chip-estado chip-estado--rojo',  label: 'Bloqueada' },
      vencida:              { clase: 'chip-estado chip-estado--rojo',  label: 'Vencida' },
      anulada:              { clase: 'chip-estado chip-estado--gris',  label: 'Anulada' },
    };
    return mapa[estado] ?? { clase: 'chip-estado chip-estado--gris', label: estado };
  }

  coberturaChip(codigo: string): { clase: string; label: string } {
    const mapa: Record<string, { clase: string; label: string }> = {
      completa:         { clase: 'cob-chip cob-chip--ok',  label: 'Completa' },
      con_saldo:        { clase: 'cob-chip cob-chip--mid', label: 'Parcial' },
      insuficiente:     { clase: 'cob-chip cob-chip--bad', label: 'Insuficiente' },
      moneda_diferente: { clase: 'cob-chip cob-chip--mid', label: 'Moneda ≠' },
      pendiente:        { clase: 'cob-chip cob-chip--mid', label: 'Pendiente' },
    };
    return mapa[codigo] ?? { clase: 'cob-chip cob-chip--mid', label: codigo };
  }

  coberturaBarraClase(codigo: string): string {
    const map: Record<string, string> = {
      completa:     'barra-fill--completa',
      con_saldo:    'barra-fill--parcial',
      insuficiente: 'barra-fill--insuficiente',
    };
    return `barra-fill ${map[codigo] ?? 'barra-fill--parcial'}`;
  }

  iconoVinculo(tipo: string): string {
    switch (tipo) {
      case 'requerimiento':   return 'description';
      case 'propuesta':       return 'request_quote';
      case 'expediente':      return 'folder_open';
      case 'orden_servicio':  return 'engineering';
      default:                return 'link';
    }
  }

  etiquetaVinculo(tipo: string): string {
    switch (tipo) {
      case 'requerimiento':   return 'Requerimiento';
      case 'propuesta':       return 'Propuesta';
      case 'expediente':      return 'Expediente';
      case 'orden_servicio':  return 'Orden de Servicio';
      default:                return tipo;
    }
  }

  private get estadoEfectivo(): string {
    const r = this.datos()?.resumen;
    return (r?.estadoVisual || r?.estado || '').toLowerCase();
  }
  private get yaLiberada(): boolean { return !!this.datos()?.resumen.fechaLiberacion; }

  get puedeValidar(): boolean { return this.estadoEfectivo === 'pendiente_validacion'; }
  get puedeObservar(): boolean { return this.estadoEfectivo === 'pendiente_validacion'; }
  get puedeLiberar(): boolean {
    const e = this.estadoEfectivo;
    return !this.yaLiberada && (e === 'validada' || e === 'validada_parcial' || e === 'vigente');
  }
  get puedeDistribuir(): boolean {
    const r = this.datos()?.resumen;
    if (!r || r.saldo <= 0) return false;
    const e = this.estadoEfectivo;
    return e === 'validada' || e === 'validada_parcial' || e === 'vigente' || e === 'liberada';
  }
  get puedeComplementaria(): boolean {
    const r = this.datos()?.resumen;
    if (!r || r.coberturaCodigo === 'completa') return false;
    const e = this.estadoEfectivo;
    return e === 'validada' || e === 'validada_parcial' || e === 'vigente' || e === 'liberada';
  }
}
