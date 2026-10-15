import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaVb,
  FiltrosBandejaVb,
  ItemBandejaVb,
  KpisVb,
  OpcionFiltro,
  PoliticasVb,
  ResolverVbRequest,
} from '../../../../core/models/visto-bueno.model';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { MonedaPipe } from '../../../../shared/pipes/moneda.pipe';
import { InicialesPipe } from '../../../../shared/pipes/iniciales.pipe';
import { ModalDetallePropuestaComponent } from '../../propuestas/modal-detalle-propuesta/modal-detalle-propuesta.component';
import { ModalCompararVersionesComponent } from '../modal-comparar-versiones/modal-comparar-versiones.component';
import { ModalAprobarVbComponent } from '../modal-aprobar-vb/modal-aprobar-vb.component';
import { ModalRechazarVbComponent } from '../modal-rechazar-vb/modal-rechazar-vb.component';
import { ModalSolicitarCorreccionComponent } from '../modal-solicitar-correccion/modal-solicitar-correccion.component';
import { ModalResolverRevocacionComponent } from '../modal-resolver-revocacion/modal-resolver-revocacion.component';

type AccionVb = 'aprobar' | 'rechazar' | 'solicitar_correccion' | 'comparar_versiones';

const ESTADOS_VB_TABS: { codigo: string; label: string }[] = [
  { codigo: '',                     label: 'Todos' },
  { codigo: 'pendiente',            label: 'Pendientes' },
  { codigo: 'revocacion_pendiente', label: 'Revocaciones' },
  { codigo: 'aprobado',             label: 'Aprobados' },
  { codigo: 'rechazado',            label: 'Rechazados' },
  { codigo: 'devuelto',             label: 'Devueltos' },
];

const SLA_OPCIONES: { codigo: string; label: string }[] = [
  { codigo: '',         label: 'Todos' },
  { codigo: 'en_plazo', label: 'En plazo' },
  { codigo: 'proximo',  label: 'Próximo a vencer' },
  { codigo: 'vencido',  label: 'Vencidos' },
];

@Component({
  selector: 'app-lista-visto-bueno',
  imports: [
    FormsModule, HeaderBandejaComponent, KpiCardComponent, KpiGridComponent, ButtonComponent,
    BarraFiltrosBandejaComponent, TablaPaginadaComponent, MonedaPipe, InicialesPipe,
    ModalDetallePropuestaComponent, ModalCompararVersionesComponent,
    ModalAprobarVbComponent, ModalRechazarVbComponent, ModalSolicitarCorreccionComponent,
    ModalResolverRevocacionComponent,
  ],
  templateUrl: './lista-visto-bueno.component.html',
  styleUrl: './lista-visto-bueno.component.scss',
})
export class ListaVistoBuenoComponent implements OnInit, OnDestroy {
  /** Refresca la bandeja automáticamente para captar cancelaciones (p.ej. nueva versión del comercial). */
  private static readonly POLLING_MS = 45_000;

  private readonly vbSvc    = inject(VistoBuenoService);
  private readonly toastSvc = inject(ToastService);

  private pollingId: ReturnType<typeof setInterval> | null = null;

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly kpis = signal<KpisVb>({ pendientes: 0, proximosVencer: 0, vencidos: 0, aprobadasHoy: 0, devueltas: 0, revocacionesPendientes: 0 });
  readonly items = signal<ItemBandejaVb[]>([]);
  readonly total = signal(0);

  /** Filtro client-side de busqueda (hasta que el back soporte el param busqueda). */
  get itemsFiltrados(): ItemBandejaVb[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter(i =>
      (i.numero         ?? '').toLowerCase().includes(q) ||
      (i.razonSocial    ?? '').toLowerCase().includes(q) ||
      (i.ruc            ?? '').toLowerCase().includes(q) ||
      (i.numeroRq       ?? '').toLowerCase().includes(q),
    );
  }

