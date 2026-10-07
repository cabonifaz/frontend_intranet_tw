import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RequisitosSsomaService, RequisitoSsoma } from '../../../../core/services/requisitos-ssoma.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BreadcrumbComponent } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';
import { PageHeaderComponent }   from '../../../../shared/ui/page-header/page-header.component';
import { EstadoVacioComponent }  from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { TablaMaestroComponent } from '../../../../shared/ui/tabla-maestro/tabla-maestro.component';

/**
 * Mantenimiento del catálogo global "Requisitos SSOMA" (tabla_maestra IdMaestro=48).
 * Son los requisitos de seguridad que las asistentes de servicio técnico marcan
 * por cliente en la sección SSOMA de la ficha de Cliente.
 */
@Component({
  selector: 'app-lista-requisitos-ssoma',
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    PageHeaderComponent,
    EstadoVacioComponent,
    TablaMaestroComponent,
  ],
  templateUrl: './lista-requisitos-ssoma.component.html',
  styleUrl: './lista-requisitos-ssoma.component.scss',
})
export class ListaRequisitosSsomaComponent implements OnInit {
  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(RequisitosSsomaService);
  private readonly toastSvc = inject(ToastService);

  readonly cargando    = signal(true);
  readonly guardando   = signal(false);
  readonly error       = signal('');
  readonly requisitos  = signal<RequisitoSsoma[]>([]);
  readonly modalOpen   = signal(false);
  // En este catálogo editamos por `codigo` (String2) — es la clave estable.
  // null = crear nuevo.
  readonly editandoCodigo = signal<string | null>(null);

  readonly breadcrumb = breadcrumbMaestros('Requisitos SSOMA');

  formulario: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    codigo: [''],   // opcional al crear; en editar queda disabled
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.requisitos.set(await this.svc.listar());
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar los requisitos.');
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModal(req?: RequisitoSsoma): void {
    this.error.set('');
    if (req) {
      this.editandoCodigo.set(req.codigo);
      this.formulario.patchValue({ nombre: req.nombre, codigo: req.codigo });
      this.formulario.get('codigo')?.disable();
    } else {
      this.editandoCodigo.set(null);
      this.formulario.reset({ nombre: '', codigo: '' });
      this.formulario.get('codigo')?.enable();
    }
    this.modalOpen.set(true);
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.editandoCodigo.set(null);
    this.formulario.reset();
    this.formulario.get('codigo')?.enable();
    this.error.set('');
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      const v = this.formulario.getRawValue();
      const nombre = v.nombre?.trim() ?? '';
      const codigo = v.codigo?.trim() || undefined;
      const editando = this.editandoCodigo();
      if (editando) {
        await this.svc.renombrar(editando, nombre);
        this.toastSvc.exito('Requisito actualizado.');
      } else {
        await this.svc.crear(nombre, codigo);
        this.toastSvc.exito('Requisito creado.');
      }
      this.cerrarModal();
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar el requisito.');
    } finally {
      this.guardando.set(false);
    }
  }
}
