import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { SuplentesService } from '../../../../core/services/suplentes.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import { GuardarUsuarioRequest, SedeOperativa, UsuarioListaItem } from '../../../../core/models/usuarios.model';
import { SuplenteListaItem, GuardarSuplenteRequest } from '../../../../core/models/suplentes.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { ModalComponent }      from '../../../../shared/ui/modal/modal.component';
import { ToggleComponent }     from '../../../../shared/ui/toggle/toggle.component';
import { BadgeComponent }      from '../../../../shared/ui/badge/badge.component';
import { BadgeEstadoComponent } from '../../../../shared/ui/badge-estado/badge-estado.component';
import { ButtonComponent }     from '../../../../shared/ui/button/button.component';
import { CampoComponent }      from '../../../../shared/ui/campo/campo.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

interface RolOpcion {
  value: string;
  label: string;
  esComercial: boolean;
}

interface RequisitoAlta {
  clave: string;
  label: string;
  cumplido: boolean;
}

@Component({
  selector: 'app-ficha-usuario',
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    EstadoVacioComponent,
    HeroHeaderComponent,
    SeccionComponent,
    FormFooterComponent,
    ModalComponent,
    ToggleComponent,
    BadgeComponent,
    BadgeEstadoComponent,
    ButtonComponent,
    CampoComponent,
    ModalBorradorComponent,
  ],
  templateUrl: './ficha-usuario.component.html',
  styleUrl: './ficha-usuario.component.scss',
})
export class FichaUsuarioComponent implements OnInit, OnDestroy {
  private readonly fb           = inject(FormBuilder);
  private readonly usuariosSvc  = inject(UsuariosService);
  private readonly suplentesSvc = inject(SuplentesService);
  private readonly borradorSvc  = inject(BorradorService);
  private readonly toastSvc     = inject(ToastService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly destroyRef   = inject(DestroyRef);

  // Borrador local
  readonly borradorDisponible = signal<BorradorInfo<unknown> | null>(null);
  private borradorKey = '';
  private autoguardadoActivo = false;
  private huboCambiosAutoguardados = false;
  private salidaControlada = false;

  readonly cargando         = signal(true);
  readonly guardando        = signal(false);
  readonly guardandoBorrador = signal(false);
  readonly error            = signal('');
  readonly esNuevo          = signal(true);
  readonly jefes            = signal<UsuarioListaItem[]>([]);
  readonly sedes            = signal<SedeOperativa[]>([]);
  readonly comerciales      = signal<UsuarioListaItem[]>([]);
  readonly suplenciasComoTitular  = signal<SuplenteListaItem[]>([]);
  readonly suplenciasComoSuplente = signal<SuplenteListaItem[]>([]);
  readonly formSuplenteAbierto = signal(false);
  readonly guardandoSuplente   = signal(false);
  readonly errorSuplente       = signal('');
  readonly modalSedesOpen   = signal(false);
  readonly copiado          = signal(false);

  idUsuario = 0;

  readonly rolOpciones: RolOpcion[] = [
    { value: 'admin',             label: 'Administrador',        esComercial: false },
    { value: 'gerencia',          label: 'Gerencia',             esComercial: false },
    { value: 'jefe_comercial',    label: 'Jefe Comercial',       esComercial: true  },
    { value: 'comercial',         label: 'Comercial',            esComercial: true  },
    { value: 'jefe_metrologia',   label: 'Jefe de Metrología',   esComercial: false },
    { value: 'metrologo',         label: 'Metrólogo',            esComercial: false },
    { value: 'jefe_operaciones',  label: 'Jefe de Operaciones',  esComercial: false },
    { value: 'operaciones',       label: 'Operaciones',          esComercial: false },
    { value: 'desarrollador',     label: 'Desarrollador',        esComercial: false },
  ];

  readonly tipoDocOpciones = ['DNI', 'CE', 'Pasaporte'];

  readonly basesOperativas = ['Lima Central', 'Arequipa', 'Cusco', 'Cajamarca', 'Tacna', 'Áncash', 'Apurímac'];

  formulario: FormGroup = this.fb.group({
    nombre:           ['', [Validators.required, Validators.minLength(2)]],
    apellido:         ['', [Validators.required, Validators.minLength(2)]],
    tipoDocumento:    ['DNI', Validators.required],
    numeroDocumento:  ['', [Validators.required, Validators.minLength(6)]],
    correo:           ['', [Validators.required, Validators.email]],
    telefono:         [null],
    cargo:            ['', Validators.required],
    rolSistema:            ['', Validators.required],
    baseOperativa:         ['', Validators.required],
    idSupervisorDirecto:   [null],
    sedesAutorizadas:      [[] as number[]],
    areaComercial:         [null],
    habilitadoFirmaInacal:        [false],
    numeroRegistroInacal:         [null],
    fechaExpiracionCertificacion: [null],
    requiereInduccionSctr:        [false],
    contrasenaTemporal:        [''],
    forzarCambioContrasena:    [true],
    enviarCredencialesCorreo:  [true],
    autenticacion2fa:          [true],
  });

  formSuplente: FormGroup = this.fb.group({
    idSuplente:   [null, Validators.required],
    fechaInicio:  ['', Validators.required],
    fechaFin:     [''],
    sinFechaFin:  [false],
    activo:       [true],
  });

  readonly esRolComercial = computed(() => {
    const rol = this.formulario.get('rolSistema')?.value;
    return this.rolOpciones.find(r => r.value === rol)?.esComercial ?? false;
  });

  readonly rolLabelActual = computed(() => {
    const rol = this.formulario.get('rolSistema')?.value;
    return this.rolOpciones.find(r => r.value === rol)?.label ?? 'Sin rol asignado';
  });

  readonly sedesSeleccionadas = computed<SedeOperativa[]>(() => {
    const ids = (this.formulario.get('sedesAutorizadas')?.value ?? []) as number[];
    return this.sedes().filter(s => ids.includes(s.idSede));
  });

  readonly nombreCompleto = computed(() => {
    const n = this.formulario.get('nombre')?.value?.trim() || '';
    const a = this.formulario.get('apellido')?.value?.trim() || '';
    return `${n} ${a}`.trim() || 'Nombre del Usuario';
  });

  readonly requisitos = computed<RequisitoAlta[]>(() => {
    const v = this.formulario.value;
    return [
      { clave: 'documento', label: 'Documento de identidad válido',            cumplido: !!v.numeroDocumento && v.numeroDocumento.length >= 6 },
      { clave: 'correo',    label: 'Correo corporativo institucional creado',  cumplido: !!v.correo && this.formulario.get('correo')?.valid === true },
      { clave: 'inacal',    label: 'Contrato INACAL DA-DA-01 verificado',      cumplido: !v.habilitadoFirmaInacal || !!v.numeroRegistroInacal },
      { clave: 'seguridad', label: 'Inducción de Seguridad Minera al día',     cumplido: !v.requiereInduccionSctr || v.forzarCambioContrasena },
    ];
  });

  readonly requisitosOk        = computed(() => this.requisitos().every(r => r.cumplido));
  readonly requisitosCumplidos = computed(() => this.requisitos().filter(r => r.cumplido).length);

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => breadcrumbMaestros(
    { label: 'Usuarios', ruta: '/maestros/usuarios' },
    this.esNuevo() ? 'Nuevo Usuario' : 'Editar Usuario',
  ));

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo   = !idParam || idParam === 'nuevo';
    this.esNuevo.set(nuevo);
    this.borradorKey = `usuarios:${nuevo ? 'nuevo' : idParam}`;

