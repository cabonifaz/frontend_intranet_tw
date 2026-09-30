import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SuministrosService } from '../../../../core/services/suministros.service';
import {
  CLASES_SUMINISTRO,
  GuardarSuministroRequest,
  NIVELES_TARIFA,
  OpcionCatalogo,
  PROCEDENCIAS_SUMINISTRO,
  SUBTIPOS_SUMINISTRO,
  TIPOS_SUMINISTRO,
  UNIDADES_SUMINISTRO,
} from '../../../../core/models/suministros.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CampoComponent }  from '../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../shared/ui/toggle/toggle.component';
import { ModalComponent }  from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

@Component({
  selector: 'app-ficha-suministro',
  imports: [
    ReactiveFormsModule,
    FormsModule,
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
  ],
  templateUrl: './ficha-suministro.component.html',
  styleUrl: './ficha-suministro.component.scss',
})
export class FichaSuministroComponent implements OnInit {
  private readonly fb           = inject(FormBuilder);
  private readonly suministrosSvc = inject(SuministrosService);
  private readonly toastSvc     = inject(ToastService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);

  readonly cargando          = signal(true);
  readonly guardando         = signal(false);
  readonly guardandoBorrador = signal(false);
  readonly error             = signal('');
  readonly esNuevo           = signal(true);
  readonly totalEdiciones    = signal(0);
  readonly usuarioRegistro   = signal('');
  readonly fechaRegistro     = signal('');
  readonly fechaModificacion = signal('');
  readonly firmaDigital      = signal('');
  readonly procedimientosAsociados = signal<{ codigo: string; nombre: string }[]>([]);

  readonly clasesOpciones       = CLASES_SUMINISTRO;
  readonly tiposOpciones        = TIPOS_SUMINISTRO;
  readonly subtiposOpciones     = SUBTIPOS_SUMINISTRO;
  readonly procedenciasOpciones = PROCEDENCIAS_SUMINISTRO;
  readonly unidadesOpciones     = UNIDADES_SUMINISTRO;
  readonly nivelesTarifa        = NIVELES_TARIFA;

  readonly marcasSignal  = signal<OpcionCatalogo[]>([]);
  readonly modelosSignal = signal<OpcionCatalogo[]>([]);

  idSuministro = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Identificación
    clase:              ['', Validators.required],
    esActivoEnCatalogo: [true],
    tipo:               ['', Validators.required],
    subtipo:            ['', Validators.required],
    marca:              ['', Validators.required],
    modelo:             ['', Validators.required],

    // 02 - Descripciones y Logística
    descripcionAuto:    [''],
    descripcionManual:  ['', [Validators.required, Validators.minLength(10)]],
    rangoOperativo:     this.fb.array<string>([]),
    nuevoRango:         [''],
    unidad:             ['unidad'],
    ctaContable:        [''],
    procedencia:        ['nacional'],
    cuenta:             [''],
    stock:              [0, [Validators.min(0)]],

