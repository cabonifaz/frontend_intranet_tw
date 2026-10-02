import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { SuministrosService, DescripcionCatalogoSuministro } from '../../../../core/services/suministros.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import {
  GuardarSuministroRequest,
  NIVELES_TARIFA,
  OpcionCatalogo,
  esServicio,
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
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ModalNuevoItemCatalogoComponent } from '../../../../shared/ui/modal-nuevo-item-catalogo/modal-nuevo-item-catalogo.component';
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
    ModalBorradorComponent,
    ModalNuevoItemCatalogoComponent,
  ],
  templateUrl: './ficha-suministro.component.html',
  styleUrl: './ficha-suministro.component.scss',
})
export class FichaSuministroComponent implements OnInit, OnDestroy {
  private readonly fb             = inject(FormBuilder);
  private readonly suministrosSvc = inject(SuministrosService);
  private readonly borradorSvc    = inject(BorradorService);
  private readonly toastSvc       = inject(ToastService);
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly destroyRef     = inject(DestroyRef);

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
  readonly fechaRegistro     = signal('');
  readonly fechaModificacion = signal('');
  readonly firmaDigital      = signal('');
  readonly claseActual       = signal('');

  // Catálogos cargados desde tabla_maestra on init
  readonly clasesOpciones       = signal<OpcionCatalogo[]>([]);
  readonly tiposOpciones        = signal<OpcionCatalogo[]>([]);
  readonly subtiposOpciones     = signal<OpcionCatalogo[]>([]);
  readonly procedenciasOpciones = signal<OpcionCatalogo[]>([]);
  readonly unidadesOpciones     = signal<OpcionCatalogo[]>([]);
  readonly nivelesTarifa        = NIVELES_TARIFA;

  readonly marcasSignal         = signal<OpcionCatalogo[]>([]);
  readonly modelosSignal        = signal<OpcionCatalogo[]>([]);
  readonly procedimientosSignal = signal<OpcionCatalogo[]>([]);

  // Regla de negocio: si clase === 'servicio' → sin Marca/Modelo, con Procedimientos.
  // Si clase !== 'servicio' → con Marca/Modelo, sin Procedimientos.
  readonly esClaseServicio = computed(() => esServicio(this.claseActual()));

  idSuministro = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Identificación
    clase:              ['', Validators.required],
    esActivoEnCatalogo: [true],
    tipo:               ['', Validators.required],
    subtipo:            ['', Validators.required],
    marca:              [''],   // requerido solo si clase !== 'servicio' (validación dinámica)
    modelo:             [''],   // idem

    // 02 - Descripciones y Logística
    descripcionAuto:    [''],
    descripcionManual:  ['', [Validators.required, Validators.minLength(10)]],
    alcance:            [''],
    unidad:             ['unidad_bienes'],
    ctaContable:        [''],
    procedencia:        ['nacional'],
    casillero:          [''],

    // 03 - Parámetros de Cotización
    usarEnPropuestas:    [true],
    codigoUnspsc:        [''],
    precioMinReferencia: [null],
    escalaEstandar:         [null],
    escalaVolumen:          [null],
    escalaCorporativoAlto:  [null],
    aplicaComercial:  [false],
    aplicaServicio:   [false],
    aplicaMetrologia: [false],

