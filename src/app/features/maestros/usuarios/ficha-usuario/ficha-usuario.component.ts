import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { SuplentesService } from '../../../../core/services/suplentes.service';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import { GuardarUsuarioRequest, UsuarioListaItem } from '../../../../core/models/usuarios.model';
import { CatalogoItem } from '../../../../core/models/maestros.model';
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
  private readonly maestrosSvc  = inject(MaestrosService);
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
  readonly comerciales      = signal<UsuarioListaItem[]>([]);
  readonly suplenciasComoTitular  = signal<SuplenteListaItem[]>([]);
  readonly suplenciasComoSuplente = signal<SuplenteListaItem[]>([]);
  readonly formSuplenteAbierto = signal(false);
  readonly guardandoSuplente   = signal(false);
  readonly errorSuplente       = signal('');
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

  // Catálogos dinámicos de tabla_maestra (back real).
  // Se cargan en ngOnInit vía MaestrosService.obtenerCatalogo(descripcion).
  readonly sedesOperativas = signal<CatalogoItem[]>([]);
  readonly areasUsuario    = signal<CatalogoItem[]>([]);
  readonly cargosUsuario   = signal<CatalogoItem[]>([]);
  // Área actualmente seleccionada (sync con form para que el computed reaccione)
  readonly areaActual      = signal<string>('');

  // Cargos filtrados por área seleccionada (CARGO_USUARIO.String3 === area actual).
  // Si no hay área elegida, no muestra nada → fuerza al usuario a elegir área primero.
  readonly cargosFiltrados = computed(() => {
    const area = this.areaActual();
    if (!area) return [];
    return this.cargosUsuario().filter(c => c.string3 === area);
  });

  formulario: FormGroup = this.fb.group({
    // Solo letras (acentos + ñ) y espacios, 2-60 chars
    nombre:   ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60),
                    Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60),
                    Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/)]],
    tipoDocumento:    ['DNI', Validators.required],
    // Longitud se ajusta dinámicamente según tipoDocumento (ver actualizarValidadorDocumento)
    numeroDocumento:  ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    // El input solo recibe el username (ej. "jperez"), el dominio @totalweight.pe
    // se agrega al construir el DTO. Validamos solo el formato del username.
    correo:           ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+$/), Validators.maxLength(60)]],
    // Teléfono: solo dígitos, +, espacios, paréntesis, guiones. Máx 20 chars.
    telefono:         [null, [Validators.pattern(/^[0-9+() \-]*$/), Validators.maxLength(20)]],
    // Cargo temporalmente opcional hasta que Bryan cargue los seeds de CARGO_USUARIO.
    // Volver a Validators.required cuando el catálogo esté poblado.
    cargo:            [''],
    area:             ['', Validators.required],
    rolSistema:            ['', Validators.required],
    sedeOperativa:         ['', Validators.required],
    idSupervisorDirecto:   [null],
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

  // Signal sincronizado con formulario.rolSistema para que los computed reaccionen
  // (los valores de Reactive Forms no son signals, un computed sobre .value no se actualiza).
  readonly rolSistemaActual = signal<string>('');

  readonly esRolComercial = computed(() => {
    const rol = this.rolSistemaActual();
    return this.rolOpciones.find(r => r.value === rol)?.esComercial ?? false;
  });

  // Credenciales INACAL (firma de certificados de calibración) solo aplican a Metrología.
  readonly rolRequiereInacal = computed(() => {
    const rol = this.rolSistemaActual();
    return rol === 'jefe_metrologia' || rol === 'metrologo';
  });

  // Numeración dinámica de secciones (depende de qué secciones estén visibles por rol).
  // Secciones 1 y 2 siempre están. 3 (INACAL) solo metrológico. 4 (Seguridad) siempre.
  // 5 (Suplencias) solo comercial en modo editar. Nunca coexisten INACAL + Suplencias.
  readonly numInacal     = computed(() => this.rolRequiereInacal() ? 3 : null);
  readonly numSeguridad  = computed(() => this.rolRequiereInacal() ? 4 : 3);
  readonly numSuplencias = computed(() => {
    if (this.esNuevo() || !this.esRolComercial()) return null;
    // Comercial no es metrológico → INACAL no está → Suplencias es la siguiente de Seguridad
    return this.numSeguridad() + 1;
  });

  readonly rolLabelActual = computed(() => {
    const rol = this.rolSistemaActual();
    return this.rolOpciones.find(r => r.value === rol)?.label ?? 'Sin rol asignado';
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

    // Validador dinámico de número de documento según tipo (DNI 8 dígitos, CE 9, Pasaporte alfanumérico 6-12)
    this.formulario.get('tipoDocumento')?.valueChanges.subscribe(tipo => {
      this.actualizarValidadorDocumento(tipo ?? 'DNI');
    });
    this.actualizarValidadorDocumento(this.formulario.get('tipoDocumento')?.value ?? 'DNI');

    // Sincronizar signals con los controls del form para que los computed reaccionen
    this.formulario.get('rolSistema')?.valueChanges.subscribe(v => {
      this.rolSistemaActual.set(v ?? '');
    });
    this.formulario.get('area')?.valueChanges.subscribe(v => {
      const nuevaArea = v ?? '';
      // Al cambiar de área, resetear el cargo (puede no pertenecer a la nueva área)
      if (nuevaArea !== this.areaActual()) {
        this.formulario.get('cargo')?.setValue('', { emitEvent: false });
      }
      this.areaActual.set(nuevaArea);
    });

    try {
      // Catálogos de tabla_maestra en paralelo. Cada catálogo se carga de forma
      // independiente: si un catálogo falla (ej. CARGO_USUARIO sin seeds aún),
      // los otros igual se cargan y la ficha es usable.
      const [jefes, sedes, areas, cargos] = await Promise.all([
        this.usuariosSvc.obtenerJefesDisponibles(),
        this.maestrosSvc.obtenerCatalogo('SEDE_OPERATIVA_TW').catch(() => []),
        this.maestrosSvc.obtenerCatalogo('AREA_USUARIO').catch(() => []),
        this.maestrosSvc.obtenerCatalogo('CARGO_USUARIO').catch(() => []),
      ]);
      this.sedesOperativas.set(sedes);
      this.areasUsuario.set(areas);
      this.cargosUsuario.set(cargos);

      if (!nuevo) {
        this.idUsuario = Number(idParam);
      }
      // Un usuario no puede ser supervisor de sí mismo (en nuevo idUsuario=0, no filtra a nadie)
      this.jefes.set(jefes.filter(j => j.idUsuario !== this.idUsuario));

      if (!nuevo) {
        const u = await this.usuariosSvc.obtenerUsuarioPorId(this.idUsuario);
        await this.cargarSuplencias();
        await this.cargarComerciales();
        this.rolSistemaActual.set(u.rolSistema ?? '');
        this.areaActual.set(u.area ?? '');
        this.formulario.patchValue({
          nombre:                       u.nombre,
          apellido:                     u.apellido,
          tipoDocumento:                u.tipoDocumento,
          numeroDocumento:              u.numeroDocumento,
          // El input solo muestra el username — quitamos el dominio al cargar
          correo:                       u.correo?.replace(/@totalweight\.pe$/i, '') ?? '',
          telefono:                     u.telefono,
          cargo:                        u.cargo,
          area:                         u.area,
          rolSistema:                   u.rolSistema,
          sedeOperativa:                u.sedeOperativa,
          idSupervisorDirecto:          u.idSupervisorDirecto,
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

  /**
   * Actualiza las reglas de longitud + pattern del campo numeroDocumento
   * según el tipo de documento seleccionado.
   */
  private actualizarValidadorDocumento(tipo: string): void {
    const ctrl = this.formulario.get('numeroDocumento');
    if (!ctrl) return;
    let patron: RegExp;
    switch (tipo) {
      case 'CE':         patron = /^[0-9]{9}$/;        break;  // Carnet de Extranjería: 9 dígitos
      case 'Pasaporte':  patron = /^[a-zA-Z0-9]{6,12}$/; break;  // Pasaporte: alfanumérico 6-12
      case 'DNI':
      default:           patron = /^[0-9]{8}$/;        break;  // DNI: 8 dígitos
    }
    ctrl.setValidators([Validators.required, Validators.pattern(patron)]);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  /** Longitud máxima permitida en el input de documento según tipo (para HTML [maxlength]). */
  get maxLengthDocumento(): number {
    const t = this.formulario.get('tipoDocumento')?.value;
    return t === 'CE' ? 9 : t === 'Pasaporte' ? 12 : 8;
  }

  /** Bloquea caracteres no válidos al escribir (filtro en tiempo real). */
  filtrarSoloLetras(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
    if (input.value !== limpio) input.value = limpio;
  }

  filtrarSoloNumeros(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^0-9]/g, '');
    if (input.value !== limpio) input.value = limpio;
  }

  filtrarDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const t = this.formulario.get('tipoDocumento')?.value;
    // DNI/CE solo números, Pasaporte alfanumérico
    const limpio = t === 'Pasaporte'
      ? input.value.replace(/[^a-zA-Z0-9]/g, '')
      : input.value.replace(/[^0-9]/g, '');
    if (input.value !== limpio) input.value = limpio;
  }

  filtrarTelefono(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^0-9+() \-]/g, '');
    if (input.value !== limpio) input.value = limpio;
  }

  filtrarUsername(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^a-zA-Z0-9._-]/g, '');
    if (input.value !== limpio) input.value = limpio;
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
        // Concatenamos el dominio corporativo al username ingresado (el input solo recibe username).
        correo:                       `${v.correo?.trim().toLowerCase()}@totalweight.pe`,
        telefono:                     v.telefono || null,
        cargo:                        v.cargo?.trim() || null,
        area:                         v.area || null,
        rolSistema:                   v.rolSistema,
        sedeOperativa:                v.sedeOperativa,
        idSupervisorDirecto:          v.idSupervisorDirecto || null,
        habilitadoFirmaInacal:        !!v.habilitadoFirmaInacal,
        numeroRegistroInacal:         v.habilitadoFirmaInacal ? (v.numeroRegistroInacal || null) : null,
        fechaExpiracionCertificacion: v.habilitadoFirmaInacal ? (v.fechaExpiracionCertificacion || null) : null,
        requiereInduccionSctr:        !!v.requiereInduccionSctr,
        // En modo editar: vacío = no cambiar la contraseña (el back lo interpreta así).
        contrasenaTemporal:           v.contrasenaTemporal?.trim() || '',
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
          { nombre: suplente.nombre, apellido: suplente.apellido, cargo: 'Comercial' },
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
