import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaOrdenesServicio,
  EstadoGrupoOrdenServicio,
  FiltrosBandejaOrdenesServicio,
  ItemBandejaOrdenServicio,
  OpcionFiltro,
  TarjetasOrdenesServicio,
  TipoOrden,
} from '../../../../core/models/ordenes-servicio.model';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import { ModalDetalleOrdenServicioComponent } from '../modal-detalle-orden-servicio/modal-detalle-orden-servicio.component';
import { ModalElegirPropuestaOsComponent } from '../modal-elegir-propuesta-os/modal-elegir-propuesta-os.component';
import { ModalSolicitarEdicionOsComponent } from '../modal-solicitar-edicion-os/modal-solicitar-edicion-os.component';
import { ModalAnularOsComponent } from '../modal-anular-os/modal-anular-os.component';
import { ModalResolverSolicitudOsComponent } from '../modal-resolver-solicitud-os/modal-resolver-solicitud-os.component';
import { SolicitudEdicionOs } from '../../../../core/models/ordenes-servicio.model';

/**
 * HU-41 — Bandeja consolidada de Órdenes de Servicio / Metrología.
 *
 * Columnas (según refinamiento con cliente — se quitó RQ, OC, Tipo Servicio y SLA):
 *   N° OS/OM · Fecha Emisión · Cliente/RUC · Responsable de la Orden ·
 *   N° Equipos · N° Conceptos · Estado · Acciones
 *
 * Acciones por fila (vienen como flags del back, calculados según estado + rol).
 *
 * No hay botón "Nueva OS/OM": nacen únicamente desde Propuestas aceptadas (HU-40).
 */
const ESTADOS: { codigo: EstadoGrupoOrdenServicio | ''; label: string }[] = [
  { codigo: '',             label: 'Todos' },
  { codigo: 'emitida',      label: 'Emitidas' },
  { codigo: 'programada',   label: 'Programadas' },
  { codigo: 'en_ejecucion', label: 'En ejecución' },
  { codigo: 'finalizada',   label: 'Finalizadas' },
  { codigo: 'anulada',      label: 'Anuladas' },
];

const TIPOS: { codigo: TipoOrden | ''; label: string }[] = [
  { codigo: '',   label: 'Todos' },
  { codigo: 'OS', label: 'OS — Orden de Servicio' },
  { codigo: 'OM', label: 'OM — Orden de Metrología' },
];

const TARJETAS_VACIAS: TarjetasOrdenesServicio = {
  total: 0, borradores: 0, emitidas: 0, emitidasSemana: 0, programadas: 0,
  enEjecucion: 0, finalizadas: 0, finalizadasMes: 0, anuladas: 0,
};

@Component({
  selector: 'app-lista-ordenes-servicio',
  imports: [
    FormsModule, DatePipe, HeaderBandejaComponent, KpiCardComponent, KpiGridComponent, ButtonComponent,
    BarraFiltrosBandejaComponent, TablaPaginadaComponent, ModalDetalleOrdenServicioComponent,
    ModalElegirPropuestaOsComponent, ModalSolicitarEdicionOsComponent, ModalAnularOsComponent,
    ModalResolverSolicitudOsComponent,
  ],
  templateUrl: './lista-ordenes-servicio.component.html',
  styleUrl: './lista-ordenes-servicio.component.scss',
})
export class ListaOrdenesServicioComponent implements OnInit {
  private readonly svc    = inject(OrdenesServicioService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly tarjetas     = signal<TarjetasOrdenesServicio>(TARJETAS_VACIAS);
  readonly items        = signal<ItemBandejaOrdenServicio[]>([]);
  readonly total        = signal(0);
  readonly clientes     = signal<OpcionFiltro[]>([]);
  readonly responsables = signal<OpcionFiltro[]>([]);

  readonly estadosTabs = ESTADOS;
  readonly tiposTabs   = TIPOS;

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);

  // Filtros
  busqueda = '';
  estadoFiltro:        EstadoGrupoOrdenServicio | '' = '';
  tipoFiltro:          TipoOrden | '' = '';
  idClienteFiltro:     number | '' = '';
  idResponsableFiltro: number | '' = '';
  fechaDesde: string = '';
  fechaHasta: string = '';

  readonly breadcrumb = breadcrumbCrm('Órdenes de Servicio');

  readonly filtrosActivos = computed(() => {
    let n = 0;
    if (this.estadoFiltro)        n++;
    if (this.tipoFiltro)          n++;
    if (this.idClienteFiltro)     n++;
    if (this.idResponsableFiltro) n++;
    if (this.fechaDesde)          n++;
    if (this.fechaHasta)          n++;
    return n;
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const r: BandejaOrdenesServicio = await this.svc.obtenerBandeja(this.filtrosActuales());
      this.tarjetas.set(r.tarjetas);
      this.items.set(r.items);
      this.total.set(r.total);
      this.clientes.set(r.clientes);
      this.responsables.set(r.responsables);
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudo cargar la bandeja.');
    } finally {
      this.cargando.set(false);
    }
  }

