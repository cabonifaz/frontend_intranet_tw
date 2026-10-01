import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EquiposClienteService } from '../../../../core/services/equipos-cliente.service';
import { MaestrosService } from '../../../../core/services/maestros.service';
import {
  CLASIFICACIONES_EQUIPO,
  EquipoClienteListaItem,
} from '../../../../core/models/equipos-cliente.model';
import { ClienteListaItem, SedeListaItem } from '../../../../core/models/maestros.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent }  from '../../../../shared/ui/page-header/page-header.component';
import { FiltrosBarComponent }  from '../../../../shared/ui/filtros-bar/filtros-bar.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { PaginacionComponent }  from '../../../../shared/ui/paginacion/paginacion.component';
import { BadgeEstadoComponent } from '../../../../shared/ui/badge-estado/badge-estado.component';
import { ESTADO_OPCIONES } from '../../../../core/constants/estados';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

const POR_PAGINA = 10;

@Component({
  selector: 'app-lista-equipos-cliente',
  imports: [
    FormsModule,
    BreadcrumbComponent,
    PageHeaderComponent,
    FiltrosBarComponent,
    EstadoVacioComponent,
    TablaMaestroComponent,
    PaginacionComponent,
    BadgeEstadoComponent,
  ],
  templateUrl: './lista-equipos-cliente.component.html',
  styleUrl: './lista-equipos-cliente.component.scss',
})
export class ListaEquiposClienteComponent implements OnInit {
  private readonly equiposSvc  = inject(EquiposClienteService);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly router      = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly items     = signal<EquipoClienteListaItem[]>([]);
  readonly total     = signal(0);
  readonly pagina    = signal(1);
  readonly porPagina = POR_PAGINA;

  readonly clientes = signal<ClienteListaItem[]>([]);
  readonly sedes    = signal<SedeListaItem[]>([]);

  readonly breadcrumb = breadcrumbMaestros('Equipos de Cliente');

  readonly estadoOpciones         = ESTADO_OPCIONES;
  readonly clasificacionesOpciones = CLASIFICACIONES_EQUIPO;

  busqueda              = '';
  clienteFiltro         = 0;
  sedeFiltro            = 0;
  clasificacionFiltro   = '';
  estadoFiltro          = '';
  soloVigentesEnServicio = true;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.cargar(), this.cargarClientes()]);
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) this.pagina.set(1);
    this.cargando.set(true);
    this.error.set('');
    try {
      const r = await this.equiposSvc.obtenerEquipos(
        this.busqueda || undefined,
        this.clienteFiltro || undefined,
        this.sedeFiltro || undefined,
        this.clasificacionFiltro || undefined,
        this.estadoFiltro || undefined,
        this.soloVigentesEnServicio,
        this.pagina(),
        this.porPagina,
      );
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar equipos.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarClientes(): Promise<void> {
    try {
      const r = await this.maestrosSvc.obtenerClientes(undefined, undefined, 1, 100);
      this.clientes.set(r.items);
    } catch {
      // Si falla, dropdown Cliente queda vacío — no bloquea la vista
      this.clientes.set([]);
    }
  }

  async onClienteFiltroChange(): Promise<void> {
    this.sedeFiltro = 0;
    this.sedes.set([]);
    if (this.clienteFiltro) {
      try {
        const sedes = await this.maestrosSvc.obtenerSedesPorCliente(this.clienteFiltro);
        this.sedes.set(sedes);
      } catch { /* sedes vacías */ }
    }
    await this.cargar(true);
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    await this.cargar();
  }

  irANuevo(): void {
    this.router.navigate(['/maestros/equipos/nuevo']);
  }

  irAEditar(id: number): void {
    this.router.navigate(['/maestros/equipos', id]);
  }

  async toggleEstado(eq: EquipoClienteListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevo = eq.estado === 'Inactivo' ? 'Vigente' : 'Inactivo';
    try {
      await this.equiposSvc.cambiarEstadoEquipo({ idEquipo: eq.idEquipo, estado: nuevo });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }
}