  readonly comerciales = signal<OpcionFiltro[]>([]);
  readonly monedas     = signal<OpcionFiltro[]>([]);
  readonly politicas   = signal<PoliticasVb | null>(null);
  readonly estadosTabs = ESTADOS_VB_TABS;
  readonly slaOpciones = SLA_OPCIONES;
  readonly diasOpciones = [7, 15, 30, 60, 90];

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);

  // Filtros
  idComercialFiltro: number | '' = '';
  estadoFiltro = 'pendiente';
  idMonedaFiltro: number | '' = '';
  slaFiltro = '';
  diasFiltro = 30;
  busqueda = '';

  filtrosActivos(): number {
    let n = 0;
    if (this.idComercialFiltro !== '') n++;
    if (this.estadoFiltro       !== 'pendiente') n++;
    if (this.idMonedaFiltro     !== '') n++;
    if (this.slaFiltro          !== '') n++;
    if (this.diasFiltro         !== 30) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.idComercialFiltro = '';
    this.estadoFiltro      = 'pendiente';
    this.idMonedaFiltro    = '';
    this.slaFiltro         = '';
    this.diasFiltro        = 30;
    this.busqueda          = '';
    this.aplicarFiltros();
  }

  /** Exportar bandeja a Excel (placeholder — pendiente de endpoint en back). */
  exportar(): void { /* TODO: integrar cuando el back soporte /vb/export */ }

  readonly breadcrumb = breadcrumbCrm('Visto Bueno');

  // Modales
  readonly idDetalleAbierto      = signal<number | null>(null);
  readonly compararCtx           = signal<{ idPropuesta: number } | null>(null);
  readonly aprobarCtx            = signal<ItemBandejaVb | null>(null);
  readonly rechazarCtx           = signal<ItemBandejaVb | null>(null);
  readonly solicitarCorreccionCtx= signal<ItemBandejaVb | null>(null);
  readonly revocacionCtx         = signal<ItemBandejaVb | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
    this.pollingId = setInterval(() => { void this.cargar(true); }, ListaVistoBuenoComponent.POLLING_MS);
  }

  ngOnDestroy(): void {
    if (this.pollingId !== null) {
      clearInterval(this.pollingId);
      this.pollingId = null;
    }
  }

  async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    this.error.set('');
    try {
      const filtros: FiltrosBandejaVb = {
        idComercial: this.idComercialFiltro === '' ? undefined : this.idComercialFiltro,
        estado:      this.estadoFiltro  || undefined,
        idMoneda:    this.idMonedaFiltro === '' ? undefined : this.idMonedaFiltro,
        sla:         this.slaFiltro      || undefined,
        dias:        this.diasFiltro,
        pagina:      this.pagina(),
        porPagina:   this.porPagina(),
      };
      const b: BandejaVb = await this.vbSvc.obtenerBandeja(filtros);
      this.kpis.set(b.kpis);
      this.items.set(b.items);
      this.total.set(b.total);
      this.comerciales.set(b.comerciales);
      this.monedas.set(b.monedas);
      this.politicas.set(b.politicas);
    } catch (e: unknown) {
      if (!silencioso) this.error.set(e instanceof Error ? e.message : 'Error al cargar la bandeja de VB.');
    } finally {
      if (!silencioso) this.cargando.set(false);
    }
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  irPagina(p: number): void { this.pagina.set(p); this.cargar(); }

  verDetalle(item: ItemBandejaVb): void {
    // HU-13b: si la fila es una solicitud de revocación pendiente, abrir modal dedicado.
    if (item.tipoVb === 'revocacion' && item.estadoVb === 'revocacion_pendiente') {
      this.revocacionCtx.set(item);
      return;
    }
    this.idDetalleAbierto.set(item.idPropuesta);
  }

  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  cerrarRevocacion(): void { this.revocacionCtx.set(null); }
  onRevocacionResuelta(_evt: { accion: 'aprobar' | 'rechazar'; idNuevaVersion: number }): void {
    // La nueva versión (si se aprobó) queda en el módulo Propuestas del comercial autor,
    // no en VB. El supervisor solo necesita recargar la bandeja para que la fila desaparezca.
    this.cerrarRevocacion();
    this.cargar();
  }

  // Acciones del detalle en modoAprobador
  onAccionDetalle(evt: AccionVb, item?: ItemBandejaVb): void {
    const propId = this.idDetalleAbierto();
    const vb = item ?? this.items().find(i => i.idPropuesta === propId);
    if (!vb) { this.toastSvc.error('No se encontró el registro de VB.'); return; }

    this.idDetalleAbierto.set(null);

    switch (evt) {
      case 'aprobar':              this.aprobarCtx.set(vb); break;
      case 'rechazar':             this.rechazarCtx.set(vb); break;
      case 'solicitar_correccion': this.solicitarCorreccionCtx.set(vb); break;
      case 'comparar_versiones':   this.compararCtx.set({ idPropuesta: vb.idPropuesta }); break;
    }
  }

  async onResolverConfirmado(idPropuesta: number, dto: ResolverVbRequest, msgOk: string): Promise<void> {
    try {
      await this.vbSvc.resolver(idPropuesta, dto);
      this.toastSvc.exito(msgOk);
      this.aprobarCtx.set(null);
      this.rechazarCtx.set(null);
      this.solicitarCorreccionCtx.set(null);
      await this.cargar();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo registrar la decisión.');
    }
  }

  // Helpers UI
  estadoClase(estado: string): string {
    const mapa: Record<string, string> = {
      pendiente:            'badge--naranja',
      aprobado:             'badge--verde',
      rechazado:            'badge--rojo',
      devuelto:             'badge--azul',
      revocacion_pendiente: 'badge--naranja',
      revocacion_aprobada:  'badge--verde',
      revocacion_rechazada: 'badge--rojo',
    };
    return mapa[estado] ?? 'badge--gris';
  }

  estadoLabel(estado: string): string {
    const mapa: Record<string, string> = {
      pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', devuelto: 'En corrección',
      revocacion_pendiente: 'Revocación solicitada',
      revocacion_aprobada:  'Revocación aprobada',
      revocacion_rechazada: 'Revocación rechazada',
    };
    return mapa[estado] ?? estado;
  }

  slaClase(item: ItemBandejaVb): string {
    if (item.slaEstado === 'vencido' || item.slaEstado === 'fuera_de_plazo') return 'sla--urgente';
    if (item.slaEstado === 'proximo') return 'sla--advertencia';
    return 'sla--normal';
  }

  slaTexto(item: ItemBandejaVb): string {
    if (item.slaEstado === 'vencido') return `Vencido ${Math.abs(Math.round(item.horasRestantes))}h`;
    if (item.horasRestantes < 1) return `${Math.max(0, Math.round(item.horasRestantes * 60))}min`;
    return `${Math.round(item.horasRestantes * 10) / 10}h`;
  }

  /** Badge color para descuento: verde ≤5%, ámbar 5-15%, rojo >15%. */
  descuentoClase(pct: number): string {
    if (pct <= 0)  return 'badge-pct--neutro';
    if (pct <= 5)  return 'badge-pct--verde';
    if (pct <= 15) return 'badge-pct--ambar';
    return 'badge-pct--rojo';
  }

}