    // 03 - Parámetros de Cotización
    usarEnPropuestas:    [true],
    codigoUnspsc:        [''],
    precioMinReferencia: [0, [Validators.min(0)]],
    escalaEstandar:         [0, [Validators.min(0)]],
    escalaVolumen:          [0, [Validators.min(0)]],
    escalaCorporativoAlto:  [0, [Validators.min(0)]],
    aplicaComercial:             [true],
    aplicaServicioTecnico:       [true],
    aplicaLaboratorioMetrologia: [true],
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Suministros', ruta: '/maestros/suministros' },
    this.esNuevo() ? 'Nuevo Registro' : 'Editar Registro',
  ));

  readonly rangoOperativo = computed(() => this.formulario.get('rangoOperativo') as FormArray<any>);

  readonly codigoBadge = computed(() => {
    if (this.esNuevo()) return 'AUTO · SUM-NUEVO';
    return `ID · ${this.idSuministro}`;
  });

  // ─── Modales de Marca / Modelo ────────────────────────────────────────
  readonly modalMarcaOpen  = signal(false);
  readonly modalModeloOpen = signal(false);
  nuevaMarcaNombre  = '';
  nuevoModeloNombre = '';

  async ngOnInit(): Promise<void> {
    this.marcasSignal.set(this.suministrosSvc.obtenerMarcas());
    this.modelosSignal.set(this.suministrosSvc.obtenerModelos());

    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);

    try {
      if (!nuevo) {
        this.idSuministro = Number(idParam);
        const s = await this.suministrosSvc.obtenerSuministroPorId(this.idSuministro);
        this.formulario.patchValue({
          clase:              s.clase,
          esActivoEnCatalogo: s.esActivoEnCatalogo,
          tipo:               s.tipo,
          subtipo:            s.subtipo,
          marca:              s.marca,
          modelo:             s.modelo,
          descripcionAuto:    s.descripcionAuto,
          descripcionManual:  s.descripcionManual,
          unidad:             s.unidad,
          ctaContable:        s.ctaContable,
          procedencia:        s.procedencia,
          cuenta:             s.cuenta,
          stock:              s.stock,
          usarEnPropuestas:    s.usarEnPropuestas,
          codigoUnspsc:        s.codigoUnspsc,
          precioMinReferencia: s.precioMinReferencia,
          escalaEstandar:         s.escalas.find(e => e.nivel === 'estandar')?.precio ?? 0,
          escalaVolumen:          s.escalas.find(e => e.nivel === 'volumen')?.precio ?? 0,
          escalaCorporativoAlto:  s.escalas.find(e => e.nivel === 'corporativo_alto')?.precio ?? 0,
          aplicaComercial:             s.aplicaComercial,
          aplicaServicioTecnico:       s.aplicaServicioTecnico,
          aplicaLaboratorioMetrologia: s.aplicaLaboratorioMetrologia,
        });
        const ra = this.formulario.get('rangoOperativo') as FormArray<any>;
        s.rangoOperativo.forEach(r => ra.push(this.fb.control(r)));
        this.totalEdiciones.set(s.totalEdiciones);
        this.usuarioRegistro.set(s.usuarioRegistro);
        this.fechaRegistro.set(s.fechaRegistro);
        this.fechaModificacion.set(s.fechaModificacion);
        this.firmaDigital.set(s.firmaDigital);
        this.procedimientosAsociados.set(s.procedimientosAsociados);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el suministro.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Rango operativo (tags) ───────────────────────────────────────────
  agregarRango(): void {
    const v = (this.formulario.get('nuevoRango')?.value ?? '').trim();
    if (!v) return;
    (this.formulario.get('rangoOperativo') as FormArray).push(this.fb.control(v));
    this.formulario.patchValue({ nuevoRango: '' });
  }

  quitarRango(i: number): void {
    (this.formulario.get('rangoOperativo') as FormArray).removeAt(i);
  }

  // ─── Generar descripción automática (mock IA) ─────────────────────────
  generarDescripcionAuto(): void {
    const v = this.formulario.value;
    if (!v.clase || !v.tipo || !v.subtipo || !v.marca || !v.modelo) {
      this.toastSvc.error('Completa clase, tipo, sub-tipo, marca y modelo antes de generar.');
      return;
    }
    const desc = this.suministrosSvc.generarDescripcionAuto(v.clase, v.tipo, v.subtipo, v.marca, v.modelo);
    this.formulario.patchValue({ descripcionAuto: desc });
    this.toastSvc.exito('Descripción automática generada.');
  }

  // ─── Modal Nueva Marca / Modelo ───────────────────────────────────────
  abrirModalMarca(): void  { this.nuevaMarcaNombre  = ''; this.modalMarcaOpen.set(true); }
  cerrarModalMarca(): void { this.modalMarcaOpen.set(false); }

  async guardarNuevaMarca(): Promise<void> {
    const nombre = this.nuevaMarcaNombre.trim();
    if (nombre.length < 2) { this.toastSvc.error('Nombre de marca demasiado corto.'); return; }
    const nueva = await this.suministrosSvc.crearMarca(nombre);
    this.marcasSignal.set(this.suministrosSvc.obtenerMarcas());
    this.formulario.patchValue({ marca: nueva.value });
    this.toastSvc.exito(`Marca "${nueva.label}" registrada.`);
    this.cerrarModalMarca();
  }

  abrirModalModelo(): void  { this.nuevoModeloNombre = ''; this.modalModeloOpen.set(true); }
  cerrarModalModelo(): void { this.modalModeloOpen.set(false); }

  async guardarNuevoModelo(): Promise<void> {
    const nombre = this.nuevoModeloNombre.trim();
    if (nombre.length < 1) { this.toastSvc.error('Nombre de modelo requerido.'); return; }
    const nuevo = await this.suministrosSvc.crearModelo(nombre);
    this.modelosSignal.set(this.suministrosSvc.obtenerModelos());
    this.formulario.patchValue({ modelo: nuevo.value });
    this.toastSvc.exito(`Modelo "${nuevo.label}" registrado.`);
    this.cerrarModalModelo();
  }

  // Foto / Manual PDF: placeholder — upload real pendiente hasta que el back tenga endpoint + storage
  onSubirFoto():      void { this.toastSvc.exito('Subida de foto disponible cuando el back tenga endpoint.'); }
  onVerHdFoto():      void { this.toastSvc.exito('Preview HD disponible cuando la foto esté cargada.'); }
  onReemplazarFoto(): void { this.onSubirFoto(); }
  onAdjuntarManual(): void { this.toastSvc.exito('Adjuntar PDF disponible cuando el back tenga endpoint.'); }

  // ─── Duplicar como Plantilla / Limpiar ────────────────────────────────
  limpiarFormulario(): void {
    this.formulario.reset({
      esActivoEnCatalogo: true,
      unidad: 'unidad',
      procedencia: 'nacional',
      stock: 0,
      usarEnPropuestas: true,
      precioMinReferencia: 0,
      escalaEstandar: 0,
      escalaVolumen: 0,
      escalaCorporativoAlto: 0,
      aplicaComercial: true,
      aplicaServicioTecnico: true,
      aplicaLaboratorioMetrologia: true,
    });
    while ((this.formulario.get('rangoOperativo') as FormArray).length > 0) {
      (this.formulario.get('rangoOperativo') as FormArray).removeAt(0);
    }
    this.toastSvc.exito('Formulario limpiado.');
  }

  duplicarComoPlantilla(): void {
    if (this.esNuevo()) { this.toastSvc.error('Solo puedes duplicar un registro ya guardado.'); return; }
    const v = this.formulario.value;
    this.esNuevo.set(true);
    this.idSuministro = 0;
    this.formulario.patchValue({
      descripcionManual: `${v.descripcionManual} (COPIA)`,
    });
    this.router.navigate(['/maestros/suministros/nuevo']);
    this.toastSvc.exito('Registro duplicado como plantilla — completa lo necesario y guarda.');
  }

  // ─── Guardar ──────────────────────────────────────────────────────────
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
      const dto: GuardarSuministroRequest = {
        idSuministro:       this.idSuministro,
        clase:              v.clase,
        tipo:               v.tipo,
        subtipo:            v.subtipo,
        marca:              v.marca,
        modelo:             v.modelo,
        descripcionAuto:    v.descripcionAuto ?? '',
        descripcionManual:  v.descripcionManual?.trim() ?? '',
        rangoOperativo:     (v.rangoOperativo ?? []) as string[],
        unidad:             v.unidad,
        ctaContable:        v.ctaContable ?? '',
        procedencia:        v.procedencia,
        cuenta:             v.cuenta ?? '',
        stock:              Number(v.stock) || 0,
        esActivoEnCatalogo: !!v.esActivoEnCatalogo,
        usarEnPropuestas:    !!v.usarEnPropuestas,
        codigoUnspsc:        v.codigoUnspsc ?? '',
        precioMinReferencia: v.precioMinReferencia != null ? Number(v.precioMinReferencia) : null,
        escalas: [
          { nivel: 'estandar',         precio: Number(v.escalaEstandar) || null },
          { nivel: 'volumen',          precio: Number(v.escalaVolumen) || null },
          { nivel: 'corporativo_alto', precio: Number(v.escalaCorporativoAlto) || null },
        ],
        aplicaComercial:             !!v.aplicaComercial,
        aplicaServicioTecnico:       !!v.aplicaServicioTecnico,
        aplicaLaboratorioMetrologia: !!v.aplicaLaboratorioMetrologia,
        guardarComoBorrador,
      };
      await this.suministrosSvc.guardarSuministro(dto);
      this.toastSvc.exito(
        guardarComoBorrador
          ? 'Suministro guardado como borrador.'
          : this.esNuevo()
            ? 'Suministro registrado y publicado correctamente.'
            : 'Suministro actualizado correctamente.'
      );
      this.router.navigate(['/maestros/suministros']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el suministro.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      flag.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/suministros']);
  }
}
