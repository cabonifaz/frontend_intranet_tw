import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { ProcedimientosService } from '../../../../core/services/procedimientos.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import {
  GuardarProcedimientoRequest,
} from '../../../../core/models/procedimientos.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CampoComponent }  from '../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../shared/ui/toggle/toggle.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
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
    ModalComponent,
    ModalBorradorComponent,
  ],
  templateUrl: './ficha-procedimiento.component.html',
  styleUrl: './ficha-procedimiento.component.scss',
})
export class FichaProcedimientoComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly procSvc     = inject(ProcedimientosService);
  private readonly borradorSvc = inject(BorradorService);
  private readonly toastSvc    = inject(ToastService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly sanitizer   = inject(DomSanitizer);

  private pdfBlobUrl: string | null = null;

  // Borrador local
  readonly borradorDisponible = signal<BorradorInfo<unknown> | null>(null);
  private borradorKey = '';
  private autoguardadoActivo = false;
  private huboCambiosAutoguardados = false;
  private salidaControlada = false;

  readonly cargando          = signal(true);
  readonly guardando         = signal(false);
  readonly guardandoBorrador = signal(false);
  readonly error             = signal('');
  readonly esNuevo           = signal(true);
  readonly totalEdiciones    = signal(0);
  readonly usuarioRegistro   = signal('');
  readonly pcRegistro        = signal('');
  readonly fechaRegistro     = signal('');
  readonly fechaModificacion = signal('');

  // PDF aprobado (migración 42)
  @ViewChild('inputPdf') inputPdfRef?: ElementRef<HTMLInputElement>;
  readonly tienePdf          = signal(false);
  readonly pdfNombreArchivo  = signal('');
  readonly pdfTamanoBytes    = signal<number>(0);
  readonly pdfSubidoEn       = signal<string | null>(null);
  readonly pdfSubidoPor      = signal<string | null>(null);
  readonly puedeSubirPdf     = signal(false);
  readonly motivoSinPermiso  = signal<string | null>(null);
  readonly subiendoPdf       = signal(false);
  readonly pdfPreviewUrl     = signal<SafeResourceUrl | null>(null);
  readonly cargandoPreview   = signal(false);

  idProcedimiento = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Identificación
    codigo:              ['', [Validators.required, Validators.minLength(2)]],
    anio:                [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    version:             [1, [Validators.required, Validators.min(1)]],
    autorNorma:          ['', Validators.required],
    normaBase:           [''],
    esFormatoDigitalIso: [true],
    esActivo:            [true],

    // 02 - Descripción
    descripcion:         ['', [Validators.required, Validators.minLength(10)]],
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Procedimientos', ruta: '/maestros/procedimientos' },
    this.esNuevo() ? 'Nuevo Registro' : 'Editar Registro',
  ));

  readonly codigoBadge = computed(() => {
    if (this.esNuevo()) return 'AUTO · PC-NEW';
    return `ID · ${this.idProcedimiento}`;
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);
    this.borradorKey = `procedimientos:${nuevo ? 'nuevo' : idParam}`;

    try {
      if (!nuevo) {
        this.idProcedimiento = Number(idParam);
        const p = await this.procSvc.obtenerProcedimientoPorId(this.idProcedimiento);
        this.formulario.patchValue({
          codigo:              p.codigo,
          anio:                p.anio,
          version:             p.version,
          autorNorma:          p.autorNorma,
          normaBase:           p.normaBase,
          esFormatoDigitalIso: p.esFormatoDigitalIso,
          esActivo:            p.esActivo,
          descripcion:         p.descripcion,
        });
        this.totalEdiciones.set(p.totalEdiciones);
        this.usuarioRegistro.set(p.usuarioRegistro);
        this.pcRegistro.set(p.pcRegistro);
        this.fechaRegistro.set(p.fechaRegistro);
        this.fechaModificacion.set(p.fechaModificacion);
        this.tienePdf.set(p.tienePdf ?? false);
        this.pdfNombreArchivo.set(p.pdfNombreArchivo ?? '');
        this.pdfTamanoBytes.set(p.pdfTamanoBytes ?? 0);
        this.pdfSubidoEn.set(p.pdfSubidoEn ?? null);
        this.pdfSubidoPor.set(p.pdfSubidoPor ?? null);
      }

      // Permiso para subir PDF (incluso editando)
      if (!nuevo) {
        try {
          const perm = await this.procSvc.obtenerPermisoPdf(this.idProcedimiento);
          this.puedeSubirPdf.set(perm.puedeSubirPdf);
          this.motivoSinPermiso.set(perm.motivo ?? null);
        } catch { this.puedeSubirPdf.set(false); }
      }

      // Detectar borrador local y activar autoguardado
      const draft = this.borradorSvc.obtener(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el procedimiento.');
    } finally {
      this.cargando.set(false);
    }
  }

  // PDF placeholder — upload real pendiente (ver memoria: project_hu86_upload_pendiente)
  seleccionarPdf(): void {
    if (!this.puedeSubirPdf() || this.subiendoPdf() || this.esNuevo()) return;
    this.inputPdfRef?.nativeElement.click();
  }

  async onArchivoSeleccionado(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';   // permite re-seleccionar el mismo archivo
    if (!archivo) return;

    if (archivo.type !== 'application/pdf') {
      this.toastSvc.error('Solo se permiten archivos PDF.');
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      this.toastSvc.error('El archivo supera los 10 MB.');
      return;
    }

    this.subiendoPdf.set(true);
    try {
      const info = await this.procSvc.subirPdf(this.idProcedimiento, archivo);
      this.tienePdf.set(true);
      this.pdfNombreArchivo.set(info.nombreArchivo);
      this.pdfTamanoBytes.set(info.tamanoBytes);
      this.pdfSubidoEn.set(info.subidoEn ?? null);
      this.pdfSubidoPor.set(info.subidoPor ?? null);
      this.toastSvc.exito('PDF cargado correctamente.');
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'Error al subir el PDF.');
    } finally {
      this.subiendoPdf.set(false);
    }
  }

  async verPdf(): Promise<void> {
    if (this.cargandoPreview()) return;
    this.cargandoPreview.set(true);
    try {
      const blob = await this.procSvc.descargarPdf(this.idProcedimiento);
      this.liberarPdfBlob();
      this.pdfBlobUrl = URL.createObjectURL(blob);
      // #view=FitH ajusta la página al ancho del iframe para evitar los bordes
      // negros laterales del visor nativo del navegador.
      this.pdfPreviewUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(`${this.pdfBlobUrl}#view=FitH`)
      );
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo abrir el PDF.');
    } finally {
      this.cargandoPreview.set(false);
    }
  }

  cerrarPreviewPdf(): void {
    this.pdfPreviewUrl.set(null);
    this.liberarPdfBlob();
  }

  private liberarPdfBlob(): void {
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
  }

  formatearTamanoPdf(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  limpiarFormulario(): void {
    this.formulario.reset({
      anio: new Date().getFullYear(),
      version: 1,
      esFormatoDigitalIso: true,
      esActivo: true,
    });
    this.toastSvc.exito('Formulario limpiado.');
  }

  // ─── Borrador local ─────────────────────────────────────────────────
  private activarAutoguardado(): void {
    this.autoguardadoActivo = true;
    this.formulario.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.autoguardadoActivo) return;
        this.borradorSvc.guardar(this.borradorKey, this.formulario.getRawValue());
        this.huboCambiosAutoguardados = true;
      });
  }

  ngOnDestroy(): void {
    if (!this.salidaControlada && this.huboCambiosAutoguardados && this.borradorSvc.tiene(this.borradorKey)) {
      this.toastSvc.exito('Borrador autoguardado. Puedes volver cuando quieras para continuar.');
    }
    this.liberarPdfBlob();
  }

  restaurarBorrador(): void {
    const draft = this.borradorDisponible();
    if (!draft) return;
    this.autoguardadoActivo = false;
    this.formulario.patchValue(draft.data as object, { emitEvent: false });
    this.autoguardadoActivo = true;
    this.borradorDisponible.set(null);
    this.toastSvc.exito('Borrador restaurado.');
  }

  descartarBorrador(): void {
    this.borradorSvc.borrar(this.borradorKey);
    this.borradorDisponible.set(null);
    this.toastSvc.exito('Borrador descartado.');
  }

  async guardarBorrador(): Promise<void> {
    this.salidaControlada = true;
    this.guardandoBorrador.set(true);
    this.borradorSvc.guardar(this.borradorKey, this.formulario.getRawValue());
    this.toastSvc.exito('Borrador guardado. Puedes continuar más tarde.');
    this.guardandoBorrador.set(false);
    this.router.navigate(['/maestros/procedimientos']);
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.toastSvc.error('Revisa los campos marcados en rojo.');
      return;
    }
    if (this.guardando() || this.guardandoBorrador()) return;

    this.guardando.set(true);
    this.error.set('');
    try {
      const v = this.formulario.value;
      const dto: GuardarProcedimientoRequest = {
        idProcedimiento:     this.idProcedimiento,
        codigo:              v.codigo?.trim().toUpperCase() ?? '',
        anio:                Number(v.anio) || new Date().getFullYear(),
        version:             Number(v.version) || 1,
        autorNorma:          v.autorNorma?.trim() ?? '',
        normaBase:           v.normaBase?.trim() ?? '',
        descripcion:         v.descripcion?.trim() ?? '',
        esFormatoDigitalIso: !!v.esFormatoDigitalIso,
        urlPdfAprobado:      '',
        esActivo:            !!v.esActivo,
        guardarComoBorrador: false,
      };
      await this.procSvc.guardarProcedimiento(dto);
      this.borradorSvc.borrar(this.borradorKey);
      this.salidaControlada = true;
      this.toastSvc.exito(
        this.esNuevo()
          ? 'Procedimiento registrado y activado correctamente.'
          : 'Procedimiento actualizado correctamente.'
      );
      this.router.navigate(['/maestros/procedimientos']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el procedimiento.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/procedimientos']);
  }
}
