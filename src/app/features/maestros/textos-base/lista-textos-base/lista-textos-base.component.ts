import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TextosBaseService } from '../../../../core/services/textos-base.service';
import {
  TextoBaseListaItem,
  CATEGORIAS_TEXTO_BASE,
} from '../../../../core/models/textos-base.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { FiltrosBarComponent } from '../../../../shared/ui/filtros-bar/filtros-bar.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { PaginacionComponent } from '../../../../shared/ui/paginacion/paginacion.component';
import { BadgeEstadoComponent } from '../../../../shared/ui/badge-estado/badge-estado.component';
import { PermisoDirective } from '../../../../shared/directives/permiso.directive';
import { ESTADO, ESTADO_OPCIONES } from '../../../../core/constants/estados';

const POR_PAGINA = 10;

@Component({
  selector: 'app-lista-textos-base',
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
  templateUrl: './lista-textos-base.component.html',
  styleUrl: './lista-textos-base.component.scss',
})
export class ListaTextosBaseComponent implements OnInit {
  private readonly textosSvc = inject(TextosBaseService);
  private readonly router    = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly textos    = signal<TextoBaseListaItem[]>([]);
  readonly total     = signal(0);
  readonly pagina    = signal(1);
  readonly porPagina = POR_PAGINA;

  readonly breadcrumb = breadcrumbMaestros('Textos Base');

  readonly estadoOpciones     = ESTADO_OPCIONES;
  readonly categoriasOpciones = CATEGORIAS_TEXTO_BASE;

  busqueda             = '';
  tipoCategoriaFiltro  = '';
  estadoFiltro         = ESTADO.ACTIVO;
  soloPredeterminados  = true;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) this.pagina.set(1);
    this.cargando.set(true);
    this.error.set('');
    try {
      const r = await this.textosSvc.obtenerTextosBase(
        this.busqueda || undefined,
        this.tipoCategoriaFiltro || undefined,
        this.estadoFiltro || undefined,
        this.soloPredeterminados,
        this.pagina(),
        this.porPagina,
      );
      this.textos.set(r.items);
      this.total.set(r.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar textos base.');
    } finally {
      this.cargando.set(false);
    }
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    await this.cargar();
  }

  irANuevo(): void {
    this.router.navigate(['/maestros/textos-base/nuevo']);
  }

  irAEditar(id: number): void {
    this.router.navigate(['/maestros/textos-base', id]);
  }

  async toggleEstado(t: TextoBaseListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = t.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.textosSvc.cambiarEstadoTextoBase({
        idTextoBase: t.idTextoBase,
        estado:      nuevoEstado,
      });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }

  truncar(texto: string, max = 100): string {
    const limpio = texto.replace(/\n/g, ' ').trim();
    return limpio.length <= max ? limpio : limpio.substring(0, max) + '…';
  }
}