    try {
      const [jefes, sedes] = await Promise.all([
        this.usuariosSvc.obtenerJefesDisponibles(),
        this.usuariosSvc.obtenerSedesOperativas(),
      ]);
      this.jefes.set(jefes);
      this.sedes.set(sedes);

      if (!nuevo) {
        this.idUsuario = Number(idParam);
        const u = await this.usuariosSvc.obtenerUsuarioPorId(this.idUsuario);
        await this.cargarSuplencias();
        await this.cargarComerciales();
        this.formulario.patchValue({
          nombre:                       u.nombre,
          apellido:                     u.apellido,
          tipoDocumento:                u.tipoDocumento,
          numeroDocumento:              u.numeroDocumento,
          correo:                       u.correo,
          telefono:                     u.telefono,
          cargo:                        u.cargo,
          rolSistema:                   u.rolSistema,
          baseOperativa:                u.baseOperativa,
          idSupervisorDirecto:          u.idSupervisorDirecto,
          sedesAutorizadas:             u.sedesAutorizadas,
          areaComercial:                u.areaComercial,
          habilitadoFirmaInacal:        u.habilitadoFirmaInacal,
          numeroRegistroInacal:         u.numeroRegistroInacal,
          fechaExpiracionCertificacion: u.fechaExpiracionCertificacion?.substring(0, 10) ?? null,
          requiereInduccionSctr:        u.requiereInduccionSctr,
          forzarCambioContrasena:       u.forzarCambioContrasena,
          enviarCredencialesCorreo:     u.enviarCredencialesCorreo,
          autenticacion2fa:             u.autenticacion2fa,
        });
      } else {
        this.regenerarContrasena();
      }

      // Detectar borrador local y activar autoguardado
      const draft = this.borradorSvc.obtener(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar los datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  regenerarContrasena(): void {
    const nueva = this.usuariosSvc.generarContrasenaTemporal();
    this.formulario.patchValue({ contrasenaTemporal: nueva });
    this.copiado.set(false);
  }

  async copiarContrasena(): Promise<void> {
    const pass = this.formulario.get('contrasenaTemporal')?.value;
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch { /* noop */ }
  }

  abrirModalSedes(): void { this.modalSedesOpen.set(true); }
  cerrarModalSedes(): void { this.modalSedesOpen.set(false); }

  toggleSede(idSede: number): void {
    const actuales = (this.formulario.get('sedesAutorizadas')?.value ?? []) as number[];
    const nuevas = actuales.includes(idSede)
      ? actuales.filter(id => id !== idSede)
      : [...actuales, idSede];
    this.formulario.patchValue({ sedesAutorizadas: nuevas });
  }

  quitarSede(idSede: number): void {
    const actuales = (this.formulario.get('sedesAutorizadas')?.value ?? []) as number[];
    this.formulario.patchValue({ sedesAutorizadas: actuales.filter(id => id !== idSede) });
  }

  estaSedeSeleccionada(idSede: number): boolean {
    const ids = (this.formulario.get('sedesAutorizadas')?.value ?? []) as number[];
    return ids.includes(idSede);
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
    this.router.navigate(['/maestros/usuarios']);
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
      const dto: GuardarUsuarioRequest = {
        idUsuario:                    this.idUsuario,
        nombre:                       v.nombre?.trim(),
        apellido:                     v.apellido?.trim(),
        tipoDocumento:                v.tipoDocumento,
        numeroDocumento:              v.numeroDocumento?.trim(),
        correo:                       v.correo?.trim().toLowerCase(),
        telefono:                     v.telefono || null,
        cargo:                        v.cargo?.trim() || null,
        rolSistema:                   v.rolSistema,
        areaComercial:                this.esRolComercial() ? (v.areaComercial || null) : null,
        baseOperativa:                v.baseOperativa,
        idSupervisorDirecto:          v.idSupervisorDirecto || null,
        sedesAutorizadas:             v.sedesAutorizadas ?? [],
        habilitadoFirmaInacal:        !!v.habilitadoFirmaInacal,
        numeroRegistroInacal:         v.habilitadoFirmaInacal ? (v.numeroRegistroInacal || null) : null,
        fechaExpiracionCertificacion: v.habilitadoFirmaInacal ? (v.fechaExpiracionCertificacion || null) : null,
        requiereInduccionSctr:        !!v.requiereInduccionSctr,
        contrasenaTemporal:           v.contrasenaTemporal,
        forzarCambioContrasena:       !!v.forzarCambioContrasena,
        enviarCredencialesCorreo:     !!v.enviarCredencialesCorreo,
        autenticacion2fa:             !!v.autenticacion2fa,
        guardarComoBorrador:          false,
      };
      await this.usuariosSvc.guardarUsuario(dto);
      this.borradorSvc.borrar(this.borradorKey);
      this.salidaControlada = true;
      this.toastSvc.exito(
        this.esNuevo()
          ? 'Usuario registrado y activado correctamente.'
          : 'Usuario actualizado correctamente.'
      );
      this.router.navigate(['/maestros/usuarios']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el usuario.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/usuarios']);
  }

  // ─── Gestión de Suplencias (edit mode) ───────────────────────────────────

  private async cargarSuplencias(): Promise<void> {
    const [comoTitular, comoSuplente] = await Promise.all([
      this.suplentesSvc.obtenerSuplenciasComoTitular(this.idUsuario),
      this.suplentesSvc.obtenerSuplenciasComoSuplente(this.idUsuario),
    ]);
    this.suplenciasComoTitular.set(comoTitular);
    this.suplenciasComoSuplente.set(comoSuplente);
  }

  private async cargarComerciales(): Promise<void> {
    try {
      const r = await this.usuariosSvc.obtenerUsuarios(undefined, undefined, 'Activo', 1, 200);
      this.comerciales.set(
        r.items.filter(u =>
          (u.rolSistema === 'comercial' || u.rolSistema === 'jefe_comercial') &&
          u.idUsuario !== this.idUsuario
        )
      );
    } catch { /* noop */ }
  }

  abrirFormSuplente(): void {
    this.errorSuplente.set('');
    this.formSuplente.reset({
      idSuplente: null, fechaInicio: '', fechaFin: '',
      sinFechaFin: false, activo: true,
    });
    this.formSuplenteAbierto.set(true);
  }

  cerrarFormSuplente(): void {
    this.formSuplenteAbierto.set(false);
    this.errorSuplente.set('');
  }

  onToggleSinFechaFinSuplente(): void {
    if (this.formSuplente.get('sinFechaFin')?.value) {
      this.formSuplente.patchValue({ fechaFin: '' });
    }
  }

  async guardarNuevoSuplente(): Promise<void> {
    if (this.formSuplente.invalid || this.guardandoSuplente()) {
      this.formSuplente.markAllAsTouched();
      return;
    }
    const v = this.formSuplente.value;

    if (v.idSuplente === this.idUsuario) {
      this.errorSuplente.set('El suplente no puede ser el mismo usuario.');
      return;
    }
    if (!v.sinFechaFin && v.fechaFin && v.fechaFin < v.fechaInicio) {
      this.errorSuplente.set('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    this.guardandoSuplente.set(true);
    this.errorSuplente.set('');
    try {
      const dto: GuardarSuplenteRequest = {
        idAsignacion: 0,
        idTitular:    this.idUsuario,
        idSuplente:   Number(v.idSuplente),
        fechaInicio:  v.fechaInicio,
        fechaFin:     v.sinFechaFin ? null : (v.fechaFin || null),
        sinFechaFin:  !!v.sinFechaFin,
        activo:       !!v.activo,
      };
      const id = await this.suplentesSvc.guardarSuplente(dto);

      // Mock: enriquecer nombres para que aparezcan en la lista
      const suplente = this.comerciales().find(c => c.idUsuario === dto.idSuplente);
      const titular  = { nombre: this.formulario.get('nombre')?.value ?? '', apellido: this.formulario.get('apellido')?.value ?? '', cargo: this.formulario.get('cargo')?.value ?? null };
      if (suplente) {
        SuplentesService.reemplazarNombres(
          id,
          titular,
          { nombre: suplente.nombre, apellido: suplente.apellido, cargo: suplente.areaComercial ?? 'Comercial' },
        );
      }

      this.toastSvc.exito('Suplente asignado correctamente.');
      this.cerrarFormSuplente();
      await this.cargarSuplencias();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al asignar el suplente.';
      this.errorSuplente.set(msg);
    } finally {
      this.guardandoSuplente.set(false);
    }
  }

  async toggleSuplencia(s: SuplenteListaItem): Promise<void> {
    const nuevoEstado = s.estado === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await this.suplentesSvc.cambiarEstadoSuplente({
        idAsignacion: s.idAsignacion,
        estado:       nuevoEstado,
      });
      await this.cargarSuplencias();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }

  iniciales(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  }

  formatearFechaCorta(fecha: string | null): string {
    if (!fecha) return 'Sin límite';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
