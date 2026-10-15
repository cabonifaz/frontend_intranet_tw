import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import { SiPermisoDirective } from '../../../../core/directives/si-permiso.directive';
import { DetalleSeguimiento } from '../../../../core/models/seguimiento.model';
import { TimelineEventosComponent, EventoTimeline } from '../../../../shared/ui/timeline-eventos/timeline-eventos.component';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { TabsComponent, Tab as TabDef } from '../../../../shared/ui/tabs/tabs.component';
import { CatalogoEstadosService } from '../../../../core/services/catalogo-estados.service';

type Tab = 'resumen' | 'timeline' | 'contactos' | 'proximas_acciones' | 'documentos';
type AccionDetalle = 'registrar' | 'ejecutar_pendiente' | 'reprogramar' | 'cerrar_seguimiento' | 'aceptar' | 'rechazar' | 'cerrar_sin_venta';

@Component({
  selector: 'app-modal-detalle-seguimiento',
  imports: [CommonModule, DatePipe, ButtonComponent, ModalComponent, SiPermisoDirective, TimelineEventosComponent, MonedaPipe, TabsComponent],
  templateUrl: './modal-detalle-seguimiento.component.html',
  styleUrl: './modal-detalle-seguimiento.component.scss',
})
export class ModalDetalleSeguimientoComponent {
  private readonly svc           = inject(SeguimientoService);
  private readonly toast         = inject(ToastService);
  private readonly catEstados    = inject(CatalogoEstadosService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly accion      = output<AccionDetalle>();

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly datos    = signal<DetalleSeguimiento | null>(null);
  readonly tab      = signal<Tab>('resumen');

  readonly tabsDef: TabDef[] = [
    { codigo: 'resumen',           label: 'Resumen' },
    { codigo: 'timeline',          label: 'Timeline' },
    { codigo: 'contactos',         label: 'Contactos' },
    { codigo: 'proximas_acciones', label: 'Próximas Acciones' },
    { codigo: 'documentos',        label: 'Documentos' },
  ];

  constructor() {
    effect(() => {
      const id = this.idPropuesta();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.datos.set(null);
    this.tab.set('resumen');
    try {
      const d = await this.svc.obtenerDetalle(id);
      this.datos.set(d);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el detalle.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: Tab): void { this.tab.set(t); }
  onCerrar(): void { this.cerrar.emit(); }
  emitirAccion(a: AccionDetalle): void { this.accion.emit(a); }

  textoSla(min?: number | null): string {
    if (min == null) return '—';
    if (min < 0) {
      const abs = Math.abs(min);
      if (abs < 60) return `Vencido ${abs}min`;
      if (abs < 1440) return `Vencido ${Math.round(abs / 60)}h`;
      return `Vencido ${Math.round(abs / 1440)}d`;
    }
    if (min < 60) return `${min} min restantes`;
    if (min < 1440) return `${Math.round(min / 60)}h restantes`;
    return `${Math.round(min / 1440)}d restantes`;
  }

  slaClase(estado: string): string {
    if (estado === 'vencido') return 'sla-txt--urgente';
    if (estado === 'proximo') return 'sla-txt--advertencia';
    if (estado === 'cumplido') return 'sla-txt--ok';
    return 'sla-txt--normal';
  }

  estadoClase(estado: string): string { return this.catEstados.obtener('seguimiento', estado).clase; }
  estadoLabel(estado: string): string { return this.catEstados.obtener('seguimiento', estado).label; }

  iconoTimeline(tipo: string): string {
    const mapa: Record<string, string> = {
      propuesta_creada:   'description',
      vb_solicitado:      'how_to_vote',
      vb_aprobado:        'check_circle',
      vb_devuelto:        'edit_note',
      vb_rechazado:       'cancel',
      vb_cancelado:       'block',
      enviada_cliente:    'send',
      seguimiento:        'contact_phone',
      cierre_aceptacion:  'thumb_up',
      cierre_rechazo:     'thumb_down',
      cierre_sin_venta:   'remove_circle',
      accion_reprogramada: 'schedule_send',
      orden_compra:       'receipt_long',
    };
    return mapa[tipo] ?? 'event';
  }

  /** Mapea los eventos del DTO al formato de app-timeline-eventos. */
  timelineUi(eventos: { fecha?: string | null; tipo: string; titulo: string; descripcion?: string | null; usuario?: string | null }[]): EventoTimeline[] {
    return eventos.map(ev => ({
      fecha: ev.fecha,
      titulo: ev.titulo,
      descripcion: ev.descripcion,
      usuario: ev.usuario,
      icono: this.iconoTimeline(ev.tipo),
      nivel: this.nivelDe(ev.tipo),
    }));
  }

  private nivelDe(tipo: string): 'azul' | 'verde' | 'ambar' | 'rojo' {
    if (tipo === 'vb_aprobado' || tipo === 'cierre_aceptacion') return 'verde';
    if (tipo === 'vb_devuelto' || tipo === 'accion_reprogramada') return 'ambar';
    if (tipo === 'vb_rechazado' || tipo === 'vb_cancelado' || tipo === 'cierre_rechazo' || tipo === 'cierre_sin_venta') return 'rojo';
    return 'azul';
  }
}
