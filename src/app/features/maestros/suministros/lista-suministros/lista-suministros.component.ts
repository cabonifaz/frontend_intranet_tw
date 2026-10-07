import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuministrosService } from '../../../../core/services/suministros.service';
import {
  SuministroListaItem,
  OpcionCatalogo,
} from '../../../../core/models/suministros.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent }  from '../../../../shared/ui/page-header/page-header.component';
import { FiltrosBarComponent }  from '../../../../shared/ui/filtros-bar/filtros-bar.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { PaginacionComponent }  from '../../../../shared/ui/paginacion/paginacion.component';
import { BadgeEstadoComponent } from '../../../../shared/ui/badge-estado/badge-estado.component';
import { ESTADO, ESTADO_OPCIONES } from '../../../../core/constants/estados';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

const POR_PAGINA = 10;

@Component({
  selector: 'app-lista-suministros',
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
  templateUrl: './lista-suministros.component.html',
  styleUrl: './lista-suministros.component.scss',
})
export class ListaSuministrosComponent implements OnInit {
  private readonly suministrosSvc = inject(SuministrosService);
  private readonly router         = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly items     = signal<SuministroListaItem[]>([]);
  readonly total     = signal(0);
  readonly pagina    = signal(1);
  readonly porPagina = POR_PAGINA;

  readonly breadcrumb = breadcrumbMaestros('Suministros');

  readonly estadoOpciones = ESTADO_OPCIONES;
  readonly clasesOpciones = signal<OpcionCatalogo[]>([]);
  readonly tiposOpciones  = signal<OpcionCatalogo[]>([]);
  // Cache local para los labels en la columna "Marca · Modelo"
  private readonly marcasLookup  = signal<OpcionCatalogo[]>([]);
  private readonly modelosLookup = signal<OpcionCatalogo[]>([]);

  busqueda        = '';
  claseFiltro     = '';
  tipoFiltro      = '';
  estadoFiltro    = ESTADO.ACTIVO;

  async ngOnInit(): Promise<void> {
    const [clases, tipos, marcas, modelos] = await Promise.all([
      this.suministrosSvc.obtenerClases(),
      this.suministrosSvc.obtenerTipos(),
      this.suministrosSvc.obtenerMarcas(),
      this.suministrosSvc.obtenerModelos(),
    ]);
    this.clasesOpciones.set(clases);
    this.tiposOpciones.set(tipos);
    this.marcasLookup.set(marcas);
    this.modelosLookup.set(modelos);
    await this.cargar();
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) this.pagina.set(1);
    this.cargando.set(true);
    this.error.set('');
    try {
      const r = await this.suministrosSvc.obtenerSuministros(
        this.busqueda || undefined,
        this.claseFiltro || undefined,
        this.tipoFiltro || undefined,
        this.estadoFiltro || undefined,
        false,
        this.pagina(),
        this.porPagina,
      );
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar suministros.');
    } finally {
      this.cargando.set(false);
    }
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    await this.cargar();
  }

  irANuevo(): void {
    this.router.navigate(['/maestros/suministros/nuevo']);
  }

  irAEditar(id: number): void {
    this.router.navigate(['/maestros/suministros', id]);
  }

  async toggleEstado(s: SuministroListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = s.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.suministrosSvc.cambiarEstadoSuministro({
        idSuministro: s.idSuministro,
        estado:       nuevoEstado,
      });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }

  truncar(texto: string, max = 90): string {
    const limpio = texto.replace(/\n/g, ' ').trim();
    return limpio.length <= max ? limpio : limpio.substring(0, max) + '…';
  }

  marcaLabel(s: SuministroListaItem): string {
    return this.marcasLookup().find(m => m.value === s.marca)?.label ?? s.marca;
  }

  modeloLabel(s: SuministroListaItem): string {
    return this.modelosLookup().find(m => m.value === s.modelo)?.label ?? s.modelo;
  }
}
