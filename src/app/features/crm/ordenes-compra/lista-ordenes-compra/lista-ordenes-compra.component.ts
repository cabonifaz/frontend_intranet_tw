import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaOrdenesCompraDto,
  FiltrosBandejaOrdenesCompraDto,
  ItemBandejaOrdenCompraDto,
  KpisOrdenesCompraDto,
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
import { ModalRegistrarOcComponent } from '../modal-registrar-oc/modal-registrar-oc.component';
import { ModalValidarOcComponent } from '../modal-validar-oc/modal-validar-oc.component';
import { ModalObservarOcComponent } from '../modal-observar-oc/modal-observar-oc.component';
import { ModalLiberarOcComponent } from '../modal-liberar-oc/modal-liberar-oc.component';
import { ModalDistribuirOcComponent } from '../modal-distribuir-oc/modal-distribuir-oc.component';
import { ModalOcComplementariaComponent } from '../modal-oc-complementaria/modal-oc-complementaria.component';

const ESTADOS: { codigo: string; label: string }[] = [
  { codigo: '',                      label: 'Todas' },
  { codigo: 'activas',                label: 'Activas' },
  { codigo: 'pendiente_validacion',   label: 'Pendientes de validación' },
  { codigo: 'vigentes',               label: 'Vigentes' },
  { codigo: 'validada',               label: 'Validadas' },
  { codigo: 'validada_parcial',       label: 'Validadas (parciales)' },
  { codigo: 'listas_programacion',    label: 'Listas para programación' },
  { codigo: 'observada',              label: 'Observadas' },
  { codigo: 'bloqueada',              label: 'Bloqueadas' },
  { codigo: 'vencida',                label: 'Vencidas' },
  { codigo: 'anulada',                label: 'Anuladas' },
];

const COBERTURAS: { codigo: string; label: string }[] = [
  { codigo: '',                 label: 'Todas' },
  { codigo: 'completa',         label: 'Completa' },
  { codigo: 'con_saldo',        label: 'Con saldo (parcial)' },
  { codigo: 'insuficiente',     label: 'Insuficiente' },
  { codigo: 'moneda_diferente', label: 'Moneda diferente' },
  { codigo: 'pendiente',        label: 'Pendiente' },
];

@Component({
  selector: 'app-lista-ordenes-compra',
  imports: [
    FormsModule, DatePipe, HeaderBandejaComponent, KpiCardComponent, KpiGridComponent, ButtonComponent,
    BarraFiltrosBandejaComponent, TablaPaginadaComponent, MonedaPipe,
    ModalDetalleOcComponent, ModalRegistrarOcComponent,
    ModalValidarOcComponent, ModalObservarOcComponent,
    ModalLiberarOcComponent,
    ModalDistribuirOcComponent, ModalOcComplementariaComponent,
  ],
  templateUrl: './lista-ordenes-compra.component.html',
  styleUrl: './lista-ordenes-compra.component.scss',
})
export class ListaOrdenesCompraComponent implements OnInit {
  private readonly svc      = inject(OrdenesCompraService);
  private readonly toastSvc = inject(ToastService);

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly kpis = signal<KpisOrdenesCompraDto>({
    vigentes: 0, coberturaParcial: 0, saldoInsuficiente: 0,
    pendientesValidacion: 0, listasProgramacion: 0, observadas: 0,
    vencidas: 0, pendientesConAlerta: 0, liberadas: 0,
  });
  readonly items        = signal<ItemBandejaOrdenCompraDto[]>([]);
  readonly total        = signal(0);
  readonly responsables = signal<{ id: number; nombre: string; codigo?: string | null }[]>([]);
  readonly clientes     = signal<{ id: number; nombre: string; codigo?: string | null }[]>([]);

