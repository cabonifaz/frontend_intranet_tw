import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaSeguimiento,
  FiltrosBandejaSeguimiento,
  ItemBandejaSeguimiento,
  KpisSeguimiento,
  OpcionFiltro,
  ParametrosSeguimiento,
} from '../../../../core/models/seguimiento.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { InicialesPipe } from '../../../../shared/pipes/iniciales.pipe';
import { ModalDetalleSeguimientoComponent } from '../modal-detalle-seguimiento/modal-detalle-seguimiento.component';
import { ModalRegistrarSeguimientoComponent } from '../modal-registrar-seguimiento/modal-registrar-seguimiento.component';
import { ModalReprogramarAccionComponent } from '../modal-reprogramar-accion/modal-reprogramar-accion.component';
import { ModalAceptacionSeguimientoComponent } from '../modal-aceptacion-seguimiento/modal-aceptacion-seguimiento.component';
import { ModalRechazoSeguimientoComponent } from '../modal-rechazo-seguimiento/modal-rechazo-seguimiento.component';
import { ModalCerrarSinVentaComponent } from '../modal-cerrar-sin-venta/modal-cerrar-sin-venta.component';
import { ModalSelectorCierreComponent } from '../modal-selector-cierre/modal-selector-cierre.component';
import { ModalDecidirPendienteComponent, DecisionPendiente } from '../modal-decidir-pendiente/modal-decidir-pendiente.component';

const ESTADOS: { codigo: string; label: string }[] = [
  { codigo: '',                label: 'Todos (abiertos)' },
  { codigo: 'en_seguimiento',  label: 'En seguimiento' },
  { codigo: 'sin_respuesta',   label: 'Sin respuesta' },
  { codigo: 'requiere_ajuste', label: 'Requiere ajuste' },
  { codigo: 'vencidos',        label: 'Vencidos' },
  { codigo: 'aceptadas_mes',   label: 'Aceptadas (mes)' },
  { codigo: 'rechazadas_mes',  label: 'Rechazadas (mes)' },
  { codigo: 'oc_pendientes',   label: 'OC pendientes' },
  { codigo: 'todas',           label: 'Todas' },
];

@Component({
  selector: 'app-lista-seguimiento',
  imports: [
    FormsModule, DatePipe, BreadcrumbComponent, HeaderBandejaComponent, KpiCardComponent, KpiGridComponent, ButtonComponent,
    BarraFiltrosBandejaComponent, TablaPaginadaComponent, MonedaPipe, InicialesPipe,
    ModalDetalleSeguimientoComponent, ModalRegistrarSeguimientoComponent, ModalReprogramarAccionComponent,
    ModalAceptacionSeguimientoComponent, ModalRechazoSeguimientoComponent, ModalCerrarSinVentaComponent,
    ModalSelectorCierreComponent, ModalDecidirPendienteComponent,
  ],
  templateUrl: './lista-seguimiento.component.html',
  styleUrl: './lista-seguimiento.component.scss',
})
export class ListaSeguimientoComponent implements OnInit, OnDestroy {
  private static readonly POLLING_MS = 60_000;

  private readonly svc      = inject(SeguimientoService);
  private readonly toastSvc = inject(ToastService);
  private pollingId: ReturnType<typeof setInterval> | null = null;

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly kpis = signal<KpisSeguimiento>({
    enSeguimiento: 0, variacionEnSeguimientoPct: 0, sinRespuesta: 0, seguimientosVencidos: 0,
    aceptadasMes: 0, metaAceptadasMes: 0, rechazadasMes: 0, rechazadasMesAnterior: 0,
    tendenciaRechazadas: 'estable', ocPendientes: 0,
  });
  readonly items        = signal<ItemBandejaSeguimiento[]>([]);
  readonly total        = signal(0);
  readonly responsables = signal<OpcionFiltro[]>([]);
  readonly parametros   = signal<ParametrosSeguimiento | null>(null);

  readonly estadosTabs = ESTADOS;
  readonly pagina      = signal(1);
  readonly porPagina   = signal(10);

  // Filtros
  idResponsableFiltro: number | '' = '';
  estadoFiltro = '';
  busqueda = '';

  readonly breadcrumb = breadcrumbCrm('Seguimiento');

