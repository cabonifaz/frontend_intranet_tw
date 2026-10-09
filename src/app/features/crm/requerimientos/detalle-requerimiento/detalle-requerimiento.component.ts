import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CrmService } from '../../../../core/services/crm.service';
import { RequerimientoFicha } from '../../../../core/models/crm.model';
import { ESTADO_RQ } from '../../../../core/constants/estados';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-detalle-requerimiento',
  imports: [ButtonComponent],
  templateUrl: './detalle-requerimiento.component.html',
  styleUrl:    './detalle-requerimiento.component.scss',
})
export class DetalleRequerimientoComponent implements OnInit {
  @Input() id!: number;
  /** Si true, el modal se abre en modo "lectura embebida" (desde Propuestas):
   *  - El header muestra un botón "Volver" en lugar de la X
   *  - Oculta el footer con acciones (Editar / Anular / Crear Propuesta) */
  @Input() modoVolver = false;
  @Output() cerrar          = new EventEmitter<void>();
  @Output() editar          = new EventEmitter<number>();
  @Output() anular          = new EventEmitter<number>();
  @Output() crearPropuesta  = new EventEmitter<number>();

  private readonly crmSvc = inject(CrmService);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly ficha     = signal<RequerimientoFicha | null>(null);
  readonly tabActiva = signal<'resumen' | 'cliente' | 'comercial' | 'actividad' | 'documentos'>('resumen');

  readonly pasosFlujo = [
    { key: 'rq',          label: 'RQ'          },
    { key: 'propuesta',   label: 'PROPUESTA'   },
    { key: 'vb',          label: 'VB'          },
    { key: 'envio',       label: 'ENVÍO'       },
    { key: 'seguimiento', label: 'SEGUIMIENTO' },
    { key: 'aceptacion',  label: 'ACEPTACIÓN'  },
  ];

  protected readonly ESTADO_RQ = ESTADO_RQ;

  /** RQs cerrados o anulados son solo lectura — no se editan ni generan propuestas. */
  esAccionable(estado: string): boolean {
    return estado !== ESTADO_RQ.CERRADO && estado !== ESTADO_RQ.ANULADO;
  }

  // El back aún no expone el sub-estado de la propuesta en el detalle del RQ,
  // así que CON_PROPUESTA solo garantiza "existe una propuesta" (paso = propuesta).
  // Si/cuando el back incluya el estado de la propuesta (borrador / vb / enviada / aceptada),
  // podremos saltar al paso real (vb / envio / seguimiento / aceptacion).
  private readonly estadoAStep: Record<string, string> = {
    [ESTADO_RQ.NUEVO]:         'rq',
    [ESTADO_RQ.EN_PROCESO]:    'propuesta',
    [ESTADO_RQ.CON_PROPUESTA]: 'propuesta',
    [ESTADO_RQ.CERRADO]:       'aceptacion',
  };

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.crmSvc.obtenerRequerimientoPorId(this.id);
      this.ficha.set(data);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el requerimiento.');
    } finally {
      this.cargando.set(false);
    }
  }

  pasoIndice(estado: string): number {
    return this.pasosFlujo.findIndex(p => p.key === estado);
  }

  pasoCls(pasoKey: string, estadoActual: string): string {
    if (estadoActual === ESTADO_RQ.ANULADO) return 'paso--gris';
    const stepActual = this.estadoAStep[estadoActual] ?? estadoActual;
    const idxActual  = this.pasoIndice(stepActual);
    if (idxActual < 0) return 'paso--pendiente';
    const idxPaso = this.pasoIndice(pasoKey);
    if (idxPaso < idxActual)   return 'paso--completado';
    if (idxPaso === idxActual) return 'paso--actual';
    return 'paso--pendiente';
  }

  prioridadCls(idPrioridad: number): string {
    const mapa: Record<number, string> = { 1: 'prioridad--alta', 2: 'prioridad--media', 3: 'prioridad--baja' };
    return mapa[idPrioridad] ?? '';
  }

  estadoCls(estado: string): string {
    const mapa: Record<string, string> = {
      [ESTADO_RQ.NUEVO]:         'badge--azul',
      [ESTADO_RQ.EN_PROCESO]:    'badge--naranja',
      [ESTADO_RQ.CON_PROPUESTA]: 'badge--verde',
      [ESTADO_RQ.CERRADO]:       'badge--gris',
      [ESTADO_RQ.ANULADO]:       'badge--rojo',
    };
    return mapa[estado] ?? '';
  }

  calcularSla(fechaNecesidad: string | null): string {
    if (!fechaNecesidad) return 'Sin fecha límite';
    const dias = Math.ceil((new Date(fechaNecesidad).getTime() - Date.now()) / 86_400_000);
    if (dias < 0)  return `${Math.abs(dias)}d vencido`;
    if (dias === 0) return 'Vence hoy';
    return `${dias}d restantes`;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  formatearFechaHora(fecha: string): string {
    const d = new Date(fecha);
    const f = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    const h = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return `${f} • ${h}`;
  }

  actividadCls(tipo: string): string {
    const mapa: Record<string, string> = {
      creacion:      'act-item__icono-wrap--creacion',
      edicion:       'act-item__icono-wrap--edicion',
      cambio_estado: 'act-item__icono-wrap--cambio_estado',
      llamada:       'act-item__icono-wrap--llamada',
      visita:        'act-item__icono-wrap--visita',
      correo:        'act-item__icono-wrap--correo',
      nota:          'act-item__icono-wrap--nota',
    };
    return mapa[tipo] ?? 'act-item__icono-wrap--nota';
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }
}
