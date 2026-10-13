import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import { SiPermisoDirective } from '../../../../core/directives/si-permiso.directive';
import { DetalleSeguimiento } from '../../../../core/models/seguimiento.model';

type Tab = 'resumen' | 'timeline' | 'contactos' | 'proximas_acciones' | 'documentos';
type AccionDetalle = 'registrar' | 'ejecutar_pendiente' | 'reprogramar' | 'cerrar_seguimiento' | 'aceptar' | 'rechazar' | 'cerrar_sin_venta';

@Component({
  selector: 'app-modal-detalle-seguimiento',
  imports: [CommonModule, DatePipe, ButtonComponent, ModalComponent, SiPermisoDirective],
  templateUrl: './modal-detalle-seguimiento.component.html',
  styleUrl: './modal-detalle-seguimiento.component.scss',
})
export class ModalDetalleSeguimientoComponent {
  private readonly svc   = inject(SeguimientoService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly accion      = output<AccionDetalle>();

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly datos    = signal<DetalleSeguimiento | null>(null);
  readonly tab      = signal<Tab>('resumen');

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

  formatearMonto(monto: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`;
  }

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

  estadoClase(estado: string): string {
    const mapa: Record<string, string> = {
      en_seguimiento:  'badge--azul',
      sin_respuesta:   'badge--rojo',
      requiere_ajuste: 'badge--naranja',
      aceptada:        'badge--verde',
      rechazada:       'badge--rojo',
    };
    return mapa[estado] ?? 'badge--gris';
  }

  estadoLabel(estado: string): string {
    const mapa: Record<string, string> = {
      en_seguimiento:  'En seguimiento',
      sin_respuesta:   'Sin respuesta',
      requiere_ajuste: 'Requiere ajuste',
      aceptada:        'Aceptada',
      rechazada:       'Rechazada',
    };
    return mapa[estado] ?? estado;
  }

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
}
