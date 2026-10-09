import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DirectorioService } from '../../../core/services/directorio.service';
import { AreasService, AreaItem } from '../../../core/services/areas.service';
import { DirectorioItem } from '../../../core/models/directorio.model';
import { BreadcrumbComponent } from '../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbDirectorio } from '../../../core/constants/breadcrumbs';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { FiltrosBarComponent } from '../../../shared/ui/filtros-bar/filtros-bar.component';
import { EstadoVacioComponent } from '../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { PaginacionComponent } from '../../../shared/ui/paginacion/paginacion.component';
import { ModalFichaContactoComponent } from '../modal-ficha-contacto/modal-ficha-contacto.component';

const POR_PAGINA = 50;

@Component({
  selector: 'app-lista-directorio',
  imports: [
    FormsModule,
    BreadcrumbComponent,
    PageHeaderComponent,
    FiltrosBarComponent,
    EstadoVacioComponent,
    TablaMaestroComponent,
    PaginacionComponent,
    ModalFichaContactoComponent,
  ],
  templateUrl: './lista-directorio.component.html',
  styleUrl: './lista-directorio.component.scss',
})
export class ListaDirectorioComponent implements OnInit {
  private readonly directorioSvc = inject(DirectorioService);
  private readonly areasSvc      = inject(AreasService);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly items     = signal<DirectorioItem[]>([]);
  readonly total     = signal(0);
  readonly pagina    = signal(1);
  readonly porPagina = POR_PAGINA;
  readonly areas     = signal<AreaItem[]>([]);
  readonly contactoAbierto = signal<DirectorioItem | null>(null);

  readonly breadcrumb = breadcrumbDirectorio();

  busqueda   = '';
  areaFiltro = '';

  async ngOnInit(): Promise<void> {
    this.areasSvc.listar().then(a => this.areas.set(a)).catch(() => {});
    await this.cargar();
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) this.pagina.set(1);
    this.cargando.set(true);
    this.error.set('');
    try {
      const r = await this.directorioSvc.obtenerDirectorio(
        this.busqueda   || undefined,
        this.areaFiltro || undefined,
        this.pagina(),
        this.porPagina,
      );
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el directorio.');
    } finally {
      this.cargando.set(false);
    }
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    await this.cargar();
  }

  abrirContacto(c: DirectorioItem): void {
    this.contactoAbierto.set(c);
  }

  cerrarContacto(): void {
    this.contactoAbierto.set(null);
  }

  iniciales(nombreCompleto: string): string {
    const partes = nombreCompleto.trim().split(/\s+/);
    const primera = partes[0]?.charAt(0) ?? '';
    const ultima  = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primera}${ultima}`.toUpperCase();
  }
}
