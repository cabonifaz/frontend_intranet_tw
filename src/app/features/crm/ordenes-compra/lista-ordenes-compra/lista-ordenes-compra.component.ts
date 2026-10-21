import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaOrdenesCompraDto,
  FiltrosBandejaOrdenesCompraDto,
  ItemBandejaOrdenCompraDto,
  TarjetasOrdenesCompraDto,
} from '../../../../core/models/ordenes-compra.model';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { ModalDetalleOcComponent } from '../modal-detalle-oc/modal-detalle-oc.component';
import { ModalElegirPropuestaOcComponent } from '../modal-elegir-propuesta-oc/modal-elegir-propuesta-oc.component';
import { ModalAnularOcComponent } from '../modal-anular-oc/modal-anular-oc.component';

const ESTADOS: { codigo: string; label: string }[] = [
  { codigo: '',                 label: 'Todas' },
  { codigo: 'recibida',         label: 'Recibidas' },
  { codigo: 'validada',         label: 'Validadas' },
  { codigo: 'validada_parcial', label: 'Validadas (parciales)' },
  { codigo: 'observada',        label: 'Observadas' },
  { codigo: 'autogeneradas',    label: 'Autogeneradas' },
  { codigo: 'sin_asignar',      label: 'Sin asignar' },
  { codigo: 'anulada',          label: 'Anuladas' },
];

const TARJETAS_VACIAS: TarjetasOrdenesCompraDto = {
  total: 0, registradasMes: 0, validadas: 0, validadasParcial: 0, observadas: 0,
  parcialUObservadas: 0, autogeneradasPendientes: 0, sinAsignar: 0, anuladas: 0,
};

@Component({
  selector: 'app-lista-ordenes-compra',
  imports: [
    FormsModule, DatePipe, HeaderBandejaComponent, KpiCardComponent, KpiGridComponent, ButtonComponent,
    BarraFiltrosBandejaComponent, TablaPaginadaComponent, MonedaPipe,
    ModalDetalleOcComponent, ModalElegirPropuestaOcComponent, ModalAnularOcComponent,
  ],
  templateUrl: './lista-ordenes-compra.component.html',
  styleUrl: './lista-ordenes-compra.component.scss',
})
export class ListaOrdenesCompraComponent implements OnInit {
  private readonly svc      = inject(OrdenesCompraService);
  private readonly toastSvc = inject(ToastService);
  private readonly router   = inject(Router);

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly tarjetas     = signal<TarjetasOrdenesCompraDto>(TARJETAS_VACIAS);
  readonly items        = signal<ItemBandejaOrdenCompraDto[]>([]);
  readonly total        = signal(0);
  readonly responsables = signal<{ id: number; nombre: string; codigo?: string | null }[]>([]);
  readonly clientes     = signal<{ id: number; nombre: string; codigo?: string | null }[]>([]);

  readonly estadosTabs = ESTADOS;

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);

  // Filtros
  estadoFiltro:        string = '';
  idClienteFiltro:     number | '' = '';
  idResponsableFiltro: number | '' = '';
  busqueda = '';

  readonly breadcrumb = breadcrumbCrm('Órdenes de Compra');

  // Modales
  readonly idDetalleAbierto  = signal<number | null>(null);
  readonly elegirAbierto     = signal(false);
  readonly anularCtx         = signal<ItemBandejaOrdenCompraDto | null>(null);

  /** KPIs del prototipo (6): mapeados desde las 9 tarjetas que devuelve el back. */
  readonly kpis = computed(() => {
    const t = this.tarjetas();
    return {
      recibidas:     t.total,
      validadas:     t.validadas,
      parciales:     t.parcialUObservadas,
      autogeneradas: t.autogeneradasPendientes,
      sinAccion:     t.sinAsignar,
      anuladas:      t.anuladas,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  filtrosActivos(): number {
    let n = 0;
    if (this.estadoFiltro        !== '') n++;
    if (this.idClienteFiltro     !== '') n++;
    if (this.idResponsableFiltro !== '') n++;
    return n;
  }

  limpiarFiltros(): void {
    this.estadoFiltro = '';
    this.idClienteFiltro = '';
    this.idResponsableFiltro = '';
    this.busqueda = '';
    this.aplicarFiltros();
  }

  async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    this.error.set('');
    try {
      const filtros: FiltrosBandejaOrdenesCompraDto = {
        estado:        this.estadoFiltro || undefined,
        idCliente:     this.idClienteFiltro === '' ? undefined : this.idClienteFiltro,
        idResponsable: this.idResponsableFiltro === '' ? undefined : this.idResponsableFiltro,
        busqueda:      this.busqueda || undefined,
        pagina:        this.pagina(),
        porPagina:     this.porPagina(),
      };
      const b: BandejaOrdenesCompraDto = await this.svc.obtenerBandeja(filtros);
      this.tarjetas.set(b.tarjetas);
      this.items.set(b.items);
      this.total.set(b.total);
      this.responsables.set(b.responsables);
      this.clientes.set(b.clientes);
    } catch (e: unknown) {
      if (!silencioso) this.error.set(e instanceof Error ? e.message : 'Error al cargar la bandeja.');
    } finally {
      if (!silencioso) this.cargando.set(false);
    }
  }

  aplicarFiltros(): void { this.pagina.set(1); this.cargar(); }

  exportar(): void { /* TODO: integrar cuando el back soporte /ordenes-compra/export */ }

  irPagina(p: number): void { this.pagina.set(p); this.cargar(); }

  verDetalle(item: ItemBandejaOrdenCompraDto): void { this.idDetalleAbierto.set(item.idOc); }
  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  nuevaOc(): void { this.elegirAbierto.set(true); }

  /** Modal de selección de propuesta → navegar a la ficha. */
  onPropuestaElegida(idPropuesta: number): void {
    this.elegirAbierto.set(false);
    void this.router.navigate(['/crm/ordenes-compra/nueva', idPropuesta]);
  }

  onAccionDetalle(ev: 'editar' | 'anular'): void {
    const propId = this.idDetalleAbierto();
    const item = this.items().find(i => i.idOc === propId);
    if (!item) { this.toastSvc.error('No se encontró la OC.'); return; }
    this.idDetalleAbierto.set(null);
    if (ev === 'editar') { void this.router.navigate(['/crm/ordenes-compra', item.idOc, 'editar']); }
    if (ev === 'anular') { this.anularCtx.set(item); }
  }

  abrirAnular(item: ItemBandejaOrdenCompraDto, ev: Event): void {
    ev.stopPropagation();
    this.anularCtx.set(item);
  }

  onConfirmadoCambio(): void { void this.cargar(); }

  estadoChip(estado: string): { clase: string; label: string } {
    const mapa: Record<string, { clase: string; label: string }> = {
      recibida:         { clase: 'badge--ambar', label: 'Recibida' },
      validada:         { clase: 'badge--verde', label: 'Validada' },
      validada_parcial: { clase: 'badge--verde', label: 'Validada (parcial)' },
      observada:        { clase: 'badge--rojo',  label: 'Observada' },
      anulada:          { clase: 'badge--gris',  label: 'Anulada' },
      reemplazada:      { clase: 'badge--gris',  label: 'Reemplazada' },
    };
    return mapa[estado] ?? { clase: 'badge--gris', label: estado };
  }
}
