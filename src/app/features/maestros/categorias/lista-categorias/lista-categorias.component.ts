import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaestrosService } from '../../../../core/services/maestros.service';
import {
  CategoriaCliente,
  GuardarCategoriaRequest,
} from '../../../../core/models/maestros.model';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';
import { PageHeaderComponent }   from '../../../../shared/ui/page-header/page-header.component';
import { EstadoVacioComponent }  from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';
import { BadgeEstadoComponent }  from '../../../../shared/ui/badge-estado/badge-estado.component';
import { PermisoDirective } from '../../../../shared/directives/permiso.directive';
import { ESTADO } from '../../../../core/constants/estados';

@Component({
  selector: 'app-lista-categorias',
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    PageHeaderComponent,
    EstadoVacioComponent,
    TablaMaestroComponent,
    BadgeEstadoComponent,
    PermisoDirective
  ],
  templateUrl: './lista-categorias.component.html',
  styleUrl: './lista-categorias.component.scss',
})
export class ListaCategoriasComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);

  readonly cargando   = signal(true);
  readonly guardando  = signal(false);
  readonly error      = signal('');
  readonly categorias = signal<CategoriaCliente[]>([]);
  readonly modalOpen  = signal(false);
  readonly editandoId = signal<number | null>(null);

  readonly breadcrumb = breadcrumbMaestros('Categorías de Cliente');

  formulario: FormGroup = this.fb.group({
    nombre:            ['', Validators.required],
    descripcion:       [''],
    prioridadAtencion: [null],
    pctGananciaMin:    [null],
    pctGananciaMax:    [null],
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const lista = await this.maestrosSvc.obtenerCategorias();
      this.categorias.set(lista);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar categorías.');
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModal(cat?: CategoriaCliente): void {
    this.error.set('');
    if (cat) {
      this.editandoId.set(cat.idCategoria);
      this.formulario.patchValue({
        nombre:            cat.nombre,
        descripcion:       cat.descripcion ?? '',
        prioridadAtencion: cat.prioridadAtencion,
        pctGananciaMin:    cat.pctGananciaMin,
        pctGananciaMax:    cat.pctGananciaMax,
      });
    } else {
      this.editandoId.set(null);
      this.formulario.reset({
        nombre: '', descripcion: '',
        prioridadAtencion: null, pctGananciaMin: null, pctGananciaMax: null,
      });
    }
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.editandoId.set(null);
    this.formulario.reset();
    this.error.set('');
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      const v = this.formulario.value;
      const dto: GuardarCategoriaRequest = {
        idCategoria:       this.editandoId() ?? 0,
        nombre:            v.nombre,
        descripcion:       v.descripcion || null,
        prioridadAtencion: v.prioridadAtencion ?? null,
        pctGananciaMin:    v.pctGananciaMin ?? null,
        pctGananciaMax:    v.pctGananciaMax ?? null,
      };
      await this.maestrosSvc.guardarCategoria(dto);
      this.cerrarModal();
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar la categoría.');
    } finally {
      this.guardando.set(false);
    }
  }

  async toggleEstado(cat: CategoriaCliente, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = cat.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.maestrosSvc.cambiarEstadoCategoria({ idCategoria: cat.idCategoria, estado: nuevoEstado });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }
}
