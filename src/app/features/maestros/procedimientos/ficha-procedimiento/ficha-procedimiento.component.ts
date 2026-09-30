import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProcedimientosService } from '../../../../core/services/procedimientos.service';
import {
  AREAS_TECNICAS,
  GuardarProcedimientoRequest,
  SEGMENTOS_METROLOGICOS,
  SEGMENTOS_REGULADOS,
} from '../../../../core/models/procedimientos.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CampoComponent }  from '../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../shared/ui/toggle/toggle.component';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

@Component({
  selector: 'app-ficha-procedimiento',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    BreadcrumbComponent,
    PageHeaderComponent,
    SeccionComponent,
    FormFooterComponent,
    EstadoVacioComponent,
    ButtonComponent,
    CampoComponent,
    ToggleComponent,
  ],
  templateUrl: './ficha-procedimiento.component.html',
  styleUrl: './ficha-procedimiento.component.scss',
})
export class FichaProcedimientoComponent implements OnInit {
  private readonly fb      = inject(FormBuilder);
  private readonly procSvc = inject(ProcedimientosService);
  private readonly toastSvc = inject(ToastService);
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);

  readonly cargando          = signal(true);
  readonly guardando         = signal(false);
  readonly guardandoBorrador = signal(false);
  readonly error             = signal('');
  readonly esNuevo           = signal(true);
  readonly totalEdiciones    = signal(0);
  readonly usuarioRegistro   = signal('');
  readonly fechaRegistro     = signal('');
  readonly fechaModificacion = signal('');

  readonly segmentosRegulados     = SEGMENTOS_REGULADOS;
  readonly segmentosMetrologicos  = SEGMENTOS_METROLOGICOS;
  readonly areasTecnicas          = AREAS_TECNICAS;

  idProcedimiento = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Identificación y Clasificación Técnica
    codigo:                   ['', [Validators.required, Validators.minLength(2)]],
    anioEmision:              [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    versionOficial:           [1, [Validators.required, Validators.min(1)]],
    version:                  [1, [Validators.required, Validators.min(1)]],
    revision:                 [1, [Validators.required, Validators.min(1)]],
    alcanceNorma:             [''],
    tipoSegmentoRegulado:     ['', Validators.required],
    tipoSegmentoMetrologico:  ['', Validators.required],

    // 02 - Descripción y Alcance Metrológico
    alcanceTitulo:               ['', [Validators.required, Validators.minLength(10)]],
    descripcion:                 ['', Validators.required],
    norma:                       [''],
    normaNacionalRangoSuperior:  [''],
    normaNacionalRangoInferior:  [''],

    // 03 - Documentación Técnica y Digitalización
    esFormatoDigitalIso:   [true],
    enlaceCatalogoExterno: [''],

    // Sidebar - Estado & Operatividad
    esActivo:            [true],
    esVigente:           [true],
    esVigenteIso17025:   [true],
    sincronizarAppMovil: [true],

    // Sidebar - Servicios Aplicables
    aplicaCalibracionLab:       [true],
    aplicaVerificacionCampo:    [false],
    aplicaMantenimiento:        [false],
    aplicaCertificacionExterna: [false],
    areaTecnicaResponsable:     ['metrologia_legal'],
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Procedimientos', ruta: '/maestros/procedimientos' },
    this.esNuevo() ? 'Nuevo Registro' : 'Editar Registro',
  ));

  readonly codigoBadge = computed(() => {
    if (this.esNuevo()) return 'AUTO · PC-NEW';
    return `ID · ${this.idProcedimiento}`;
  });

  readonly previewCodigo = computed(() => this.formulario.get('codigo')?.value || 'PC-NEW');
  readonly previewAnio    = computed(() => this.formulario.get('anioEmision')?.value || '—');
  readonly previewVersion = computed(() => this.formulario.get('versionOficial')?.value || 1);
  readonly previewTitulo  = computed(() => this.formulario.get('alcanceTitulo')?.value || 'Título del procedimiento');

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);

    try {
      if (!nuevo) {
        this.idProcedimiento = Number(idParam);
        const p = await this.procSvc.obtenerProcedimientoPorId(this.idProcedimiento);
        this.formulario.patchValue({
          codigo:                   p.codigo,
          anioEmision:              p.anioEmision,
          versionOficial:           p.versionOficial,
          version:                  p.version,
          revision:                 p.revision,
          alcanceNorma:             p.alcanceNorma,
          tipoSegmentoRegulado:     p.tipoSegmentoRegulado,
          tipoSegmentoMetrologico:  p.tipoSegmentoMetrologico,
          alcanceTitulo:            p.alcanceTitulo,
          descripcion:              p.descripcion,
          norma:                    p.norma,
          normaNacionalRangoSuperior: p.normaNacionalRangoSuperior,
          normaNacionalRangoInferior: p.normaNacionalRangoInferior,
          esFormatoDigitalIso:      p.esFormatoDigitalIso,
          enlaceCatalogoExterno:    p.enlaceCatalogoExterno,
          esActivo:                 p.esActivo,
          esVigente:                p.esVigente,
          esVigenteIso17025:        p.esVigenteIso17025,
          sincronizarAppMovil:      p.sincronizarAppMovil,
          aplicaCalibracionLab:     p.aplicaCalibracionLab,
          aplicaVerificacionCampo:  p.aplicaVerificacionCampo,
          aplicaMantenimiento:      p.aplicaMantenimiento,
          aplicaCertificacionExterna: p.aplicaCertificacionExterna,
          areaTecnicaResponsable:   p.areaTecnicaResponsable,
        });
        this.totalEdiciones.set(p.totalEdiciones);
        this.usuarioRegistro.set(p.usuarioRegistro);
        this.fechaRegistro.set(p.fechaRegistro);
        this.fechaModificacion.set(p.fechaModificacion);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el procedimiento.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Foto/PDF placeholder — upload real pendiente (ver memoria: project_hu86_upload_pendiente)
  onAdjuntarPdf(): void { this.toastSvc.exito('Adjuntar PDF disponible cuando el back tenga endpoint de storage.'); }
  onVerPdf():      void { this.toastSvc.exito('Preview PDF disponible cuando el archivo esté cargado.'); }

  limpiarFormulario(): void {
    this.formulario.reset({
      anioEmision: new Date().getFullYear(),
      version: 1, revision: 1, versionOficial: 1,
      esFormatoDigitalIso: true,
      esActivo: true, esVigente: true, esVigenteIso17025: true, sincronizarAppMovil: true,
      aplicaCalibracionLab: true,
      areaTecnicaResponsable: 'metrologia_legal',
    });
    this.toastSvc.exito('Formulario limpiado.');
  }

  guardarComoPlantilla(): void {
    if (this.esNuevo()) { this.toastSvc.error('Solo puedes duplicar un procedimiento ya guardado.'); return; }
    this.esNuevo.set(true);
    this.idProcedimiento = 0;
    this.router.navigate(['/maestros/procedimientos/nuevo']);
    this.toastSvc.exito('Procedimiento duplicado como plantilla — completa lo necesario y guarda.');
  }

  async guardar(guardarComoBorrador: boolean): Promise<void> {
    if (!guardarComoBorrador && this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.toastSvc.error('Revisa los campos marcados en rojo.');
      return;
    }
    if (this.guardando() || this.guardandoBorrador()) return;

    const flag = guardarComoBorrador ? this.guardandoBorrador : this.guardando;
    flag.set(true);
    this.error.set('');
    try {
      const v = this.formulario.value;
      const dto: GuardarProcedimientoRequest = {
        idProcedimiento:   this.idProcedimiento,
        codigo:            v.codigo?.trim().toUpperCase() ?? '',
        anio:              Number(v.anioEmision) || new Date().getFullYear(),
        version:           Number(v.version) || 1,
        revision:          Number(v.revision) || 1,
        norma:             v.norma ?? '',
        descripcion:       v.descripcion?.trim() ?? '',
        esVigente:         !!v.esVigente,
        anioEmision:               Number(v.anioEmision) || new Date().getFullYear(),
        versionOficial:            Number(v.versionOficial) || 1,
        alcanceNorma:              v.alcanceNorma ?? '',
        tipoSegmentoRegulado:      v.tipoSegmentoRegulado,
        tipoSegmentoMetrologico:   v.tipoSegmentoMetrologico,
        alcanceTitulo:             v.alcanceTitulo?.trim() ?? '',
        normaNacionalRangoSuperior: v.normaNacionalRangoSuperior ?? '',
        normaNacionalRangoInferior: v.normaNacionalRangoInferior ?? '',
        esFormatoDigitalIso:       !!v.esFormatoDigitalIso,
        urlPdfAprobado:            '',
        enlaceCatalogoExterno:     v.enlaceCatalogoExterno ?? '',
        esActivo:                  !!v.esActivo,
        esVigenteIso17025:         !!v.esVigenteIso17025,
        sincronizarAppMovil:       !!v.sincronizarAppMovil,
        aplicaCalibracionLab:      !!v.aplicaCalibracionLab,
        aplicaVerificacionCampo:   !!v.aplicaVerificacionCampo,
        aplicaMantenimiento:       !!v.aplicaMantenimiento,
        aplicaCertificacionExterna: !!v.aplicaCertificacionExterna,
        areaTecnicaResponsable:    v.areaTecnicaResponsable,
        guardarComoBorrador,
      };
      await this.procSvc.guardarProcedimiento(dto);
      this.toastSvc.exito(
        guardarComoBorrador
          ? 'Procedimiento guardado como borrador.'
          : this.esNuevo()
            ? 'Procedimiento registrado y activado correctamente.'
            : 'Procedimiento actualizado correctamente.'
      );
      this.router.navigate(['/maestros/procedimientos']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el procedimiento.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      flag.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/procedimientos']);
  }
}
