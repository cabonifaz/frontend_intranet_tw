import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  AprobadorOpcion,
  AreaCorreccion,
  AprobarVbRequest,
  ComercialOpcion,
  EstadoVb,
  ESTADOS_VB_TABS,
  KpisVb,
  ReasignarAprobadorRequest,
  RechazarVbRequest,
  SolicitarCorreccionRequest,
  VbListaItem,
} from '../../../../core/models/visto-bueno.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { FiltrosPopoverComponent } from '../../../../shared/ui/filtros-popover/filtros-popover.component';
import { ModalDetallePropuestaComponent } from '../../propuestas/modal-detalle-propuesta/modal-detalle-propuesta.component';
import { ModalCompararVersionesComponent } from '../modal-comparar-versiones/modal-comparar-versiones.component';
import { ModalAprobarVbComponent } from '../modal-aprobar-vb/modal-aprobar-vb.component';
import { ModalRechazarVbComponent } from '../modal-rechazar-vb/modal-rechazar-vb.component';
import { ModalSolicitarCorreccionComponent } from '../modal-solicitar-correccion/modal-solicitar-correccion.component';
import { ModalReasignarAprobadorComponent } from '../modal-reasignar-aprobador/modal-reasignar-aprobador.component';

type AccionVb = 'aprobar' | 'rechazar' | 'solicitar_correccion' | 'reasignar' | 'comparar_versiones';

interface ContextoAccion {
  idVb:            number;
  idPropuesta:     number;
  codigoPropuesta: string;
  version:         number;
  razonSocial:     string;
  nombreComercial: string;
  monto:           number;
  monedaSimbolo:   string;
  slaHorasRestantes: number;
  nombreAprobador: string;
  fechaSolicitud:  string;
}

@Component({
  selector: 'app-lista-visto-bueno',
  imports: [
    FormsModule, BreadcrumbComponent, KpiCardComponent, ButtonComponent,
    FiltrosPopoverComponent, ModalDetallePropuestaComponent, ModalCompararVersionesComponent,
    ModalAprobarVbComponent, ModalRechazarVbComponent, ModalSolicitarCorreccionComponent,
    ModalReasignarAprobadorComponent,
  ],
  templateUrl: './lista-visto-bueno.component.html',
  styleUrl: './lista-visto-bueno.component.scss',
})
export class ListaVistoBuenoComponent implements OnInit {
  private readonly vbSvc    = inject(VistoBuenoService);
  private readonly toastSvc = inject(ToastService);

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly kpis = signal<KpisVb>({ pendientes: 0, proximosVencer: 0, vencidos: 0, aprobadasHoy: 0, devueltas: 0 });
  readonly items = signal<VbListaItem[]>([]);
  readonly total = signal(0);

