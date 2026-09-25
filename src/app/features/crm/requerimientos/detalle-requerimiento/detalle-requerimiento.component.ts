import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CrmService } from '../../../../core/services/crm.service';
import { RequerimientoFicha } from '../../../../core/models/crm.model';

@Component({
  selector: 'app-detalle-requerimiento',
  imports: [],
  templateUrl: './detalle-requerimiento.component.html',
  styleUrl:    './detalle-requerimiento.component.scss',
})
export class DetalleRequerimientoComponent implements OnInit {
  @Input() id!: number;
  @Output() cerrar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<number>();
  @Output() anular = new EventEmitter<number>();

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

  private readonly estadoAStep: Record<string, string> = {
    nuevo:         'rq',
    en_proceso:    'propuesta',
    con_propuesta: 'envio',
    cerrado:       'aceptacion',
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
    if (estadoActual === 'anulado') return 'paso--gris';
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
      nuevo:         'badge--azul',
      en_proceso:    'badge--naranja',
      con_propuesta: 'badge--verde',
      cerrado:       'badge--gris',
      anulado:       'badge--rojo',
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
}
