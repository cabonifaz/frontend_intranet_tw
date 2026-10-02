import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import {
  EstadoPropuesta,
  ESTADOS_PROPUESTA_TABS,
  KpisPropuestas,
  PropuestaListaItem,
  TipoPropuesta,
  TIPOS_PROPUESTA,
} from '../../../../core/models/propuestas.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';

@Component({
  selector: 'app-lista-propuestas',
  imports: [FormsModule, BreadcrumbComponent, KpiCardComponent],
  templateUrl: './lista-propuestas.component.html',
  styleUrl: './lista-propuestas.component.scss',
})
export class ListaPropuestasComponent implements OnInit {
  private readonly propuestasSvc = inject(PropuestasService);
  private readonly router        = inject(Router);

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly kpis  = signal<KpisPropuestas>({
    pendientes: 0, variacionPendientes: 0,
    porVistoBueno: 0, porEnviar: 0, enSeguimiento: 0, slaVencidos: 0,
  });
  readonly items = signal<PropuestaListaItem[]>([]);
  readonly total = signal(0);

  readonly comerciales = signal<string[]>([]);

  readonly estadosTabs = ESTADOS_PROPUESTA_TABS;
  readonly tipos       = TIPOS_PROPUESTA;
  readonly anios       = [2026, 2025, 2024, 2023];

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()) || 1);
  readonly inicio       = computed(() => (this.pagina() - 1) * this.porPagina() + 1);
  readonly fin          = computed(() => Math.min(this.pagina() * this.porPagina(), this.total()));

  readonly estadoActivo = signal<EstadoPropuesta | 'todas'>('todas');

  // Filtros bindeados a los inputs (no gatillan carga hasta que el usuario busca)
  busqueda      = '';
  anioFiltro: number | '' = 2024;
  comercialFiltro = 'todos';
  tipoFiltro: TipoPropuesta | 'cualquiera' = 'cualquiera';

  readonly breadcrumb: BreadcrumbItem[] = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'CRM' },
    { label: 'Propuestas' },
  ];

  async ngOnInit(): Promise<void> {
    await this.cargar();
    try {
      this.comerciales.set(await this.propuestasSvc.obtenerComerciales());
    } catch { /* silencioso */ }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const res = await this.propuestasSvc.obtenerPropuestas({
        busqueda:  this.busqueda || undefined,
        estado:    this.estadoActivo(),
        anio:      this.anioFiltro === '' ? undefined : this.anioFiltro,
        comercial: this.comercialFiltro,
        tipo:      this.tipoFiltro,
        pagina:    this.pagina(),
        porPagina: this.porPagina(),
      });
      this.kpis.set(res.kpis);
      this.items.set(res.items);
      this.total.set(res.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar propuestas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltros(): Promise<void> {
    this.pagina.set(1);
    await this.cargar();
  }

  limpiarFiltros(): void {
    this.busqueda        = '';
    this.anioFiltro      = 2024;
    this.comercialFiltro = 'todos';
    this.tipoFiltro      = 'cualquiera';
    this.aplicarFiltros();
  }

  async cambiarTab(estado: EstadoPropuesta | 'todas'): Promise<void> {
    this.estadoActivo.set(estado);
    this.pagina.set(1);
    await this.cargar();
  }

  async irPagina(n: number): Promise<void> {
    if (n < 1 || n > this.totalPaginas()) return;
    this.pagina.set(n);
    await this.cargar();
  }

  irANuevo(): void {
    this.router.navigate(['/crm/propuestas/nueva']);
  }

  irAEditar(id: number): void {
    this.router.navigate(['/crm/propuestas', id, 'editar']);
  }

  // ─── Helpers de presentación ──────────────────────────────────────────────
  tipoClase(tipo: string): string {
    const mapa: Record<string, string> = {
      servicio: 'badge-tipo--servicio',
      mixta:    'badge-tipo--mixta',
      proyecto: 'badge-tipo--proyecto',
    };
    return mapa[tipo] ?? '';
  }

  formatearMonto(monto: number, moneda: string): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda === 'USD' ? 'USD' : 'PEN',
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
    }).format(monto).replace(/^(PEN|USD)\s*/, '');
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