  // Modales
  readonly idDetalleAbierto    = signal<number | null>(null);
  readonly registrarCtx        = signal<{
    item: ItemBandejaSeguimiento;
    comportamiento: 'ninguno' | 'ejecutar' | 'mantener' | 'cancelar';
  } | null>(null);
  /** HU-19 — selector que pregunta qué hacer con la pendiente antes de abrir registrar. */
  readonly decidirPendienteCtx = signal<ItemBandejaSeguimiento | null>(null);
  readonly reprogramarCtx      = signal<ItemBandejaSeguimiento | null>(null);
  readonly aceptacionCtx       = signal<ItemBandejaSeguimiento | null>(null);
  readonly rechazoCtx          = signal<ItemBandejaSeguimiento | null>(null);
  readonly cerrarSinVentaCtx   = signal<ItemBandejaSeguimiento | null>(null);
  readonly selectorCierreCtx   = signal<ItemBandejaSeguimiento | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
    this.pollingId = setInterval(() => { void this.cargar(true); }, ListaSeguimientoComponent.POLLING_MS);
  }

  ngOnDestroy(): void {
    if (this.pollingId !== null) { clearInterval(this.pollingId); this.pollingId = null; }
  }

  filtrosActivos(): number {
    let n = 0;
    if (this.idResponsableFiltro !== '') n++;
    if (this.estadoFiltro !== '')        n++;
    return n;
  }

  limpiarFiltros(): void {
    this.idResponsableFiltro = '';
    this.estadoFiltro = '';
    this.busqueda = '';
    this.aplicarFiltros();
  }

  async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    this.error.set('');
    try {
      const filtros: FiltrosBandejaSeguimiento = {
        idResponsable: this.idResponsableFiltro === '' ? undefined : this.idResponsableFiltro,
        estado:        this.estadoFiltro || undefined,
        busqueda:      this.busqueda || undefined,
        pagina:        this.pagina(),
        porPagina:     this.porPagina(),
      };
      const b: BandejaSeguimiento = await this.svc.obtenerBandeja(filtros);
      this.kpis.set(b.kpis);
      this.items.set(b.items);
      this.total.set(b.total);
      this.responsables.set(b.responsables);
      this.parametros.set(b.parametros);
    } catch (e: unknown) {
      if (!silencioso) this.error.set(e instanceof Error ? e.message : 'Error al cargar la bandeja.');
    } finally {
      if (!silencioso) this.cargando.set(false);
    }
  }

  aplicarFiltros(): void { this.pagina.set(1); this.cargar(); }

  /** Exportar bandeja a Excel (placeholder — pendiente de endpoint en back). */
  exportar(): void { /* TODO: integrar cuando el back soporte /seguimiento/export */ }

  irPagina(p: number): void { this.pagina.set(p); this.cargar(); }

  verDetalle(item: ItemBandejaSeguimiento): void { this.idDetalleAbierto.set(item.idPropuesta); }
  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  onAccionDetalle(
    evt: 'registrar' | 'ejecutar_pendiente' | 'reprogramar' | 'cerrar_seguimiento' | 'aceptar' | 'rechazar' | 'cerrar_sin_venta',
    item?: ItemBandejaSeguimiento,
  ): void {
    const propId = this.idDetalleAbierto();
    const target = item ?? this.items().find(i => i.idPropuesta === propId);
    if (!target) { this.toastSvc.error('No se encontró el registro.'); return; }
    this.idDetalleAbierto.set(null);
    switch (evt) {
      case 'registrar':          this.iniciarRegistro(target); break;
      case 'ejecutar_pendiente': this.registrarCtx.set({ item: target, comportamiento: 'ejecutar' }); break;
      case 'reprogramar':        this.reprogramarCtx.set(target); break;
      case 'cerrar_seguimiento': this.selectorCierreCtx.set(target); break;
      case 'aceptar':            this.aceptacionCtx.set(target); break;
      case 'rechazar':           this.rechazoCtx.set(target); break;
      case 'cerrar_sin_venta':   this.cerrarSinVentaCtx.set(target); break;
    }
  }

  /** HU-19 — Si hay pendiente, abre el decider; si no, abre registrar normal. */
  private iniciarRegistro(target: ItemBandejaSeguimiento): void {
    if (target.proximaAccion && target.proximaAccionFecha) {
      this.decidirPendienteCtx.set(target);
    } else {
      this.registrarCtx.set({ item: target, comportamiento: 'ninguno' });
    }
  }

  cerrarDecidirPendiente(): void { this.decidirPendienteCtx.set(null); }

  onDecisionPendiente(decision: DecisionPendiente): void {
    const target = this.decidirPendienteCtx();
    if (!target) return;
    this.decidirPendienteCtx.set(null);
    this.registrarCtx.set({ item: target, comportamiento: decision });
  }

  cerrarSelectorCierre(): void { this.selectorCierreCtx.set(null); }

  onCierreSeleccionado(tipo: 'aceptar' | 'rechazar' | 'cerrar_sin_venta'): void {
    const target = this.selectorCierreCtx();
    if (!target) return;
    this.selectorCierreCtx.set(null);
    if      (tipo === 'aceptar')          this.aceptacionCtx.set(target);
    else if (tipo === 'rechazar')         this.rechazoCtx.set(target);
    else if (tipo === 'cerrar_sin_venta') this.cerrarSinVentaCtx.set(target);
  }

  // Helpers UI
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

  slaClase(item: ItemBandejaSeguimiento): string {
    if (item.slaEstado === 'vencido')  return 'sla--urgente';
    if (item.slaEstado === 'proximo')  return 'sla--advertencia';
    if (item.slaEstado === 'cumplido') return 'sla--ok';
    return 'sla--normal';
  }

  textoAccion(item: ItemBandejaSeguimiento): string {
    if (!item.proximaAccion) return '—';
    if (item.diasParaAccion == null) return item.proximaAccion;
    if (item.diasParaAccion < 0)  return `${item.proximaAccion} · vencida hace ${Math.abs(item.diasParaAccion)}d`;
    if (item.diasParaAccion === 0) return `${item.proximaAccion} · hoy`;
    if (item.diasParaAccion === 1) return `${item.proximaAccion} · mañana`;
    return `${item.proximaAccion} · en ${item.diasParaAccion}d`;
  }

  // Callbacks de modales de cierre
  onConfirmadoCambio(): void { this.cargar(); }
}
