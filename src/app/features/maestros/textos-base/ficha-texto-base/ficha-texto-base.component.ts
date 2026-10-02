import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { TextosBaseService } from '../../../../core/services/textos-base.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import {
  CATEGORIAS_TEXTO_BASE,
  GuardarTextoBaseRequest,
  NIVELES_SANGRIA,
  SECCIONES_DOSSIER,
  VARIABLES_INSERTABLES,
  VariableInsertable,
} from '../../../../core/models/textos-base.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CampoComponent }  from '../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../shared/ui/toggle/toggle.component';
import { ModalComponent }  from '../../../../shared/ui/modal/modal.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-ficha-texto-base',
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    HeroHeaderComponent,
    SeccionComponent,
    FormFooterComponent,
    EstadoVacioComponent,
    ButtonComponent,
    CampoComponent,
    ToggleComponent,
    ModalComponent,
    ModalBorradorComponent,
  ],
  templateUrl: './ficha-texto-base.component.html',
  styleUrl: './ficha-texto-base.component.scss',
})
export class FichaTextoBaseComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly textosSvc   = inject(TextosBaseService);
  private readonly borradorSvc = inject(BorradorService);
  private readonly toastSvc    = inject(ToastService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly destroyRef  = inject(DestroyRef);

  // Borrador local (autoguardado + modal Restaurar/Descartar)
  readonly borradorDisponible = signal<BorradorInfo<unknown> | null>(null);
  private borradorKey = '';
  private autoguardadoActivo = false;
  private huboCambiosAutoguardados = false;
  private salidaControlada = false;

  @ViewChild('textareaClausula') textareaClausula?: ElementRef<HTMLTextAreaElement>;

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly guardandoBorrador = signal(false);
  readonly error   = signal('');
  readonly esNuevo = signal(true);
  readonly renderPreview = signal(false);
  readonly propuestasAsociadas = signal(0);

  readonly categoriasOpciones = CATEGORIAS_TEXTO_BASE;
  readonly seccionesOpciones  = SECCIONES_DOSSIER;
  readonly nivelesSangria     = NIVELES_SANGRIA;
  readonly variables: VariableInsertable[] = VARIABLES_INSERTABLES;

  idTextoBase = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Identificación
    tipoCategoria:    ['', Validators.required],
    nombre:           ['', [Validators.required, Validators.minLength(3)]],
    codigoCorto:      [''],
    seccionDossier:   ['', Validators.required],

    // 02 - Contenido
    textoClausula:    ['', [Validators.required, Validators.minLength(10)]],

    // 03 - Formato PDF
    esNegritaPorDefecto: [false],
    esPredeterminado:    [false],
    ordenAparicion:      [1, [Validators.min(1)]],
    nivelSangria:        ['estandar'],

    // Sidebar - Aplicabilidad
    activo:                     [true],
    // "aplicaTodosServicios" se derivó: ahora es UI pura (checkbox computed).
    // Al guardar se calcula como true si los 4 individuales están en true.
    aplicaCalibracionLab:       [true],
    aplicaCalibracionPlanta:    [true],
    aplicaMantenimiento:        [true],
    aplicaVentaSuministros:     [true],
    visibleGestoresComerciales: [true],
    visibleTecnicosMetrologos:  [true],
    visibleSupervisores:        [true],
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Textos Base', ruta: '/maestros/textos-base' },
    this.esNuevo() ? 'Nuevo Registro' : 'Editar Registro',
  ));

  readonly caracteresCount = computed(() => {
    return (this.formulario.get('textoClausula')?.value ?? '').length;
  });

  readonly codigoBadge = computed(() => {
    if (this.esNuevo()) return 'AUTO · TX-TXT-BASE-NEW';
    return this.formulario.get('codigoCorto')?.value || `ID-${this.idTextoBase}`;
  });

  readonly categoriaLabelSel = computed(() => {
    const val = this.formulario.get('tipoCategoria')?.value;
    return this.categoriasOpciones.find(c => c.value === val)?.label ?? '—';
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);
    this.borradorKey = `textos-base:${nuevo ? 'nuevo' : idParam}`;

    try {
      if (!nuevo) {
        this.idTextoBase = Number(idParam);
        const t = await this.textosSvc.obtenerTextoBasePorId(this.idTextoBase);
        this.formulario.patchValue({
          tipoCategoria:             t.tipoCategoria,
          nombre:                    t.nombre,
          codigoCorto:               t.codigoCorto,
          seccionDossier:            t.seccionDossier,
          textoClausula:             t.textoClausula,
          esNegritaPorDefecto:       t.esNegritaPorDefecto,
          esPredeterminado:          t.esPredeterminado,
          ordenAparicion:            t.ordenAparicion,
          nivelSangria:              t.nivelSangria,
          activo:                    t.estado === 'Activo',
          aplicaCalibracionLab:      t.aplicaCalibracionLab,
          aplicaCalibracionPlanta:   t.aplicaCalibracionPlanta,
          aplicaMantenimiento:       t.aplicaMantenimiento,
          aplicaVentaSuministros:    t.aplicaVentaSuministros,
          visibleGestoresComerciales: t.visibleGestoresComerciales,
          visibleTecnicosMetrologos:  t.visibleTecnicosMetrologos,
          visibleSupervisores:        t.visibleSupervisores,
        });
        this.propuestasAsociadas.set(t.propuestasAsociadas);
      } else {
        // Autogenerar código corto al cambiar categoría
        this.formulario.get('tipoCategoria')?.valueChanges.subscribe(val => {
          if (val && !this.formulario.get('codigoCorto')?.value) {
            this.formulario.patchValue({ codigoCorto: this.textosSvc.generarCodigoCorto(val) });
          }
        });
      }

      // Detectar borrador local y activar autoguardado
      const draft = this.borradorSvc.obtener(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el texto base.');
    } finally {
      this.cargando.set(false);
    }
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
    this.router.navigate(['/maestros/textos-base']);
  }

  insertarVariable(token: string): void {
    const textarea = this.textareaClausula?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end   = textarea.selectionEnd   ?? 0;
    const actual = this.formulario.get('textoClausula')?.value ?? '';
    const nuevo = actual.substring(0, start) + token + actual.substring(end);

    this.formulario.patchValue({ textoClausula: nuevo });

    // Reposicionar cursor después del token insertado
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + token.length;
      textarea.selectionEnd   = start + token.length;
    }, 0);
  }

  /**
   * UI helper: marca/desmarca los 4 checkboxes de servicios al mismo tiempo.
   * No existe como campo del formulario — su valor se deriva de los 4 individuales.
   */
  toggleTodosServicios(): void {
    const nuevo = !this.aplicaTodosServicios();
    this.formulario.patchValue({
      aplicaCalibracionLab:    nuevo,
      aplicaCalibracionPlanta: nuevo,
      aplicaMantenimiento:     nuevo,
      aplicaVentaSuministros:  nuevo,
    });
  }

  /** True solo si los 4 servicios individuales están marcados. */
  aplicaTodosServicios(): boolean {
    const v = this.formulario.value;
    return !!v.aplicaCalibracionLab
        && !!v.aplicaCalibracionPlanta
        && !!v.aplicaMantenimiento
        && !!v.aplicaVentaSuministros;
  }

  toggleRenderPreview(): void {
    this.renderPreview.update(v => !v);
  }

  // Modal preview fullscreen del PDF
  readonly modalPreviewOpen = signal(false);

  abrirModalPreview(): void {
    if (this.formulario.get('textoClausula')?.invalid) {
      this.toastSvc.error('Ingresa el contenido antes de previsualizar.');
      return;
    }
    this.modalPreviewOpen.set(true);
  }

  cerrarModalPreview(): void {
    this.modalPreviewOpen.set(false);
  }

  imprimirPreview(): void {
    window.print();
  }

  textoRenderizado(): string {
    const texto = this.formulario.get('textoClausula')?.value ?? '';
    return texto
      .replace(/\{Cliente\}/g,   '<strong>ACEROS AREQUIPA S.A.</strong>')
      .replace(/\{RUC\}/g,       '<strong>20100010371</strong>')
      .replace(/\{Fecha\}/g,     '<strong>29/09/2026</strong>')
      .replace(/\{Propuesta\}/g, '<strong>COT-2025-0891</strong>');
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
      const dto: GuardarTextoBaseRequest = {
        idTextoBase:              this.idTextoBase,
        codigoCorto:              (v.codigoCorto || this.textosSvc.generarCodigoCorto(v.tipoCategoria)).trim(),
        tipoCategoria:            v.tipoCategoria,
        nombre:                   v.nombre?.trim(),
        textoClausula:            v.textoClausula,
        seccionDossier:           v.seccionDossier,
        ordenAparicion:           Number(v.ordenAparicion) || 1,
        nivelSangria:             v.nivelSangria,
        esPredeterminado:         !!v.esPredeterminado,
        esNegritaPorDefecto:      !!v.esNegritaPorDefecto,
        activo:                   !!v.activo,
        // Derivado: true solo si los 4 individuales son true.
        // Pendiente: Bryan dropea esta columna de BD + DTO en próxima migración.
        aplicaTodosServicios:     this.aplicaTodosServicios(),
        aplicaCalibracionLab:     !!v.aplicaCalibracionLab,
        aplicaCalibracionPlanta:  !!v.aplicaCalibracionPlanta,
        aplicaMantenimiento:      !!v.aplicaMantenimiento,
        aplicaVentaSuministros:   !!v.aplicaVentaSuministros,
        visibleGestoresComerciales: !!v.visibleGestoresComerciales,
        visibleTecnicosMetrologos:  !!v.visibleTecnicosMetrologos,
        visibleSupervisores:        !!v.visibleSupervisores,
        guardarComoBorrador:        false,
      };
      await this.textosSvc.guardarTextoBase(dto);
      this.borradorSvc.borrar(this.borradorKey);
      this.salidaControlada = true;
      this.toastSvc.exito(
        this.esNuevo()
          ? 'Texto base registrado y activado correctamente.'
          : 'Texto base actualizado correctamente.'
      );
      this.router.navigate(['/maestros/textos-base']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el texto base.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/textos-base']);
  }
}
