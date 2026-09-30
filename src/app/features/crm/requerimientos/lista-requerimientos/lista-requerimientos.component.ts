import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../../core/services/crm.service';
import { KpisRequerimientos, RequerimientoListaItem, CatalogoItem } from '../../../../core/models/crm.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { DetalleRequerimientoComponent } from '../detalle-requerimiento/detalle-requerimiento.component';
import { AnularRequerimientoComponent } from '../anular-requerimiento/anular-requerimiento.component';
import { ESTADO_RQ } from '../../../../core/constants/estados';

@Component({
  selector: 'app-lista-requerimientos',
  imports: [FormsModule, BreadcrumbComponent, KpiCardComponent, DetalleRequerimientoComponent, AnularRequerimientoComponent],
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

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()) || 1);
  readonly inicio       = computed(() => (this.pagina() - 1) * this.porPagina() + 1);
  readonly fin          = computed(() => Math.min(this.pagina() * this.porPagina(), this.total()));

  busqueda    = '';
  estadoFiltro = '';

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
    if (n < 1 || n > this.totalPaginas()) return;
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

  slaClase(item: RequerimientoListaItem): string {
    if (!item.fechaNecesidad) return 'sla--normal';
    const dias = Math.ceil((new Date(item.fechaNecesidad).getTime() - Date.now()) / 86_400_000);
    if (dias <= 0) return 'sla--urgente';
    if (dias <= 3) return 'sla--advertencia';
    return 'sla--normal';
  }

  calcularSlaTexto(item: RequerimientoListaItem): string {
    if (!item.fechaNecesidad) return 'Sin fecha';
    const dias = Math.ceil((new Date(item.fechaNecesidad).getTime() - Date.now()) / 86_400_000);
    if (dias < 0)   return `${Math.abs(dias)}d vencido`;
    if (dias === 0) return 'Vence hoy';
    return `${dias}d restantes`;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    });
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
}
