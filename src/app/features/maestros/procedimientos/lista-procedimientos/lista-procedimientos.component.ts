import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProcedimientosService } from '../../../../core/services/procedimientos.service';
import { ProcedimientoListaItem } from '../../../../core/models/procedimientos.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent }  from '../../../../shared/ui/page-header/page-header.component';
import { FiltrosBarComponent }  from '../../../../shared/ui/filtros-bar/filtros-bar.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { PaginacionComponent }  from '../../../../shared/ui/paginacion/paginacion.component';
import { BadgeEstadoComponent } from '../../../../shared/ui/badge-estado/badge-estado.component';
import { PermisoDirective } from '../../../../shared/directives/permiso.directive';
import { ESTADO, ESTADO_OPCIONES } from '../../../../core/constants/estados';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

const POR_PAGINA = 15;

@Component({
  selector: 'app-lista-procedimientos',
  imports: [
    FormsModule,
    DatePipe,
    BreadcrumbComponent,
    PageHeaderComponent,
    FiltrosBarComponent,
    EstadoVacioComponent,
    TablaMaestroComponent,
    PaginacionComponent,
    BadgeEstadoComponent,
    PermisoDirective
  ],
  templateUrl: './lista-procedimientos.component.html',
  styleUrl: './lista-procedimientos.component.scss',
})
export class ListaProcedimientosComponent implements OnInit {
  private readonly procSvc = inject(ProcedimientosService);
  private readonly router  = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly items     = signal<ProcedimientoListaItem[]>([]);
  readonly total     = signal(0);
  readonly pagina    = signal(1);
  readonly porPagina = POR_PAGINA;

  readonly breadcrumb = breadcrumbMaestros('Procedimientos');

  readonly estadoOpciones = ESTADO_OPCIONES;
  readonly aniosOpciones  = computed(() => {
    const desde = 2007, hasta = new Date().getFullYear();
    const arr: number[] = [];
    for (let a = hasta; a >= desde; a--) arr.push(a);
    return arr;
  });

  busqueda      = '';
  anioFiltro    = 0;
  estadoFiltro  = ESTADO.ACTIVO;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) this.pagina.set(1);
    this.cargando.set(true);
    this.error.set('');
    try {
      const r = await this.procSvc.obtenerProcedimientos(
        this.busqueda || undefined,
        this.anioFiltro || undefined,
        this.estadoFiltro || undefined,
        this.pagina(),
        this.porPagina,
      );
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar procedimientos.');
    } finally {
      this.cargando.set(false);
    }
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    await this.cargar();
  }

  irANuevo(): void {
    this.router.navigate(['/maestros/procedimientos/nuevo']);
  }

  irAEditar(id: number): void {
    this.router.navigate(['/maestros/procedimientos', id]);
  }

  async toggleEstado(p: ProcedimientoListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = p.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.procSvc.cambiarEstadoProcedimiento({
        idProcedimiento: p.idProcedimiento,
        estado:          nuevoEstado,
      });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }

  truncar(texto: string, max = 110): string {
    const limpio = texto.replace(/\n/g, ' ').trim();
    return limpio.length <= max ? limpio : limpio.substring(0, max) + '…';
  }
}
