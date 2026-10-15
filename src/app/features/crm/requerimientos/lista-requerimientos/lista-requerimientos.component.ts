import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../../core/services/crm.service';
import { KpisRequerimientos, RequerimientoListaItem, CatalogoItem } from '../../../../core/models/crm.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { DetalleRequerimientoComponent } from '../detalle-requerimiento/detalle-requerimiento.component';
import { AnularRequerimientoComponent } from '../anular-requerimiento/anular-requerimiento.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ESTADO_RQ } from '../../../../core/constants/estados';
import { SiPermisoDirective } from '../../../../core/directives/si-permiso.directive';

@Component({
  selector: 'app-lista-requerimientos',
  imports: [FormsModule, BreadcrumbComponent, HeaderBandejaComponent, KpiCardComponent, KpiGridComponent, ButtonComponent, DetalleRequerimientoComponent, AnularRequerimientoComponent, BarraFiltrosBandejaComponent, TablaPaginadaComponent, SiPermisoDirective],
  templateUrl: './lista-requerimientos.component.html',
  styleUrl: './lista-requerimientos.component.scss',
})
export class ListaRequerimientosComponent implements OnInit {
  private readonly crmSvc = inject(CrmService);
  private readonly router  = inject(Router);

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly kpis  = signal<KpisRequerimientos>({ rqActivos: 0, sinPropuesta: 0, slaUrgentes: 0, bloqueados: 0 });
  readonly items = signal<RequerimientoListaItem[]>([]);
  readonly total = signal(0);

  readonly detalleIdAbierto = signal<number | null>(null);

  readonly anularId       = signal<number | null>(null);
  readonly anularNumero   = signal('');
  readonly anularCliente  = signal('');
  readonly anularCategoria = signal<string | null>(null);
  readonly motivos        = signal<CatalogoItem[]>([]);
  readonly estadosRq      = signal<CatalogoItem[]>([]);

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);


  busqueda    = '';
  estadoFiltro = '';

  /** Nº de filtros aplicados (badge del popover). */
  filtrosActivos(): number { return this.estadoFiltro ? 1 : 0; }

  limpiarFiltros(): void {
    this.estadoFiltro = '';
    this.busqueda     = '';
    this.aplicarFiltros();
  }

  readonly breadcrumb: BreadcrumbItem[] = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'CRM' },
    { label: 'Requerimientos' },
  ];

  async ngOnInit(): Promise<void> {
    await this.cargar();
    try {
      const cat = await this.crmSvc.obtenerCatalogos();
      this.estadosRq.set(cat.estadosRq);
      this.motivos.set(cat.motivos);
    } catch { /* silencioso */ }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const res = await this.crmSvc.obtenerRequerimientos(
        this.estadoFiltro || undefined,
        this.busqueda     || undefined,
        this.pagina(),
        this.porPagina(),
      );
      this.kpis.set(res.kpis);
      this.items.set(res.items);
      this.total.set(res.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar requerimientos.');
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltros(): Promise<void> {
    this.pagina.set(1);
    await this.cargar();
  }

  async irPagina(n: number): Promise<void> {
    this.pagina.set(n);
    await this.cargar();
  }

  irANuevo(): void {
    this.router.navigate(['/crm/requerimientos/nuevo']);
  }

  irADetalle(id: number): void {
    this.detalleIdAbierto.set(id);
  }

  async abrirAnular(id: number): Promise<void> {
    const item = this.items().find(i => i.idRequerimiento === id);
    this.anularId.set(id);
    this.anularNumero.set(item?.numero ?? '');
    this.anularCliente.set(item?.razonSocial ?? '');
    this.anularCategoria.set(item?.tipoLabel ?? null);

  }

  async onAnulado(): Promise<void> {
    this.anularId.set(null);
    await this.cargar();
  }

  irAEditar(id: number): void {
    this.router.navigate(['/crm/requerimientos', id, 'editar']);
  }

  irACrearPropuesta(idRequerimiento: number): void {
    this.router.navigate(['/crm/propuestas/nueva'], {
      queryParams: { idRequerimiento },
    });
  }

  /** RQs cerrados o anulados no se editan ni generan propuestas nuevas. */
  esAccionable(estado: string): boolean {
    return estado !== ESTADO_RQ.CERRADO && estado !== ESTADO_RQ.ANULADO;
  }

  estadoClase(estado: string): string {
    const mapa: Record<string, string> = {
      [ESTADO_RQ.NUEVO]:         'badge--azul',
      [ESTADO_RQ.EN_PROCESO]:    'badge--naranja',
      [ESTADO_RQ.CON_PROPUESTA]: 'badge--verde',
      [ESTADO_RQ.CERRADO]:       'badge--gris',
      [ESTADO_RQ.ANULADO]:       'badge--rojo',
    };
    return mapa[estado] ?? '';
  }

  prioridadClase(idPrioridad: number): string {
    // Convención: 1 = Alta · 2 = Media · 3 = Baja
    switch (idPrioridad) {
      case 1:  return 'badge-prioridad--alta';
      case 2:  return 'badge-prioridad--media';
      case 3:  return 'badge-prioridad--baja';
      default: return 'badge-prioridad--media';
    }
  }

  slaClase(item: RequerimientoListaItem): string {
    if (!item.fechaNecesidad) return 'sla--normal';
    const dias = Math.ceil((new Date(item.fechaNecesidad).getTime() - Date.now()) / 86_400_000);
    if (dias <= 0) return 'sla--urgente';
    if (dias <= 3) return 'sla--advertencia';
    return 'sla--normal';
  }

  calcularSlaTexto(item: RequerimientoListaItem): string {
    // Solo mostramos la cantidad de días — el color del punto indica el estado
    // (verde = normal, naranja = próximo, rojo = urgente/vencido).
    if (!item.fechaNecesidad) return '—';
    const dias = Math.ceil((new Date(item.fechaNecesidad).getTime() - Date.now()) / 86_400_000);
    if (dias === 0) return 'Hoy';
    return `${Math.abs(dias)}d`;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    });
  }

}
