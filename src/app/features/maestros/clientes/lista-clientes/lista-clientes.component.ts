import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { ClienteListaItem } from '../../../../core/models/maestros.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';
import { PageHeaderComponent }   from '../../../../shared/ui/page-header/page-header.component';
import { FiltrosBarComponent }   from '../../../../shared/ui/filtros-bar/filtros-bar.component';
import { EstadoVacioComponent }  from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { PaginacionComponent }   from '../../../../shared/ui/paginacion/paginacion.component';
import { BadgeEstadoComponent }  from '../../../../shared/ui/badge-estado/badge-estado.component';
import { PermisoDirective } from '../../../../shared/directives/permiso.directive';
import { ESTADO, ESTADO_OPCIONES } from '../../../../core/constants/estados';

const POR_PAGINA = 20;

@Component({
  selector: 'app-lista-clientes',
  imports: [
    FormsModule,
    BreadcrumbComponent,
    PageHeaderComponent,
    FiltrosBarComponent,
    EstadoVacioComponent,
    TablaMaestroComponent,
    PaginacionComponent,
    BadgeEstadoComponent,
    PermisoDirective
  ],
  templateUrl: './lista-clientes.component.html',
  styleUrl: './lista-clientes.component.scss',
})
export class ListaClientesComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly router      = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly clientes  = signal<ClienteListaItem[]>([]);
  readonly total     = signal(0);
  readonly pagina    = signal(1);
  readonly porPagina = POR_PAGINA;

  readonly breadcrumb = breadcrumbMaestros('Clientes');

  readonly estadoOpciones = ESTADO_OPCIONES;

  busqueda = '';
  estadoFiltro = '';

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) this.pagina.set(1);
    this.cargando.set(true);
    this.error.set('');
    try {
      const resultado = await this.maestrosSvc.obtenerClientes(
        this.busqueda || undefined,
        this.estadoFiltro || undefined,
        this.pagina(),
        this.porPagina,
      );
      this.clientes.set(resultado.items);
      this.total.set(resultado.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar clientes.');
    } finally {
      this.cargando.set(false);
    }
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    await this.cargar();
  }

  irAFicha(idCliente: number): void {
    this.router.navigate(['/maestros/clientes', idCliente]);
  }

  irANuevo(): void {
    this.router.navigate(['/maestros/clientes/nuevo']);
  }

  async toggleEstado(cliente: ClienteListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = cliente.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.maestrosSvc.cambiarEstadoCliente({
        idCliente: cliente.idCliente,
        estado: nuevoEstado,
      });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }
}