  private filtrosActuales(): FiltrosBandejaOrdenesServicio {
    return {
      busqueda:      this.busqueda || undefined,
      estado:        this.estadoFiltro || undefined,
      tipo:          this.tipoFiltro   || undefined,
      idCliente:     this.idClienteFiltro     === '' ? null : Number(this.idClienteFiltro),
      idResponsable: this.idResponsableFiltro === '' ? null : Number(this.idResponsableFiltro),
      fechaDesde:    this.fechaDesde || null,
      fechaHasta:    this.fechaHasta || null,
      pagina:        this.pagina(),
      porPagina:     this.porPagina(),
    };
  }

  filtrarPorEstado(e: EstadoGrupoOrdenServicio | ''): void {
    this.estadoFiltro = this.estadoFiltro === e ? '' : e;
    this.pagina.set(1);
    this.cargar();
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.estadoFiltro = '';
    this.tipoFiltro = '';
    this.idClienteFiltro = '';
    this.idResponsableFiltro = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.pagina.set(1);
    this.cargar();
  }

  irPagina(n: number): void {
    this.pagina.set(n);
    this.cargar();
  }

  async exportar(): Promise<void> {
    try {
      const blob = await this.svc.exportarXlsx({ ...this.filtrosActuales(), pagina: 1, porPagina: 1000 });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OrdenesServicio_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo exportar.');
    }
  }

  // ─── Header: Registrar OS ───────────────────────────────────────────────
  readonly elegirPropuestaAbierto = signal(false);

  registrarOs(): void {
    this.elegirPropuestaAbierto.set(true);
  }

  cerrarElegirPropuesta(): void {
    this.elegirPropuestaAbierto.set(false);
  }

  onPropuestaElegida(idPropuesta: number): void {
    this.elegirPropuestaAbierto.set(false);
    this.router.navigate(['/crm/ordenes-servicio/nueva', idPropuesta]);
  }

  // ─── Modal Detalle (HU-42) ──────────────────────────────────────────────
  readonly idOsDetalle = signal<number | null>(null);

  verDetalle(item: ItemBandejaOrdenServicio): void {
    this.idOsDetalle.set(item.idOs);
  }

  cerrarDetalle(): void {
    this.idOsDetalle.set(null);
  }

  onAccionDetalle(accion: string, idOs: number): void {
    const item = this.items().find(i => i.idOs === idOs);
    if (!item) return;
    this.idOsDetalle.set(null); // cerrar modal detalle primero
    setTimeout(() => {
      switch (accion) {
        case 'Solicitar edición':  this.solicitarEdicionCtx.set(item); break;
        case 'Anular':             this.anularCtx.set(item); break;
        case 'Editar':             this.router.navigate(['/crm/ordenes-servicio', item.idOs, 'editar']); break;
        case 'Resolver solicitud': this.resolverSolicitud(item); break;
        default:                   this.toast.info(`${accion} — pendiente.`);
      }
    }, 100);
  }

  readonly solicitarEdicionCtx = signal<ItemBandejaOrdenServicio | null>(null);
  readonly anularCtx            = signal<ItemBandejaOrdenServicio | null>(null);

  editarOrden(item: ItemBandejaOrdenServicio, evt?: Event): void {
    evt?.stopPropagation();
    this.router.navigate(['/crm/ordenes-servicio', item.idOs, 'editar']);
  }

  anularOrden(item: ItemBandejaOrdenServicio, evt?: Event): void {
    evt?.stopPropagation();
    this.anularCtx.set(item);
  }

  solicitarEdicion(item: ItemBandejaOrdenServicio, evt?: Event): void {
    evt?.stopPropagation();
    this.solicitarEdicionCtx.set(item);
  }

  readonly resolverSolicitudCtx = signal<{
    idOs: number;
    numeroOs: string;
    solicitud: SolicitudEdicionOs;
  } | null>(null);

  async resolverSolicitud(item: ItemBandejaOrdenServicio, evt?: Event): Promise<void> {
    evt?.stopPropagation();
    try {
      const detalle = await this.svc.obtenerDetalle(item.idOs);
      if (!detalle.solicitudPendiente) {
        this.toast.info('Esta OS/OM ya no tiene solicitud pendiente.');
        return;
      }
      this.resolverSolicitudCtx.set({
        idOs:      item.idOs,
        numeroOs:  item.numero,
        solicitud: detalle.solicitudPendiente,
      });
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo cargar la solicitud.');
    }
  }

  onSolicitudResuelta(_: 'aprobada' | 'rechazada'): void {
    this.resolverSolicitudCtx.set(null);
    this.cargar();
  }

  onSolicitudEnviada(): void {
    this.solicitarEdicionCtx.set(null);
    this.cargar();
  }

  onOrdenAnulada(): void {
    this.anularCtx.set(null);
    this.cargar();
  }

  irAPropuesta(idPropuesta: number | null, evt: Event): void {
    evt.stopPropagation();
    if (idPropuesta == null) return;
    this.router.navigate(['/crm/propuestas'], { queryParams: { idPropuesta } });
  }

  // ─── Helpers visuales ───────────────────────────────────────────────────
  estadoChip(grupo: EstadoGrupoOrdenServicio, label: string): { label: string; clase: string } {
    const clase = {
      borrador:     'badge--gris',
      emitida:      'badge--azul',
      programada:   'badge--morado',
      en_ejecucion: 'badge--ambar',
      finalizada:   'badge--verde',
      anulada:      'badge--rojo',
    }[grupo] ?? 'badge--gris';
    return { label, clase };
  }

  iniciales(nombre: string | null | undefined): string {
    if (!nombre) return '—';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '—';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
}