  readonly estadosTabs = ESTADOS;
  readonly coberturas  = COBERTURAS;

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);

  // Filtros
  estadoFiltro:        string = '';
  idClienteFiltro:     number | '' = '';
  coberturaFiltro:     string = '';
  idResponsableFiltro: number | '' = '';
  conArchivoFiltro:    '' | 'si' | 'no' = '';
  busqueda = '';

  readonly breadcrumb = breadcrumbCrm('Órdenes de Compra');

  // Modales
  readonly idDetalleAbierto    = signal<number | null>(null);
  readonly registrarAbierto    = signal(false);
  readonly editarCtx           = signal<ItemBandejaOrdenCompraDto | null>(null);
  readonly validarCtx          = signal<ItemBandejaOrdenCompraDto | null>(null);
  readonly observarCtx         = signal<ItemBandejaOrdenCompraDto | null>(null);
  readonly liberarCtx          = signal<ItemBandejaOrdenCompraDto | null>(null);
  readonly distribuirCtx       = signal<ItemBandejaOrdenCompraDto | null>(null);
  readonly complementariaCtx   = signal<ItemBandejaOrdenCompraDto | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  filtrosActivos(): number {
    let n = 0;
    if (this.estadoFiltro        !== '') n++;
    if (this.idClienteFiltro     !== '') n++;
    if (this.coberturaFiltro     !== '') n++;
    if (this.idResponsableFiltro !== '') n++;
    if (this.conArchivoFiltro    !== '') n++;
    return n;
  }

  limpiarFiltros(): void {
    this.estadoFiltro = '';
    this.idClienteFiltro = '';
    this.coberturaFiltro = '';
    this.idResponsableFiltro = '';
    this.conArchivoFiltro = '';
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
        cobertura:     this.coberturaFiltro || undefined,
        idResponsable: this.idResponsableFiltro === '' ? undefined : this.idResponsableFiltro,
        conPdf:        this.conArchivoFiltro === '' ? undefined : this.conArchivoFiltro === 'si',
        busqueda:      this.busqueda || undefined,
        pagina:        this.pagina(),
        porPagina:     this.porPagina(),
      };
      const b: BandejaOrdenesCompraDto = await this.svc.obtenerBandeja(filtros);
      this.kpis.set(b.kpis);
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

  /** Exportar bandeja a Excel (placeholder — pendiente de endpoint en back). */
  exportar(): void { /* TODO: integrar cuando el back soporte /ordenes-compra/export */ }

  irPagina(p: number): void { this.pagina.set(p); this.cargar(); }

  verDetalle(item: ItemBandejaOrdenCompraDto): void { this.idDetalleAbierto.set(item.idOc); }
  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  nuevaOc(): void { this.registrarAbierto.set(true); }

  /** Recibe la acción emitida por el modal de detalle (HU-23 → HU-26/28/27). */
  onAccionDetalle(ev: 'editar' | 'validar' | 'observar' | 'liberar' | 'distribuir' | 'complementaria'): void {
    const propId = this.idDetalleAbierto();
    const item = this.items().find(i => i.idOc === propId);
    if (!item) { this.toastSvc.error('No se encontró la OC.'); return; }
    this.idDetalleAbierto.set(null);
    switch (ev) {
      case 'editar':         this.editarCtx.set(item); break;
      case 'validar':        this.validarCtx.set(item); break;
      case 'observar':       this.observarCtx.set(item); break;
      case 'liberar':        this.liberarCtx.set(item); break;
      case 'distribuir':     this.distribuirCtx.set(item); break;
      case 'complementaria': this.complementariaCtx.set(item); break;
    }
  }

  /** El modal Validar permite derivar a Observar. */
  solicitarObservarDesdeValidar(item: ItemBandejaOrdenCompraDto): void {
    this.validarCtx.set(null);
    this.observarCtx.set(item);
  }

  onConfirmadoCambio(): void { void this.cargar(); }

  // ─── Helpers UI ────────────────────────────────────────────────────────
  estadoChip(estado: string): { clase: string; label: string } {
    const mapa: Record<string, { clase: string; label: string }> = {
      pendiente_validacion: { clase: 'badge--ambar', label: 'Pend. Validar' },
      validada:             { clase: 'badge--verde', label: 'Validada' },
      validada_parcial:     { clase: 'badge--verde', label: 'Validada (parcial)' },
      vigente:              { clase: 'badge--verde', label: 'Validada' },
      liberada:             { clase: 'badge--azul',  label: 'Liberada' },
      observada:            { clase: 'badge--rojo',  label: 'Observada' },
      bloqueada:            { clase: 'badge--rojo',  label: 'Bloqueada' },
      vencida:              { clase: 'badge--rojo',  label: 'Vencida' },
      anulada:              { clase: 'badge--gris',  label: 'Anulada' },
    };
    return mapa[estado] ?? { clase: 'badge--gris', label: estado };
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

  saldoClase(saldo: number): string {
    if (saldo < 0)   return 'saldo--neg';
    if (saldo === 0) return 'saldo--ok';
    return 'saldo--pos';
  }
}