  readonly comerciales = signal<ComercialOpcion[]>([]);
  readonly estadosTabs = ESTADOS_VB_TABS;
  readonly diasOpciones = [7, 15, 30, 60, 90];

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);
  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()) || 1);
  readonly inicio       = computed(() => (this.pagina() - 1) * this.porPagina() + 1);
  readonly fin          = computed(() => Math.min(this.pagina() * this.porPagina(), this.total()));

  // Filtros
  busqueda = '';
  idComercialFiltro: number | 'todos' = 'todos';
  estadoFiltro: EstadoVb | 'todos' = 'pendiente';
  monedaFiltro: 'PEN' | 'USD' | 'todas' = 'todas';
  diasFiltro = 30;

  filtrosActivos(): number {
    let n = 0;
    if (this.idComercialFiltro !== 'todos') n++;
    if (this.estadoFiltro      !== 'pendiente') n++;
    if (this.monedaFiltro      !== 'todas') n++;
    if (this.diasFiltro        !== 30) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.idComercialFiltro = 'todos';
    this.estadoFiltro      = 'pendiente';
    this.monedaFiltro      = 'todas';
    this.diasFiltro        = 30;
    this.aplicarFiltros();
  }

  readonly breadcrumb = breadcrumbCrm('Visto Bueno');

  // Modales
  readonly idDetalleAbierto      = signal<number | null>(null);
  readonly compararCtx           = signal<{ idPropuesta: number } | null>(null);
  readonly aprobarCtx            = signal<ContextoAccion | null>(null);
  readonly rechazarCtx           = signal<ContextoAccion | null>(null);
  readonly solicitarCorreccionCtx= signal<ContextoAccion | null>(null);
  readonly reasignarCtx          = signal<ContextoAccion | null>(null);

  async ngOnInit(): Promise<void> {
    this.vbSvc.obtenerComerciales().then(c => this.comerciales.set(c)).catch(() => {});
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [bandeja, kpis] = await Promise.all([
        this.vbSvc.obtenerBandeja({
          idComercial: this.idComercialFiltro === 'todos' ? undefined : this.idComercialFiltro,
          estado:      this.estadoFiltro,
          moneda:      this.monedaFiltro,
          dias:        this.diasFiltro,
          pagina:      this.pagina(),
          porPagina:   this.porPagina(),
        }),
        this.vbSvc.obtenerKpis(),
      ]);
      this.items.set(bandeja.items);
      this.total.set(bandeja.total);
      this.kpis.set(kpis);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar la bandeja de VB.');
    } finally {
      this.cargando.set(false);
    }
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas()) return;
    this.pagina.set(p);
    this.cargar();
  }

  get paginas(): number[] {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const rango: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin    = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) rango.push(i);
    return rango;
  }

  verDetalle(item: VbListaItem): void {
    this.idDetalleAbierto.set(item.idPropuesta);
  }

  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  // Acciones del detalle en modoAprobador
  onAccionDetalle(evt: AccionVb, item?: VbListaItem): void {
    // Buscar el VbListaItem a partir del idPropuesta abierto (si vino del modal detalle)
    const propId = this.idDetalleAbierto();
    const vb = item ?? this.items().find(i => i.idPropuesta === propId);
    if (!vb) { this.toastSvc.error('No se encontró el registro de VB.'); return; }

    const ctx: ContextoAccion = {
      idVb:            vb.idVb,
      idPropuesta:     vb.idPropuesta,
      codigoPropuesta: vb.codigoPropuesta,
      version:         vb.version,
      razonSocial:     vb.razonSocial,
      nombreComercial: vb.nombreComercial,
      monto:           vb.monto,
      monedaSimbolo:   vb.monedaSimbolo,
      slaHorasRestantes: vb.slaHorasRestantes,
      nombreAprobador: vb.nombreAprobador,
      fechaSolicitud:  vb.fechaSolicitud,
    };

    // Cierra el detalle si está abierto antes de abrir el modal de acción (patrón swap)
    this.idDetalleAbierto.set(null);

    switch (evt) {
      case 'aprobar':              this.aprobarCtx.set(ctx); break;
      case 'rechazar':             this.rechazarCtx.set(ctx); break;
      case 'solicitar_correccion': this.solicitarCorreccionCtx.set(ctx); break;
      case 'reasignar':            this.reasignarCtx.set(ctx); break;
      case 'comparar_versiones':   this.compararCtx.set({ idPropuesta: vb.idPropuesta }); break;
    }
  }

  async onAprobarConfirmado(dto: AprobarVbRequest): Promise<void> {
    try {
      await this.vbSvc.aprobar(dto);
      this.toastSvc.exito('Propuesta aprobada correctamente.');
      this.aprobarCtx.set(null);
      await this.cargar();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo aprobar.');
    }
  }

  async onRechazarConfirmado(dto: RechazarVbRequest): Promise<void> {
    try {
      await this.vbSvc.rechazar(dto);
      this.toastSvc.exito('Propuesta rechazada.');
      this.rechazarCtx.set(null);
      await this.cargar();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo rechazar.');
    }
  }

  async onCorreccionConfirmada(dto: SolicitarCorreccionRequest): Promise<void> {
    try {
      await this.vbSvc.solicitarCorreccion(dto);
      this.toastSvc.exito('Corrección solicitada al comercial.');
      this.solicitarCorreccionCtx.set(null);
      await this.cargar();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo solicitar corrección.');
    }
  }

  async onReasignarConfirmada(dto: ReasignarAprobadorRequest): Promise<void> {
    try {
      await this.vbSvc.reasignar(dto);
      this.toastSvc.exito('Propuesta reasignada al nuevo aprobador.');
      this.reasignarCtx.set(null);
      await this.cargar();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo reasignar.');
    }
  }

  // Helpers UI
  formatearMonto(monto: number, simbolo: string): string {
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${simbolo} ${valor}`;
  }

  estadoClase(estado: EstadoVb): string {
    const mapa: Record<EstadoVb, string> = {
      pendiente:     'badge--naranja',
      aprobado:      'badge--verde',
      rechazado:     'badge--rojo',
      en_correccion: 'badge--azul',
      reasignado:    'badge--gris',
    };
    return mapa[estado] ?? 'badge--gris';
  }

  estadoLabel(estado: EstadoVb): string {
    const mapa: Record<EstadoVb, string> = {
      pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado',
      en_correccion: 'En corrección', reasignado: 'Reasignado',
    };
    return mapa[estado];
  }

  slaClase(item: VbListaItem): string {
    if (item.slaVencido)              return 'sla--urgente';
    if (item.slaHorasRestantes <= 1)  return 'sla--advertencia';
    return 'sla--normal';
  }

  slaTexto(item: VbListaItem): string {
    if (item.slaVencido) return `Vencido ${Math.abs(Math.round(item.slaHorasRestantes))}h`;
    if (item.slaHorasRestantes < 1) return `${Math.round(item.slaHorasRestantes * 60)}min`;
    return `${Math.round(item.slaHorasRestantes * 10) / 10}h`;
  }

  /** Badge color para descuento: verde ≤5%, ámbar 5-15%, rojo >15% (según política de aprobación). */
  descuentoClase(pct: number): string {
    if (pct <= 0)  return 'badge-pct--neutro';
    if (pct <= 5)  return 'badge-pct--verde';
    if (pct <= 15) return 'badge-pct--ambar';
    return 'badge-pct--rojo';
  }

  /** Badge color para margen: verde ≥25%, ámbar 15-25%, rojo <15% (umbrales típicos; ajustar según negocio). */
  margenClase(pct: number | null): string {
    if (pct === null)  return 'badge-pct--neutro';
    if (pct >= 25) return 'badge-pct--verde';
    if (pct >= 15) return 'badge-pct--ambar';
    return 'badge-pct--rojo';
  }

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/);
    const primera = partes[0]?.charAt(0) ?? '';
    const ultima  = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primera}${ultima}`.toUpperCase();
  }
}