    // 04 - Procedimientos (solo si clase = 'servicio')
    idPrimerProcedimiento:  [''],
    idSegundoProcedimiento: [''],
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Suministros', ruta: '/maestros/suministros' },
    this.esNuevo() ? 'Nuevo Registro' : 'Editar Registro',
  ));

  readonly codigoBadge = computed(() => {
    if (this.esNuevo()) return 'AUTO · SUM-NUEVO';
    return `ID · ${this.idSuministro}`;
  });

  // ─── Modal genérico "Nuevo item de catálogo" (Tipo/Subtipo/Marca/Modelo) ──
  readonly modalCatalogo = signal<{
    descripcion: DescripcionCatalogoSuministro;
    titulo: string;
    etiqueta: string;
    placeholder: string;
    campoFormulario: 'tipo' | 'subtipo' | 'marca' | 'modelo';
  } | null>(null);
  readonly guardandoCatalogo = signal(false);

  async ngOnInit(): Promise<void> {
    // Carga paralela de los 7 catálogos de tabla_maestra + procedimientos (del maestro HU-87)
    const [clases, tipos, subtipos, marcas, modelos, procedencias, unidades, procedimientos] = await Promise.all([
      this.suministrosSvc.obtenerClases(),
      this.suministrosSvc.obtenerTipos(),
      this.suministrosSvc.obtenerSubtipos(),
      this.suministrosSvc.obtenerMarcas(),
      this.suministrosSvc.obtenerModelos(),
      this.suministrosSvc.obtenerProcedencias(),
      this.suministrosSvc.obtenerUnidades(),
      this.suministrosSvc.obtenerProcedimientos().catch(() => []),
    ]);
    this.clasesOpciones.set(clases);
    this.tiposOpciones.set(tipos);
    this.subtiposOpciones.set(subtipos);
    this.marcasSignal.set(marcas);
    this.modelosSignal.set(modelos);
    this.procedenciasOpciones.set(procedencias);
    this.unidadesOpciones.set(unidades);
    this.procedimientosSignal.set(procedimientos);

    // Sincronizar claseActual con el FormControl para que el computed reaccione
    this.formulario.get('clase')?.valueChanges.subscribe(v => {
      this.claseActual.set(v ?? '');
      this.actualizarValidadoresPorClase(v ?? '');
      this.actualizarDescripcionAuto();
    });
    // Descripción automática en vivo al cambiar cualquiera de los campos relevantes
    for (const campo of ['tipo', 'subtipo', 'marca', 'modelo']) {
      this.formulario.get(campo)?.valueChanges.subscribe(() => this.actualizarDescripcionAuto());
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);
    this.borradorKey = `suministros:${nuevo ? 'nuevo' : idParam}`;

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
          alcance:            s.alcance,
          unidad:             s.unidad,
          ctaContable:        s.ctaContable,
          procedencia:        s.procedencia,
          casillero:          s.casillero,
          usarEnPropuestas:    s.usarEnPropuestas,
          codigoUnspsc:        s.codigoUnspsc,
          precioMinReferencia: s.precioMinReferencia,
          escalaEstandar:         s.escalas.find(e => e.nivel === 'estandar')?.precio         ?? null,
          escalaVolumen:          s.escalas.find(e => e.nivel === 'volumen')?.precio          ?? null,
          escalaCorporativoAlto:  s.escalas.find(e => e.nivel === 'corporativo_alto')?.precio ?? null,
          aplicaComercial:  s.aplicaComercial,
          aplicaServicio:   s.aplicaServicio,
          aplicaMetrologia: s.aplicaMetrologia,
          idPrimerProcedimiento:  s.idPrimerProcedimiento  ?? '',
          idSegundoProcedimiento: s.idSegundoProcedimiento ?? '',
        });
        this.claseActual.set(s.clase);
        this.actualizarValidadoresPorClase(s.clase);
        this.totalEdiciones.set(s.totalEdiciones);
        this.usuarioRegistro.set(s.usuarioRegistro);
        this.fechaRegistro.set(s.fechaRegistro);
        this.fechaModificacion.set(s.fechaModificacion);
        this.firmaDigital.set(s.firmaDigital);
      }

      // Detectar borrador local y activar autoguardado
      const draft = this.borradorSvc.obtener(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el suministro.');
    } finally {
      this.cargando.set(false);
    }
  }

  private actualizarValidadoresPorClase(clase: string): void {
    const marcaCtrl  = this.formulario.get('marca');
    const modeloCtrl = this.formulario.get('modelo');
    if (esServicio(clase)) {
      marcaCtrl?.clearValidators();
      modeloCtrl?.clearValidators();
      marcaCtrl?.setValue('');
      modeloCtrl?.setValue('');
    } else {
      marcaCtrl?.setValidators([Validators.required]);
      modeloCtrl?.setValidators([Validators.required]);
    }
    marcaCtrl?.updateValueAndValidity({ emitEvent: false });
    modeloCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  // ─── Descripción automática (en vivo, sin botón) ───────────────────────
  // Se recalcula cada vez que cambia clase/tipo/subtipo/marca/modelo.
  // Para Servicio: solo clase + tipo + subtipo. Para el resto: + marca + modelo.
  private async actualizarDescripcionAuto(): Promise<void> {
    const v = this.formulario.value;
    if (!v.clase || !v.tipo || !v.subtipo) {
      this.formulario.patchValue({ descripcionAuto: '' }, { emitEvent: false });
      return;
    }
    if (!this.esClaseServicio() && (!v.marca || !v.modelo)) {
      this.formulario.patchValue({ descripcionAuto: '' }, { emitEvent: false });
      return;
    }
    const desc = await this.suministrosSvc.generarDescripcionAuto(v.clase, v.tipo, v.subtipo, v.marca, v.modelo);
    this.formulario.patchValue({ descripcionAuto: desc }, { emitEvent: false });
  }

  // ─── Modal genérico "Nuevo item de catálogo" ────────────────────────────
  abrirModalTipo(): void {
    this.modalCatalogo.set({
      descripcion: 'TIPO_SUMINISTRO', titulo: 'Nuevo Tipo', etiqueta: 'Nombre del Tipo',
      placeholder: 'Ej: Balanza Industrial', campoFormulario: 'tipo',
    });
  }

  abrirModalSubtipo(): void {
    this.modalCatalogo.set({
      descripcion: 'SUBTIPO_SUMINISTRO', titulo: 'Nuevo Sub-Tipo', etiqueta: 'Nombre del Sub-Tipo',
      placeholder: 'Ej: De Plataforma', campoFormulario: 'subtipo',
    });
  }

  abrirModalMarca(): void {
    this.modalCatalogo.set({
      descripcion: 'MARCA_SUMINISTRO', titulo: 'Nueva Marca', etiqueta: 'Nombre de la Marca',
      placeholder: 'Ej: OHAUS', campoFormulario: 'marca',
    });
  }

  abrirModalModelo(): void {
    this.modalCatalogo.set({
      descripcion: 'MODELO_SUMINISTRO', titulo: 'Nuevo Modelo', etiqueta: 'Nombre del Modelo',
      placeholder: 'Ej: TW-M2', campoFormulario: 'modelo',
    });
  }

  cerrarModalCatalogo(): void { this.modalCatalogo.set(null); }

  async crearItemCatalogo(label: string): Promise<void> {
    const m = this.modalCatalogo();
    if (!m || this.guardandoCatalogo()) return;
    this.guardandoCatalogo.set(true);
    try {
      const nueva = await this.suministrosSvc.agregarItemCatalogo(m.descripcion, label);
      // Refrescar el signal correspondiente desde el cache del service
      switch (m.campoFormulario) {
        case 'tipo':    this.tiposOpciones.set(await this.suministrosSvc.obtenerTipos()); break;
        case 'subtipo': this.subtiposOpciones.set(await this.suministrosSvc.obtenerSubtipos()); break;
        case 'marca':   this.marcasSignal.set(await this.suministrosSvc.obtenerMarcas()); break;
        case 'modelo':  this.modelosSignal.set(await this.suministrosSvc.obtenerModelos()); break;
      }
      this.formulario.patchValue({ [m.campoFormulario]: nueva.value });
      this.toastSvc.exito(`"${nueva.label}" agregado al catálogo.`);
      this.modalCatalogo.set(null);
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'Error al agregar item al catálogo.');
    } finally {
      this.guardandoCatalogo.set(false);
    }
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
      unidad: 'unidad_bienes',
      procedencia: 'nacional',
      usarEnPropuestas: true,
      precioMinReferencia: null,
      escalaEstandar: null,
      escalaVolumen: null,
      escalaCorporativoAlto: null,
      aplicaComercial: false,
      aplicaServicio: false,
      aplicaMetrologia: false,
    });
    this.claseActual.set('');
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
  }

  restaurarBorrador(): void {
    const draft = this.borradorDisponible();
    if (!draft) return;
    this.autoguardadoActivo = false;
    this.formulario.patchValue(draft.data as object, { emitEvent: false });
    // Resync claseActual + validadores dependientes de clase
    const claseVal = this.formulario.get('clase')?.value ?? '';
    this.claseActual.set(claseVal);
    this.actualizarValidadoresPorClase(claseVal);
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
    this.router.navigate(['/maestros/suministros']);
  }

  // ─── Guardar ──────────────────────────────────────────────────────────
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
      const dto: GuardarSuministroRequest = {
        idSuministro:       this.idSuministro,
        clase:              v.clase,
        tipo:               v.tipo,
        subtipo:            v.subtipo,
        marca:              esServicio(v.clase) ? '' : (v.marca ?? ''),
        modelo:             esServicio(v.clase) ? '' : (v.modelo ?? ''),
        descripcionAuto:    v.descripcionAuto ?? '',
        descripcionManual:  v.descripcionManual?.trim() ?? '',
        alcance:            v.alcance ?? '',
        unidad:             v.unidad,
        ctaContable:        v.ctaContable ?? '',
        procedencia:        v.procedencia,
        casillero:          v.casillero ?? '',
        esActivoEnCatalogo: !!v.esActivoEnCatalogo,
        usarEnPropuestas:    !!v.usarEnPropuestas,
        codigoUnspsc:        v.codigoUnspsc ?? '',
        precioMinReferencia: v.precioMinReferencia != null && v.precioMinReferencia !== '' ? Number(v.precioMinReferencia) : null,
        escalas: [
          { nivel: 'estandar',         precio: v.escalaEstandar != null && v.escalaEstandar !== '' ? Number(v.escalaEstandar) : null },
          { nivel: 'volumen',          precio: v.escalaVolumen != null && v.escalaVolumen !== '' ? Number(v.escalaVolumen) : null },
          { nivel: 'corporativo_alto', precio: v.escalaCorporativoAlto != null && v.escalaCorporativoAlto !== '' ? Number(v.escalaCorporativoAlto) : null },
        ],
        aplicaComercial:  !!v.aplicaComercial,
        aplicaServicio:   !!v.aplicaServicio,
        aplicaMetrologia: !!v.aplicaMetrologia,
        idPrimerProcedimiento:  esServicio(v.clase) ? (v.idPrimerProcedimiento  || undefined) : undefined,
        idSegundoProcedimiento: esServicio(v.clase) ? (v.idSegundoProcedimiento || undefined) : undefined,
        guardarComoBorrador: false,
      };
      await this.suministrosSvc.guardarSuministro(dto);
      this.borradorSvc.borrar(this.borradorKey);
      this.salidaControlada = true;
      this.toastSvc.exito(
        this.esNuevo()
          ? 'Suministro registrado y publicado correctamente.'
          : 'Suministro actualizado correctamente.'
      );
      this.router.navigate(['/maestros/suministros']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el suministro.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/suministros']);
  }
}
