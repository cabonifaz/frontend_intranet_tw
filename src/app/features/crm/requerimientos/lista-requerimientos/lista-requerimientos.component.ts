import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../../core/services/crm.service';
import { KpisRequerimientos, RequerimientoListaItem } from '../../../../core/models/crm.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-lista-requerimientos',
  imports: [FormsModule, BreadcrumbComponent],
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
    this.router.navigate(['/crm/requerimientos', id]);
  }

  irAEditar(id: number): void {
    this.router.navigate(['/crm/requerimientos', id, 'editar']);
  }

  estadoClase(estado: string): string {
    const mapa: Record<string, string> = {
      nuevo:         'badge--azul',
      en_proceso:    'badge--naranja',
      con_propuesta: 'badge--verde',
      cerrado:       'badge--gris',
      anulado:       'badge--rojo',
    };
    return mapa[estado] ?? '';
  }

  slaClase(item: RequerimientoListaItem): string {
    const diasDesdeCreacion = Math.floor(
      (Date.now() - new Date(item.fechaCreacion).getTime()) / 86400000
    );
    if (item.idPrioridad === 1 && diasDesdeCreacion >= 7)  return 'sla--urgente';
    if (item.idPrioridad === 1 && diasDesdeCreacion >= 3)  return 'sla--advertencia';
    if (item.idPrioridad === 2 && diasDesdeCreacion >= 14) return 'sla--advertencia';
    return 'sla--normal';
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
