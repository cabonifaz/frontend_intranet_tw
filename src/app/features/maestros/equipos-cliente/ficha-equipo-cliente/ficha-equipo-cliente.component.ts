import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { EquiposClienteService } from '../../../../core/services/equipos-cliente.service';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { AreasClienteService } from '../../../../core/services/areas-cliente.service';
import { SiguienteCodigoService } from '../../../../core/services/siguiente-codigo.service';
import { FormatosVentanaService } from '../../../../core/services/formatos-ventana.service';
import { SuministrosService } from '../../../../core/services/suministros.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import {
  FotoEquipo,
  GuardarEquipoClienteRequest,
  OrdenTrabajoResumen,
} from '../../../../core/models/equipos-cliente.model';
import { OpcionCatalogo } from '../../../../core/models/suministros.model';
import { AreaCliente, ClienteListaItem, SedeListaItem } from '../../../../core/models/maestros.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CampoComponent }  from '../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../shared/ui/toggle/toggle.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

@Component({
  selector: 'app-ficha-equipo-cliente',
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
    ModalBorradorComponent,
  ],
  templateUrl: './ficha-equipo-cliente.component.html',
  styleUrl: './ficha-equipo-cliente.component.scss',
})
export class FichaEquipoClienteComponent implements OnInit, OnDestroy {
  private readonly fb         = inject(FormBuilder);
  private readonly equiposSvc  = inject(EquiposClienteService);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly areasSvc    = inject(AreasClienteService);
  private readonly siguienteCodSvc = inject(SiguienteCodigoService);
  private readonly formatoSvc  = inject(FormatosVentanaService);
  private readonly suministrosSvc = inject(SuministrosService);
  private readonly borradorSvc = inject(BorradorService);
  private readonly toastSvc    = inject(ToastService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly destroyRef  = inject(DestroyRef);

  readonly cargando          = signal(true);
  readonly guardando         = signal(false);
  readonly guardandoBorrador = signal(false);
  readonly error             = signal('');
  readonly esNuevo           = signal(true);

  // ─── Borrador local (autoguardado + banner Restaurar/Descartar) ───
  readonly borradorDisponible = signal<BorradorInfo<unknown> | null>(null);
  private borradorKey = '';
  private autoguardadoActivo = false;
  private huboCambiosAutoguardados = false;
  private salidaControlada = false;

  // Metadata (readonly)
  readonly codigoTw          = signal('');
  readonly suministroLabel   = signal('');
  readonly usuarioRegistro   = signal('');
  readonly pcRegistro        = signal('');
  readonly fechaRegistro     = signal('');
  readonly fechaModificacion = signal('');
  readonly usuarioPreRevisor = signal('');
  readonly fechaPreRevision  = signal('');
  readonly usuarioBloqueo    = signal('');
  readonly fechaBloqueo      = signal('');
  readonly fotos             = signal<FotoEquipo[]>([]);
  readonly hojaVida          = signal<OrdenTrabajoResumen[]>([]);
  readonly proximaCalibracion = signal('');
  readonly clienteRazonSocial = signal('');

  // Catálogos.
  // Clasificación técnica se consume de BD (CLASE_SUMINISTRO de tabla_maestra),
  // filtrando "Servicio" porque un equipo del cliente no puede ser un servicio.
  // Reutiliza el mismo catálogo que la ficha de Suministros.
  readonly clasificacionesOpciones = signal<OpcionCatalogo[]>([]);
  // Clase de exactitud (I, II, III, IV) desde CLASE_EXACTITUD (tabla_maestra 82).
  readonly clasesExactitud         = signal<OpcionCatalogo[]>([]);
  // Estados operativos del timeline (ya solo informativos, el back los mueve)
  // desde ESTADO_OPERATIVO_EQUIPO (tabla_maestra 83).
  readonly estadosOperativos       = signal<OpcionCatalogo[]>([]);

  // Dropdowns dinámicos
  readonly clientes          = signal<ClienteListaItem[]>([]);
  readonly sedes             = signal<SedeListaItem[]>([]);
  // Suministros filtrados por Clasificación técnica del equipo. Se recargan cada
  // vez que cambia `clasificacion` en el form.
  readonly suministros       = signal<{ value: number; label: string; clase: string; marca: string; modelo: string }[]>([]);
  // Áreas del cliente seleccionado. Son por cliente (ej. "Zona de carnes",
  // "Patio norte") — se consultan vía AreasClienteService contra `area_cliente`.
  // El valor que se guarda en `ubicacionEspecifica` es el NOMBRE del área
  // (no un id), para que al renombrar el área el back cascada el cambio al
  // equipo_cliente automáticamente (lo hace SP_GuardarAreaCliente).
  readonly areasCliente      = signal<AreaCliente[]>([]);

  // ─── Searchable dropdown de Suministro (E4a) ──────────────────────────────
  readonly suministroQuery           = signal('');
  readonly suministroDropdownAbierto = signal(false);
  readonly suministroSeleccionadoLabel = signal('');

  readonly suministrosFiltrados = computed(() => {
    const q = this.suministroQuery().trim().toLowerCase();
    const todos = this.suministros();
    if (!q) return todos.slice(0, 50);     // tope defensivo para render
    return todos.filter(s => s.label.toLowerCase().includes(q)).slice(0, 50);
  });

  // Clasificación técnica reactiva (para computed de secciones condicionales).
  readonly clasificacionActual = signal('');
  readonly esClasifEquipo      = computed(() => this.clasificacionActual() === 'equipo');
  readonly esClasifInstrumento = computed(() => this.clasificacionActual() === 'instrumento');
  readonly esClasifPesa        = computed(() => this.clasificacionActual() === 'pesa');

  idEquipo = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Datos Generales y Ubicación
    idCliente:              [0, [Validators.required, Validators.min(1)]],
    idSede:                 [0, [Validators.required, Validators.min(1)]],
    clasificacion:          ['', Validators.required],
    // Ubicación: ahora es un dropdown vinculado a las áreas del cliente.
    ubicacionEspecifica:    [''],
    esPreRevisado:          [false],
    bloqueadoParaServicios: [false],

    // 02 - Especificaciones Metrológicas y Técnicas
    idSuministro:           [null],
    numSerie:               ['', [Validators.required, Validators.minLength(3)]],
    codigoCliente:          [''],
    // Marca y Modelo removidos del UI (pedido cliente 2026-10-06). Se derivan
    // automáticamente del Suministro seleccionado. Se mantienen como campos
    // (sin required) sólo para compat con el DTO del back hasta deprecación.
    marca:                  [''],
    modelo:                 [''],
    divisionMinima:         [''],
    divisionVerif:          [''],
    divisionVerifIgual:     [true],
    claseExactitud:         ['III'],
    alcanceMaximo:          [''],       // visible: equipo + instrumento
    escalaGraduacion:       [''],       // visible: instrumento
    puntosCalibracion:      [''],       // visible: instrumento
    rangoOperativoReal:     [''],       // visible: instrumento
    observaciones:          [''],       // visible: equipo + instrumento
    // Específicos de Pesa (visibles solo si clasificacion === 'pesa')
    material:               [''],
    valorNominal:           [''],

    // 03 - Estado Operativo
    estadoOperativo:        ['oficina_tw'],
    esActivo:               [true],
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Equipos de Cliente', ruta: '/maestros/equipos' },
    this.esNuevo() ? 'Nuevo Registro' : 'Editar Registro',
  ));

  // Código visible en el header. En nuevo: trae el siguiente código del back.
  // En editar: usa el codigoTw del detalle (que es el real asignado al guardar).
  readonly codigoFichaPreview = signal('EQ-TW-…');
  // Código de formato ISO/calidad para la ventana de Equipos del Cliente.
  readonly formatoCalidad = signal<string | null>(null);
  readonly codigoBadge = computed(() => {
    if (this.esNuevo()) return this.codigoFichaPreview();
    return this.codigoTw() || `EQ-TW-ID-${this.idEquipo}`;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarClientes();
    // Clasificación técnica = clases de suministro excepto "Servicio"
    // (un equipo del cliente no es un servicio).
    this.suministrosSvc.obtenerClases()
      .then(clases => this.clasificacionesOpciones.set(clases.filter(c => c.value !== 'servicio')))
      .catch(() => this.clasificacionesOpciones.set([]));
    // Clase de exactitud + Estados operativos del timeline (desde tabla_maestra).
    this.maestrosSvc.obtenerCatalogo('CLASE_EXACTITUD')
      .then(c => this.clasesExactitud.set(c.map(i => ({ value: i.codigo ?? i.nombre, label: i.nombre }))))
      .catch(() => this.clasesExactitud.set([]));
    this.maestrosSvc.obtenerCatalogo('ESTADO_OPERATIVO_EQUIPO')
      .then(c => this.estadosOperativos.set(c.map(i => ({ value: i.codigo ?? i.nombre, label: i.nombre }))))
      .catch(() => this.estadosOperativos.set([]));

    // Reaccionar al cambio de Clasificación técnica: recarga la lista de suministros
    // filtrada por esa clase (equipo / instrumento / pesa). Y resetea el suministro
    // elegido si cambia la clase.
    this.formulario.get('clasificacion')?.valueChanges.subscribe(async c => {
      const nueva = c ?? '';
      if (nueva !== this.clasificacionActual()) {
        this.formulario.get('idSuministro')?.setValue(null, { emitEvent: false });
        this.suministroSeleccionadoLabel.set('');
        this.suministroQuery.set('');
      }
      this.clasificacionActual.set(nueva);
      await this.cargarSuministrosPorClase(nueva || undefined);
    });

    // Al cambiar de suministro seleccionado, sincronizar el label visible del input.
    this.formulario.get('idSuministro')?.valueChanges.subscribe(idSum => {
      if (idSum == null || idSum === '' || Number(idSum) === 0) {
        this.suministroSeleccionadoLabel.set('');
        return;
      }
      const s = this.suministros().find(x => x.value === Number(idSum));
      if (s) this.suministroSeleccionadoLabel.set(s.label);
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);
    this.borradorKey = `equipos:${nuevo ? 'nuevo' : idParam}`;

    // Siguiente código real del back (solo en modo nuevo). En editar se usa el
    // codigoTw del detalle que llega más abajo.
    if (nuevo) {
      this.siguienteCodSvc.obtener('equipo_cliente')
        .then(c => this.codigoFichaPreview.set(c))
        .catch(() => this.codigoFichaPreview.set('EQ-TW-NUEVO'));
    }

    // Formato de calidad ISO (opcional). Si viene con etiqueta la mostramos.
    this.formatoSvc.obtener('equipo_cliente_ficha')
      .then(f => this.formatoCalidad.set(f?.etiqueta ?? null));

    try {
      if (!nuevo) {
        this.idEquipo = Number(idParam);
        const e = await this.equiposSvc.obtenerEquipoPorId(this.idEquipo);
        // Pre-cargar: sedes del cliente, áreas del cliente, y suministros de la clase
        // antes de patchValue para que todos los dropdowns tengan opciones.
        await Promise.all([
          this.cargarSedesDelCliente(e.idCliente),
          this.cargarAreasDelCliente(e.idCliente),
          this.cargarSuministrosPorClase(e.clasificacion),
        ]);
        this.clasificacionActual.set(e.clasificacion);
        this.formulario.patchValue({
          idCliente:              e.idCliente,
          idSede:                 e.idSede,
          clasificacion:          e.clasificacion,
          ubicacionEspecifica:    e.ubicacionEspecifica,
          esPreRevisado:          e.esPreRevisado,
          bloqueadoParaServicios: e.bloqueadoParaServicios,
          idSuministro:           e.idSuministro,
          numSerie:               e.numSerie,
          codigoCliente:          e.codigoCliente,
          marca:                  e.marca,
          modelo:                 e.modelo,
          divisionMinima:         e.divisionMinima,
          divisionVerif:          e.divisionVerif,
          divisionVerifIgual:     e.divisionVerifIgual,
          claseExactitud:         e.claseExactitud,
          alcanceMaximo:          e.alcanceMaximo,
          escalaGraduacion:       e.escalaGraduacion,
          puntosCalibracion:      e.puntosCalibracion,
          rangoOperativoReal:     e.rangoOperativoReal,
          observaciones:          e.observaciones,
          material:               e.material ?? '',
          valorNominal:           e.valorNominal ?? '',
          estadoOperativo:        e.estadoOperativo,
          esActivo:               e.esActivo,
        });
        // En modo edición: serie queda BLOQUEADA (regla de negocio).
        // Marca/Modelo ya no están en el UI, así que no se bloquean.
        this.formulario.get('numSerie')?.disable();
        // Metadata readonly
        this.codigoTw.set(e.codigoTw);
        this.suministroLabel.set(e.suministroLabel);
        this.suministroSeleccionadoLabel.set(e.suministroLabel);
        this.usuarioRegistro.set(e.usuarioRegistro);
        this.pcRegistro.set(e.pcRegistro);
        this.fechaRegistro.set(e.fechaRegistro);
        this.fechaModificacion.set(e.fechaModificacion);
        this.usuarioPreRevisor.set(e.usuarioPreRevisor);
        this.fechaPreRevision.set(e.fechaPreRevision);
        this.usuarioBloqueo.set(e.usuarioBloqueo ?? '');
        this.fechaBloqueo.set(e.fechaBloqueo ?? '');
        this.fotos.set(e.fotos);
        this.hojaVida.set(e.hojaVida);
        this.proximaCalibracion.set(e.proximaCalibracion);
        this.clienteRazonSocial.set(e.clienteRazonSocial);
      }

      // Subscripción al cambio de cliente para refrescar sedes + áreas vinculadas.
      this.formulario.get('idCliente')?.valueChanges.subscribe(async idCliente => {
        if (idCliente && idCliente > 0) {
          await Promise.all([
            this.cargarSedesDelCliente(idCliente),
            this.cargarAreasDelCliente(idCliente),
          ]);
        } else {
          this.sedes.set([]);
          this.areasCliente.set([]);
          this.formulario.patchValue({ idSede: 0, ubicacionEspecifica: '' }, { emitEvent: false });
        }
      });

      // Detectar borrador local y activar autoguardado
      const draft = this.borradorSvc.obtener(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el equipo.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarSuministrosPorClase(clase: string | undefined): Promise<void> {
    this.suministros.set(await this.equiposSvc.obtenerSuministrosParaDropdown(clase));
  }

  /** Carga las áreas específicas de ese cliente (CRUD por cliente). */
  private async cargarAreasDelCliente(idCliente: number): Promise<void> {
    try {
      this.areasCliente.set(await this.areasSvc.listar(idCliente, true));
    } catch {
      this.areasCliente.set([]);
    }
  }

  private async cargarClientes(): Promise<void> {
    try {
      const r = await this.maestrosSvc.obtenerClientes(undefined, undefined, 1, 100);
      this.clientes.set(r.items);
    } catch {
      this.clientes.set([]);
    }
  }

  private async cargarSedesDelCliente(idCliente: number): Promise<void> {
    try {
      const sedes = await this.maestrosSvc.obtenerSedesPorCliente(idCliente);
      this.sedes.set(sedes);
    } catch {
      this.sedes.set([]);
    }
  }

  // El estado operativo ahora lo administra el back automáticamente desde los
  // módulos de CIE, Evaluación y Servicios. La ficha solo lo muestra; el método
  // `seleccionarEstado` quedó deprecado y se removió el handler del click.

  getIndiceEstado(): number {
    const actual = this.formulario.get('estadoOperativo')?.value;
    return this.estadosOperativos().findIndex(e => e.value === actual);
  }

  // Foto placeholder — upload real pendiente (ver memoria: project_hu86_upload_pendiente)
  onSubirFoto(_tipo: string): void {
    this.toastSvc.exito('Subida de foto disponible cuando el back tenga endpoint de storage.');
  }

  limpiarFormulario(): void {
    this.formulario.reset({
      idCliente: 0, idSede: 0,
      claseExactitud: 'III',
      estadoOperativo: 'oficina_tw',
      divisionVerifIgual: true,
      esActivo: true,
    });
    this.clasificacionActual.set('');
    this.suministroQuery.set('');
    this.suministroSeleccionadoLabel.set('');
    this.toastSvc.exito('Formulario limpiado.');
  }

  // ─── Searchable dropdown de Suministro (E4a) ──────────────────────────
  onSuministroQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.suministroQuery.set(value);
    this.suministroDropdownAbierto.set(true);
    // Al tipear, el usuario está buscando — invalidar la selección actual hasta
    // que elija una opción explícitamente.
    if (!value.trim()) {
      this.formulario.get('idSuministro')?.setValue(null, { emitEvent: false });
      this.suministroSeleccionadoLabel.set('');
    }
  }

  seleccionarSuministro(s: { value: number; label: string }): void {
    this.formulario.get('idSuministro')?.setValue(s.value);
    this.suministroSeleccionadoLabel.set(s.label);
    this.suministroQuery.set('');
    this.suministroDropdownAbierto.set(false);
  }

  limpiarSuministro(): void {
    this.formulario.get('idSuministro')?.setValue(null);
    this.suministroSeleccionadoLabel.set('');
    this.suministroQuery.set('');
  }

  cerrarSuministroDropdown(): void {
    // delay para permitir que el click en una opción se procese antes de cerrar
    setTimeout(() => this.suministroDropdownAbierto.set(false), 150);
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
    // Si el usuario salió de la ficha después de editar sin usar los botones Guardar/Guardar Borrador/Descartar,
    // avisamos que el borrador quedó autoguardado para que sepa que puede volver.
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
    this.router.navigate(['/maestros/equipos']);
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
      const v = this.formulario.getRawValue(); // getRawValue incluye los disabled
      const esPesa  = v.clasificacion === 'pesa';
      const esEq    = v.clasificacion === 'equipo';
      const esInstr = v.clasificacion === 'instrumento';
      const dto: GuardarEquipoClienteRequest = {
        idEquipo:               this.idEquipo,
        numSerie:               v.numSerie?.trim() ?? '',
        idCliente:              Number(v.idCliente) || 0,
        idSede:                 Number(v.idSede) || 0,
        codigoCliente:          v.codigoCliente?.trim() ?? '',
        clasificacion:          v.clasificacion,
        // Marca y Modelo deprecados en el UI (2026-10-06). Siempre '' hasta
        // que Bryan elimine los campos del DTO del back.
        marca:                  '',
        modelo:                 '',

        ubicacionEspecifica:    v.ubicacionEspecifica?.trim() ?? '',
        esPreRevisado:          !!v.esPreRevisado,
        bloqueadoParaServicios: !!v.bloqueadoParaServicios,

        idSuministro:           v.idSuministro != null && v.idSuministro !== '' ? Number(v.idSuministro) : null,
        divisionMinima:         v.divisionMinima?.trim() ?? '',
        divisionVerif:          v.divisionVerif?.trim() ?? '',
        divisionVerifIgual:     !!v.divisionVerifIgual,
        claseExactitud:         v.claseExactitud,
        // Alcance y Observación: equipo + instrumento
        alcanceMaximo:          (esEq || esInstr) ? (v.alcanceMaximo?.trim() ?? '') : '',
        observaciones:          (esEq || esInstr) ? (v.observaciones?.trim() ?? '') : '',
        // Escala, puntos, rango: solo instrumento
        escalaGraduacion:       esInstr ? (v.escalaGraduacion?.trim()   ?? '') : '',
        puntosCalibracion:      esInstr ? (v.puntosCalibracion?.trim()  ?? '') : '',
        rangoOperativoReal:     esInstr ? (v.rangoOperativoReal?.trim() ?? '') : '',
        // Material y valor nominal: solo pesa
        material:               esPesa ? (v.material?.trim()     ?? '') : undefined,
        valorNominal:           esPesa ? (v.valorNominal?.trim() ?? '') : undefined,

        estadoOperativo:        v.estadoOperativo,
        esActivo:               !!v.esActivo,

        guardarComoBorrador:    false,
      };
      await this.equiposSvc.guardarEquipo(dto);
      this.borradorSvc.borrar(this.borradorKey);   // borra draft tras guardar exitoso
      this.salidaControlada = true;
      this.toastSvc.exito(this.esNuevo() ? 'Equipo registrado correctamente.' : 'Equipo actualizado correctamente.');
      this.router.navigate(['/maestros/equipos']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el equipo.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/equipos']);
  }
}
