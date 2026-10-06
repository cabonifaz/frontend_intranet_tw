import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { SuministrosService, DescripcionCatalogoSuministro } from '../../../../core/services/suministros.service';
import { SiguienteCodigoService } from '../../../../core/services/siguiente-codigo.service';
import { FormatosVentanaService } from '../../../../core/services/formatos-ventana.service';
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
  private readonly siguienteCodSvc = inject(SiguienteCodigoService);
  private readonly formatoSvc      = inject(FormatosVentanaService);
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

  // Catálogos cargados desde tabla_maestra on init.
  // Subtipo pasó a texto libre (pedido cliente 2026-10-06) → no se carga catálogo.
  // Procedencia pasó a texto libre + solo visible fuera de Servicio → no se carga catálogo.
  // Unidad fue removida del formulario (pedido cliente 2026-10-06) → no se carga catálogo.
  readonly clasesOpciones       = signal<OpcionCatalogo[]>([]);
  readonly tiposOpciones        = signal<OpcionCatalogo[]>([]);
  readonly nivelesTarifa        = NIVELES_TARIFA;

  readonly marcasSignal         = signal<OpcionCatalogo[]>([]);
  readonly modelosSignal        = signal<OpcionCatalogo[]>([]);
  readonly procedimientosSignal = signal<OpcionCatalogo[]>([]);

  // Regla de negocio: si clase === 'servicio' → sin Marca/Modelo, con Procedimientos.
  // Si clase !== 'servicio' → con Marca/Modelo, sin Procedimientos.
  readonly esClaseServicio = computed(() => esServicio(this.claseActual()));

  /**
   * Tipos filtrados por Clase Principal. El filtro usa `OpcionCatalogo.parentCode`
   * (mapeado desde `tabla_maestra.string3`). Fallback: si NINGÚN tipo tiene
   * parentCode poblado todavía (Bryan aún no actualizó los seeds) devuelve todos
   * para no romper la UX; el filtro se activa automáticamente cuando el seed
   * incluya el código de clase padre.
   */
  readonly tiposFiltrados = computed(() => {
    const clase = this.claseActual();
    const todos = this.tiposOpciones();
    if (!clase) return [];
    const conPadre = todos.filter(t => !!t.parentCode);
    if (conPadre.length === 0) return todos;        // fallback mientras el back no tenga string3
    return todos.filter(t => t.parentCode === clase);
  });

  idSuministro = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Identificación
    clase:              ['', Validators.required],
    esActivoEnCatalogo: [true],
    tipo:               ['', Validators.required],
    // Subtipo pasó a texto libre (pedido cliente 2026-10-06)
    subtipo:            ['', [Validators.required, Validators.maxLength(80)]],
    marca:              [''],   // requerido solo si clase !== 'servicio' (validación dinámica)
    modelo:             [''],   // idem

    // 02 - Descripciones y Logística
    descripcionAuto:    [''],
    descripcionManual:  ['', [Validators.required, Validators.minLength(10)]],
    alcance:            [''],
    ctaContable:        [''],
    // Procedencia es texto libre + solo visible si clase !== 'servicio'
    procedencia:        [''],

    // 03 - Parámetros de Cotización
    usarEnPropuestas:    [true],
    precioMinReferencia: [null],
    escalaEstandar:         [null],
    escalaVolumen:          [null],
    escalaCorporativoAlto:  [null],
    // Áreas de aplicación: 'Comercial' removida (pedido cliente). aplicaComercial
    // queda en el modelo con false fijo para compat de DTO hasta que Bryan limpie.
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

  // Código visible en el header de la ficha (modo nuevo y editar).
  // En nuevo: trae el siguiente código real del back; mientras llega muestra
  // un placeholder. En editar: se setea cuando se carga el detalle.
  readonly codigoFicha = signal('SUM-…');
  // Código de formato ISO/calidad configurable por la empresa (ej. "MTW97-10").
  // Se muestra como badge secundario al lado del código de ficha. Null si TW no
  // lo configuró para esta ventana.
  readonly formatoCalidad = signal<string | null>(null);
  readonly codigoBadge = computed(() => this.codigoFicha());

  // ─── Modal genérico "Nuevo item de catálogo" (Tipo/Subtipo/Marca/Modelo) ──
  readonly modalCatalogo = signal<{
    descripcion: DescripcionCatalogoSuministro;
    titulo: string;
    etiqueta: string;
    placeholder: string;
    campoFormulario: 'tipo' | 'marca' | 'modelo';
  } | null>(null);
  readonly guardandoCatalogo = signal(false);

  async ngOnInit(): Promise<void> {
    // Carga paralela de los catálogos usados en el UI actual + procedimientos (HU-87).
    // Subtipo (texto libre), Procedencia (texto libre), Unidad (removida) ya no cargan catálogo.
    const [clases, tipos, marcas, modelos, procedimientos] = await Promise.all([
      this.suministrosSvc.obtenerClases(),
      this.suministrosSvc.obtenerTipos(),
      this.suministrosSvc.obtenerMarcas(),
      this.suministrosSvc.obtenerModelos(),
      this.suministrosSvc.obtenerProcedimientos().catch(() => []),
    ]);
    this.clasesOpciones.set(clases);
    this.tiposOpciones.set(tipos);
    this.marcasSignal.set(marcas);
    this.modelosSignal.set(modelos);
    this.procedimientosSignal.set(procedimientos);

    // Sincronizar claseActual con el FormControl para que el computed reaccione.
    // Al cambiar la clase, el filtro de Tipo puede dejar inválido el tipo elegido
    // → reseteamos el tipo para forzar re-selección dentro de la nueva clase.
    this.formulario.get('clase')?.valueChanges.subscribe(v => {
      const nuevaClase = v ?? '';
      if (nuevaClase !== this.claseActual()) {
        this.formulario.get('tipo')?.setValue('', { emitEvent: false });
      }
      this.claseActual.set(nuevaClase);
      this.actualizarValidadoresPorClase(nuevaClase);
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

    // Siguiente código: para "nuevo" lo consulta al back (preview); para "editar"
    // el código real se setea desde el detalle. Fallback si el back falla.
    if (nuevo) {
      this.siguienteCodSvc.obtener('suministro')
        .then(c => this.codigoFicha.set(c))
        .catch(() => this.codigoFicha.set('SUM-NUEVO'));
    }

    // Formato de calidad ISO (opcional). Si viene con etiqueta la mostramos.
    this.formatoSvc.obtener('suministro_ficha')
      .then(f => this.formatoCalidad.set(f?.etiqueta ?? null));

    try {
      if (!nuevo) {
        this.idSuministro = Number(idParam);
        this.codigoFicha.set(`SUM-ID-${this.idSuministro}`);
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
          ctaContable:        s.ctaContable,
          procedencia:        s.procedencia,
          usarEnPropuestas:    s.usarEnPropuestas,
          precioMinReferencia: s.precioMinReferencia,
          escalaEstandar:         s.escalas.find(e => e.nivel === 'estandar')?.precio         ?? null,
          escalaVolumen:          s.escalas.find(e => e.nivel === 'volumen')?.precio          ?? null,
          escalaCorporativoAlto:  s.escalas.find(e => e.nivel === 'corporativo_alto')?.precio ?? null,
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
      procedencia: '',
      usarEnPropuestas: true,
      precioMinReferencia: null,
      escalaEstandar: null,
      escalaVolumen: null,
      escalaCorporativoAlto: null,
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
      // Áreas de ejecución (aplicaServicio / aplicaMetrologia) solo tienen sentido
      // para clase 'servicio'. Para el resto se fuerzan a false en el DTO.
      const esServ = esServicio(v.clase);
      const dto: GuardarSuministroRequest = {
        idSuministro:       this.idSuministro,
        clase:              v.clase,
        tipo:               v.tipo,
        subtipo:            v.subtipo?.trim() ?? '',
        marca:              esServ ? '' : (v.marca ?? ''),
        modelo:             esServ ? '' : (v.modelo ?? ''),
        descripcionAuto:    v.descripcionAuto ?? '',
        descripcionManual:  v.descripcionManual?.trim() ?? '',
        alcance:            v.alcance ?? '',
        // Unidad, Casillero y UNSPSC fueron removidos del UI (2026-10-06).
        // Enviamos defaults vacíos para compat hasta que Bryan deprecie los campos.
        unidad:             '',
        ctaContable:        v.ctaContable ?? '',
        // Procedencia solo tiene sentido fuera de Servicio.
        procedencia:        esServ ? '' : (v.procedencia?.trim() ?? ''),
        casillero:          '',
        esActivoEnCatalogo: !!v.esActivoEnCatalogo,
        usarEnPropuestas:    !!v.usarEnPropuestas,
        codigoUnspsc:        '',
        precioMinReferencia: v.precioMinReferencia != null && v.precioMinReferencia !== '' ? Number(v.precioMinReferencia) : null,
        escalas: [
          { nivel: 'estandar',         precio: v.escalaEstandar != null && v.escalaEstandar !== '' ? Number(v.escalaEstandar) : null },
          { nivel: 'volumen',          precio: v.escalaVolumen != null && v.escalaVolumen !== '' ? Number(v.escalaVolumen) : null },
          { nivel: 'corporativo_alto', precio: v.escalaCorporativoAlto != null && v.escalaCorporativoAlto !== '' ? Number(v.escalaCorporativoAlto) : null },
        ],
        // 'Comercial' removida del UI; se envía fijo false. Las áreas de ejecución
        // además solo aplican a Servicio → false para el resto.
        aplicaComercial:  false,
        aplicaServicio:   esServ ? !!v.aplicaServicio   : false,
        aplicaMetrologia: esServ ? !!v.aplicaMetrologia : false,
        idPrimerProcedimiento:  esServ ? (v.idPrimerProcedimiento  || undefined) : undefined,
        idSegundoProcedimiento: esServ ? (v.idSegundoProcedimiento || undefined) : undefined,
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
