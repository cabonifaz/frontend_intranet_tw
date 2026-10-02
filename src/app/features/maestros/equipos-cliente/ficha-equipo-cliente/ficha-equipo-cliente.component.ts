import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { EquiposClienteService } from '../../../../core/services/equipos-cliente.service';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import {
  CLASES_EXACTITUD,
  CLASIFICACIONES_EQUIPO,
  ESTADOS_OPERATIVOS,
  FotoEquipo,
  GuardarEquipoClienteRequest,
  OrdenTrabajoResumen,
} from '../../../../core/models/equipos-cliente.model';
import { ClienteListaItem, SedeListaItem } from '../../../../core/models/maestros.model';
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
  readonly fotos             = signal<FotoEquipo[]>([]);
  readonly hojaVida          = signal<OrdenTrabajoResumen[]>([]);
  readonly proximaCalibracion = signal('');
  readonly clienteRazonSocial = signal('');

  // Catálogos
  readonly clasificacionesOpciones = CLASIFICACIONES_EQUIPO;
  readonly clasesExactitud         = CLASES_EXACTITUD;
  readonly estadosOperativos       = ESTADOS_OPERATIVOS;

  // Dropdowns dinámicos
  readonly clientes          = signal<ClienteListaItem[]>([]);
  readonly sedes             = signal<SedeListaItem[]>([]);
  readonly suministros       = signal<{ value: number; label: string; marca: string; modelo: string }[]>([]);

  idEquipo = 0;

  formulario: FormGroup = this.fb.group({
    // 01 - Datos Generales y Ubicación
    idCliente:              [0, [Validators.required, Validators.min(1)]],
    idSede:                 [0, [Validators.required, Validators.min(1)]],
    clasificacion:          ['', Validators.required],
    ubicacionEspecifica:    [''],
    esPreRevisado:          [false],
    bloqueadoParaServicios: [false],

    // 02 - Especificaciones Metrológicas y Técnicas
    idSuministro:           [null],
    numSerie:               ['', [Validators.required, Validators.minLength(3)]],
    codigoCliente:          [''],
    marca:                  ['', Validators.required],
    modelo:                 ['', Validators.required],
    divisionMinima:         [''],
    divisionVerif:          [''],
    divisionVerifIgual:     [true],
    claseExactitud:         ['III'],
    alcanceMaximo:          [''],
    escalaGraduacion:       [''],
    puntosCalibracion:      [''],
    rangoOperativoReal:     [''],
    observaciones:          [''],

    // 03 - Estado Operativo
    estadoOperativo:        ['oficina_tw'],
    esActivo:               [true],
  });

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Equipos de Cliente', ruta: '/maestros/equipos' },
    this.esNuevo() ? 'Nuevo Registro' : 'Editar Registro',
  ));

  readonly codigoBadge = computed(() => {
    if (this.esNuevo()) return 'AUTO · EQ-TW-NEW';
    return this.codigoTw() || `ID · ${this.idEquipo}`;
  });

  async ngOnInit(): Promise<void> {
    this.suministros.set(await this.equiposSvc.obtenerSuministrosParaDropdown());
    await this.cargarClientes();

    // Autofill de marca/modelo cuando el usuario elige un suministro del catálogo.
    // En modo edición los controles ya están disabled por la regla de inmutabilidad,
    // así que esta lógica solo tiene efecto en "Nuevo Equipo".
    this.formulario.get('idSuministro')?.valueChanges.subscribe(idSum => {
      const marcaCtrl  = this.formulario.get('marca');
      const modeloCtrl = this.formulario.get('modelo');
      if (!marcaCtrl || !modeloCtrl || !this.esNuevo()) return;

      if (idSum != null && idSum !== '' && Number(idSum) > 0) {
        const sum = this.suministros().find(s => s.value === Number(idSum));
        if (sum) {
          marcaCtrl.setValue(sum.marca,   { emitEvent: false });
          modeloCtrl.setValue(sum.modelo, { emitEvent: false });
          marcaCtrl.disable({ emitEvent: false });
          modeloCtrl.disable({ emitEvent: false });
        }
      } else {
        marcaCtrl.enable({ emitEvent: false });
        modeloCtrl.enable({ emitEvent: false });
        marcaCtrl.setValue('',  { emitEvent: false });
        modeloCtrl.setValue('', { emitEvent: false });
      }
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);
    this.borradorKey = `equipos:${nuevo ? 'nuevo' : idParam}`;

    try {
      if (!nuevo) {
        this.idEquipo = Number(idParam);
        const e = await this.equiposSvc.obtenerEquipoPorId(this.idEquipo);
        // Cargar sedes del cliente antes de patchValue para que el dropdown tenga opciones
        await this.cargarSedesDelCliente(e.idCliente);
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
          estadoOperativo:        e.estadoOperativo,
          esActivo:               e.esActivo,
        });
        // En modo edición: serie/marca/modelo quedan BLOQUEADOS (regla de negocio)
        this.formulario.get('numSerie')?.disable();
        this.formulario.get('marca')?.disable();
        this.formulario.get('modelo')?.disable();
        // Metadata readonly
        this.codigoTw.set(e.codigoTw);
        this.suministroLabel.set(e.suministroLabel);
        this.usuarioRegistro.set(e.usuarioRegistro);
        this.pcRegistro.set(e.pcRegistro);
        this.fechaRegistro.set(e.fechaRegistro);
        this.fechaModificacion.set(e.fechaModificacion);
        this.usuarioPreRevisor.set(e.usuarioPreRevisor);
        this.fechaPreRevision.set(e.fechaPreRevision);
        this.fotos.set(e.fotos);
        this.hojaVida.set(e.hojaVida);
        this.proximaCalibracion.set(e.proximaCalibracion);
        this.clienteRazonSocial.set(e.clienteRazonSocial);
      }

      // Subscripción al cambio de cliente para refrescar sedes
      this.formulario.get('idCliente')?.valueChanges.subscribe(async idCliente => {
        if (idCliente && idCliente > 0) {
          await this.cargarSedesDelCliente(idCliente);
        } else {
          this.sedes.set([]);
          this.formulario.patchValue({ idSede: 0 }, { emitEvent: false });
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

  seleccionarEstado(estado: string): void {
    this.formulario.patchValue({ estadoOperativo: estado });
  }

  getIndiceEstado(): number {
    const actual = this.formulario.get('estadoOperativo')?.value;
    return this.estadosOperativos.findIndex(e => e.value === actual);
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
      const dto: GuardarEquipoClienteRequest = {
        idEquipo:               this.idEquipo,
        numSerie:               v.numSerie?.trim() ?? '',
        idCliente:              Number(v.idCliente) || 0,
        idSede:                 Number(v.idSede) || 0,
        codigoCliente:          v.codigoCliente?.trim() ?? '',
        clasificacion:          v.clasificacion,
        marca:                  v.marca?.trim() ?? '',
        modelo:                 v.modelo?.trim() ?? '',

        ubicacionEspecifica:    v.ubicacionEspecifica?.trim() ?? '',
        esPreRevisado:          !!v.esPreRevisado,
        bloqueadoParaServicios: !!v.bloqueadoParaServicios,

        idSuministro:           v.idSuministro != null && v.idSuministro !== '' ? Number(v.idSuministro) : null,
        divisionMinima:         v.divisionMinima?.trim() ?? '',
        divisionVerif:          v.divisionVerif?.trim() ?? '',
        divisionVerifIgual:     !!v.divisionVerifIgual,
        claseExactitud:         v.claseExactitud,
        alcanceMaximo:          v.alcanceMaximo?.trim() ?? '',
        escalaGraduacion:       v.escalaGraduacion?.trim() ?? '',
        puntosCalibracion:      v.puntosCalibracion?.trim() ?? '',
        rangoOperativoReal:     v.rangoOperativoReal?.trim() ?? '',
        observaciones:          v.observaciones?.trim() ?? '',

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
