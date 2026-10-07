import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { AreasClienteService } from '../../../../core/services/areas-cliente.service';
import { RequisitosSsomaService, RequisitoSsoma } from '../../../../core/services/requisitos-ssoma.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AreaCliente, CatalogoItem, CategoriaCliente, ContactoListaItem, GuardarClienteRequest, GuardarContactoRequest, GuardarSedeRequest, SedeListaItem } from '../../../../core/models/maestros.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ButtonComponent }     from '../../../../shared/ui/button/button.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ModalSedeComponent } from '../modal-sede/modal-sede.component';
import { ModalContactoComponent } from '../modal-contacto/modal-contacto.component';
import { ModalMantenimientoAreasClienteComponent } from '../modal-mantenimiento-areas-cliente/modal-mantenimiento-areas-cliente.component';
import { ESTADO } from '../../../../core/constants/estados';
import { breadcrumbMaestros } from '../../../../core/constants/breadcrumbs';

// SSOMA_ITEMS hardcoded eliminado (obs #4281 reunión 06-oct). Los requisitos
// SSOMA se consumen desde el catálogo global REQUISITO_SSOMA via
// RequisitosSsomaService.listar() y las asignaciones por cliente se
// sincronizan con sincronizarDelCliente() tras guardar el cliente.

interface BorradorCliente {
  form: Record<string, unknown>;
  sedesTemp: SedeListaItem[];
  contactosTemp: ContactoListaItem[];
  areasCliente: AreaCliente[];
}

function validarRuc(control: AbstractControl): ValidationErrors | null {
  const ruc = (control.value as string) ?? '';
  if (ruc.length !== 11 || !/^\d{11}$/.test(ruc)) return null;
  const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = factores.reduce((acc, f, i) => acc + f * parseInt(ruc[i]), 0);
  const residuo = suma % 11;
  const digito = residuo === 0 ? 1 : residuo === 1 ? 0 : 11 - residuo;
  return digito === parseInt(ruc[10]) ? null : { rucInvalido: true };
}

@Component({
  selector: 'app-ficha-cliente',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent, HeroHeaderComponent, SeccionComponent, FormFooterComponent, EstadoVacioComponent, ButtonComponent, ModalBorradorComponent, ModalSedeComponent, ModalContactoComponent, ModalMantenimientoAreasClienteComponent],
  templateUrl: './ficha-cliente.component.html',
  styleUrl: './ficha-cliente.component.scss',
})
export class FichaClienteComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly areasSvc    = inject(AreasClienteService);
  private readonly ssomaSvc    = inject(RequisitosSsomaService);
  private readonly borradorSvc = inject(BorradorService);
  private readonly toastSvc    = inject(ToastService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);
  private readonly destroyRef  = inject(DestroyRef);

  readonly cargando          = signal(true);
  readonly guardando         = signal(false);
  readonly guardandoBorrador = signal(false);
  readonly error             = signal('');
  readonly esNuevo           = signal(false);
  readonly estadoCliente     = signal('Borrador');
  // Código de ficha visible en ambos modos (pedido cliente T1 2026-10-06).
  // Nuevo: "CLI-{año}-NUEVO". Editar: codigo real del cliente, con fallback a ID.
  readonly codigoFicha       = signal('');

  // Borrador local (incluye form + sedesTemp + contactosTemp)
  readonly borradorDisponible = signal<BorradorInfo<BorradorCliente> | null>(null);
  private borradorKey = '';
  private autoguardadoActivo = false;
  private huboCambiosAutoguardados = false;
  private salidaControlada = false;

  readonly sedes              = signal<SedeListaItem[]>([]);
  readonly modalSedeOpen      = signal(false);
  readonly sedeEditar         = signal<SedeListaItem | null>(null);
  readonly sedesTemp          = signal<SedeListaItem[]>([]);

  readonly contactos          = signal<ContactoListaItem[]>([]);
  readonly modalContactoOpen  = signal(false);
  readonly contactoEditar     = signal<ContactoListaItem | null>(null);
  readonly contactosTemp      = signal<ContactoListaItem[]>([]);

  private _tempId = 0;

  // ssomaItems eliminado — ahora los requisitos vienen del catálogo (ver ssomaDisponibles).
  readonly tiposDocumento   = signal<CatalogoItem[]>([]);
  readonly tiposCliente     = signal<CatalogoItem[]>([]);
  readonly condicionesPago  = signal<CatalogoItem[]>([]);
  readonly categoriasCliente = signal<CategoriaCliente[]>([]);

  // Áreas de operación del cliente (ej. "Zona de carnes", "Patio norte").
  // Son por cliente (NO un catálogo global). En modo nuevo se mantienen en
  // memoria como items temporales (idArea < 0) y se cascadan al back después
  // de crear el cliente, igual que sedes y contactos.
  readonly areasCliente        = signal<AreaCliente[]>([]);
  readonly modalAreasOpen      = signal(false);

  idCliente = 0;

  formulario: FormGroup = this.fb.group({
    tipoDocumento:          ['RUC'],
    ruc:                    ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11), validarRuc]],
    tipoCliente:            ['', Validators.required],
    razonSocial:            ['', Validators.required],
    nombreComercial:        [''],
    condicionContribuyente: ['Habido'],
    condicionPago:          [''],
    lineaCreditoUsd:        [null],
    telefonoCentral:        [''],
    domicilioFiscal:        [''],
    esVip:                  [false],
    reglaVip:               [''],
    // Descuento Convenio VIP removido del UI (obs #4281 reunión 06-oct).
    // Al guardar enviamos null hasta que Bryan deprecie la columna del DTO.
    ssomaNotas:             [''],
    idCategoria:            [''],
  });

  // Catálogo global de requisitos SSOMA (consumido de REQUISITO_SSOMA).
  readonly ssomaDisponibles = signal<RequisitoSsoma[]>([]);
  // Códigos de requisitos marcados como aplicables al cliente actual.
  // Se hidratan desde SP_ObtenerRequisitosDelCliente al cargar la ficha y se
  // sincronizan via PUT /clientes/{id}/requisitos-ssoma tras guardar.
  readonly ssomaAplicables = signal<string[]>([]);

  toggleRequisitoSsoma(codigo: string, aplica: boolean): void {
    if (aplica) {
      if (!this.ssomaAplicables().includes(codigo)) {
        this.ssomaAplicables.update(l => [...l, codigo]);
      }
    } else {
      this.ssomaAplicables.update(l => l.filter(c => c !== codigo));
    }
    this.marcarAutoguardadoManual();
  }

  esRequisitoAplicable(codigo: string): boolean {
    return this.ssomaAplicables().includes(codigo);
  }

  async ngOnInit(): Promise<void> {
    const idParam  = this.route.snapshot.paramMap.get('id');
    const esNuevo  = !idParam || idParam === 'nuevo';
    this.esNuevo.set(esNuevo);
    this.borradorKey = `clientes:${esNuevo ? 'nuevo' : idParam}`;
    this.codigoFicha.set(esNuevo ? `CLI-${new Date().getFullYear()}-NUEVO` : '');

    const catalogsTask = Promise.all([
      this.maestrosSvc.obtenerCatalogo('TIPO_DOC_CLIENTE'),
      this.maestrosSvc.obtenerCatalogo('TIPO_CLIENTE'),
      this.maestrosSvc.obtenerCatalogo('CONDICION_PAGO'),
      this.maestrosSvc.obtenerCategorias(),
    ]);

    // Catálogo global de requisitos SSOMA (siempre se carga, independiente del modo).
    this.ssomaSvc.listar()
      .then(l => this.ssomaDisponibles.set(l))
      .catch(() => this.ssomaDisponibles.set([]));

    try {
      if (esNuevo) {
        const [tiposDoc, tipos, condiciones, categorias] = await catalogsTask;
        this.tiposDocumento.set(tiposDoc);
        this.tiposCliente.set(tipos);
        this.condicionesPago.set(condiciones);
        this.categoriasCliente.set(categorias);
      } else {
        this.idCliente = Number(idParam);
        const [[tiposDoc, tipos, condiciones, categorias], detalle, areasBack, requisitosDelCliente] = await Promise.all([
          catalogsTask,
          this.maestrosSvc.obtenerClientePorId(this.idCliente),
          this.areasSvc.listar(this.idCliente, false).catch(() => [] as AreaCliente[]),
          this.ssomaSvc.obtenerDelCliente(this.idCliente).catch(() => []),
        ]);
        this.tiposDocumento.set(tiposDoc);
        this.tiposCliente.set(tipos);
        this.condicionesPago.set(condiciones);
        this.categoriasCliente.set(categorias);
        this.areasCliente.set(areasBack);
        this.ssomaAplicables.set(requisitosDelCliente.map(r => r.codigo));

        this.estadoCliente.set(detalle.estado);
        // Código de la ficha (ej. CLI-2026-0003). Fallback: `CLI-ID-${idCliente}`
        // mientras el back no emita el código formateado.
        this.codigoFicha.set(detalle.ruc ? `RUC ${detalle.ruc}` : `CLI-ID-${this.idCliente}`);

        const [listaSedes, listaContactos] = await Promise.all([
          this.maestrosSvc.obtenerSedesPorCliente(this.idCliente),
          this.maestrosSvc.obtenerContactosPorCliente(this.idCliente),
        ]);
        this.sedes.set(listaSedes);
        this.contactos.set(listaContactos);

        this.formulario.patchValue({
          tipoDocumento:          detalle.tipoDocumento,
          ruc:                    detalle.ruc,
          tipoCliente:            detalle.tipoCliente,
          razonSocial:            detalle.razonSocial,
          nombreComercial:        detalle.nombreComercial ?? '',
          condicionContribuyente: detalle.condicionContribuyente,
          condicionPago:          detalle.condicionPago ?? '',
          lineaCreditoUsd:        detalle.lineaCreditoUsd,
          telefonoCentral:        detalle.telefonoCentral ?? '',
          domicilioFiscal:        detalle.domicilioFiscal ?? '',
          esVip:                  detalle.esVip,
          reglaVip:               detalle.reglaVip ?? '',
          // descuentoVipPct, ssomaPolizaSctr/Camioneta/Induccion/Examen removidos
          // del form (obs #4281) — ya no se patchean. SSOMA se maneja por catálogo.
          ssomaNotas:             detalle.ssomaNotas ?? '',
          idCategoria:            detalle.idCategoria ?? '',
        });
      }

      // Detectar borrador local y activar autoguardado
      const draft = this.borradorSvc.obtener<BorradorCliente>(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Borrador local ─────────────────────────────────────────────────
  private snapshotBorrador(): BorradorCliente {
    return {
      form:          this.formulario.getRawValue(),
      sedesTemp:     this.sedesTemp(),
      contactosTemp: this.contactosTemp(),
      areasCliente:  this.areasCliente(),
    };
  }

  private activarAutoguardado(): void {
    this.autoguardadoActivo = true;
    this.formulario.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.autoguardadoActivo) return;
        this.borradorSvc.guardar(this.borradorKey, this.snapshotBorrador());
        this.huboCambiosAutoguardados = true;
      });
  }

  private marcarAutoguardadoManual(): void {
    if (!this.autoguardadoActivo) return;
    this.borradorSvc.guardar(this.borradorKey, this.snapshotBorrador());
    this.huboCambiosAutoguardados = true;
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
    this.formulario.patchValue(draft.data.form, { emitEvent: false });
    this.sedesTemp.set(draft.data.sedesTemp ?? []);
    this.contactosTemp.set(draft.data.contactosTemp ?? []);
    this.areasCliente.set(draft.data.areasCliente ?? []);
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
    this.borradorSvc.guardar(this.borradorKey, this.snapshotBorrador());
    this.toastSvc.exito('Borrador guardado. Puedes continuar más tarde.');
    this.guardandoBorrador.set(false);
    this.router.navigate(['/maestros/clientes']);
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    this.guardando.set(true);
    this.error.set('');
    try {
      const v = this.formulario.value;
      const dto: GuardarClienteRequest = {
        idCliente:              this.idCliente,
        tipoDocumento:          v.tipoDocumento,
        ruc:                    v.ruc,
        tipoCliente:            v.tipoCliente,
        razonSocial:            v.razonSocial,
        nombreComercial:        v.nombreComercial || null,
        // Condición Fiscal se removió del UI (pedido cliente 2026-10-05). El back
        // todavía requiere el campo: mandamos 'Activo' por default hasta que
        // Bryan lo deprecie en el DTO.
        condicionFiscal:        'Activo',
        condicionContribuyente: v.condicionContribuyente,
        condicionPago:          v.condicionPago || null,
        lineaCreditoUsd:        v.lineaCreditoUsd,
        telefonoCentral:        v.telefonoCentral || null,
        domicilioFiscal:        v.domicilioFiscal || null,
        esVip:                  v.esVip,
        reglaVip:               v.reglaVip || null,
        // Descuento VIP removido del UI (obs #4281) — null hasta deprecación back.
        descuentoVipPct:        null,
        // Patrón de Masas removido antes — null hasta deprecación.
        patronMasasAsignado:    null,
        // Flags SSOMA viejos: la lista real vive ahora en el catálogo
        // REQUISITO_SSOMA + requisito_ssoma_cliente. Enviamos false por compat.
        ssomaPolizaSctr:        false,
        ssomaCamioneta4x4:      false,
        ssomaInduccionSsoma:    false,
        ssomaExamenMedico:      false,
        ssomaNotas:             v.ssomaNotas || null,
        idCategoria:            v.idCategoria ? Number(v.idCategoria) : null,
      };

      const id = await this.maestrosSvc.guardarCliente(dto);

      // Sincronizar los requisitos SSOMA aplicables al cliente (tabla
      // requisito_ssoma_cliente). Siempre se manda la lista completa — vacío
      // significa "quitar todos".
      try {
        await this.ssomaSvc.sincronizarDelCliente(id, this.ssomaAplicables());
      } catch {
        // No bloquea el guardado del cliente — se puede reintentar luego.
      }

      // Guardar áreas temporales en cascada (items con idArea < 0 son locales
      // creados en modo "Nuevo cliente"). Se persisten en orden secuencial para
      // que el back valide duplicados de forma determinística.
      if (this.areasCliente().length > 0) {
        for (const a of this.areasCliente()) {
          if (a.idArea < 0) {
            try {
              await this.areasSvc.guardar(id, { idArea: 0, nombre: a.nombre });
            } catch {
              // Si una área falla, seguimos con las demás — se reflejará en el
              // próximo refresh de la ficha.
            }
          }
        }
      }

      // Guardar sedes temporales en cascada
      if (this.sedesTemp().length > 0) {
        await Promise.all(
          this.sedesTemp().map(s => this.maestrosSvc.guardarSede({
            idSede:          0,
            idCliente:       id,
            nombre:          s.nombre,
            tipoInstalacion: s.tipoInstalacion,
            region:          s.region,
            provincia:       s.provincia,
            distrito:        s.distrito,
            urbanizacion:    s.urbanizacion,
            direccionExacta: s.direccionExacta ?? '',
          }))
        );
      }

      // Guardar contactos temporales en cascada, resolviendo idSede temporal
      if (this.contactosTemp().length > 0) {
        let sedesReales: SedeListaItem[] = [];
        if (this.sedesTemp().length > 0) {
          sedesReales = await this.maestrosSvc.obtenerSedesPorCliente(id);
        }
        const sedeIdMap = new Map<number, number | null>();
        this.sedesTemp().forEach(ts => {
          const real = sedesReales.find(r => r.nombre === ts.nombre);
          sedeIdMap.set(ts.idSede, real?.idSede ?? null);
        });

        await Promise.all(
          this.contactosTemp().map(c => {
            // Resuelve ids temporales de sedes (< 0) a ids reales recién creados.
            const sedesReales = (c.sedes ?? []).map(s => ({
              idSede:          s.idSede < 0 ? (sedeIdMap.get(s.idSede) ?? null) : s.idSede,
              esPrincipalSede: s.esPrincipalSede,
            })).filter((s): s is { idSede: number; esPrincipalSede: boolean } => s.idSede != null);
            const resolvedSedeLegacy = sedesReales[0]?.idSede
              ?? (c.idSede != null && c.idSede < 0 ? (sedeIdMap.get(c.idSede) ?? null) : c.idSede);
            const esPpalEmpresa = c.esPrincipalEmpresa ?? c.esContactoPrincipal;
            const req: GuardarContactoRequest = {
              idContacto:                    0,
              idCliente:                     id,
              idSede:                        resolvedSedeLegacy,
              nombres:                       c.nombres,
              documentoIdentidad:            c.documentoIdentidad,
              cargo:                         c.cargo,
              area:                          c.area,
              correo:                        c.correo,
              telefonoMovil:                 c.telefonoMovil,
              telefonoAnexo:                 c.telefonoAnexo,
              esContactoPrincipal:           esPpalEmpresa,
              esPrincipalEmpresa:            esPpalEmpresa,
              sedes:                         sedesReales,
              autorizadoAprobarCotizaciones: c.autorizadoAprobarCotizaciones,
              recibeAlertasCalibracion:      c.recibeAlertasCalibracion,
              autorizadoRecepcionTecnica:    c.autorizadoRecepcionTecnica,
            };
            return this.maestrosSvc.guardarContacto(req);
          })
        );
      }

      this.borradorSvc.borrar(this.borradorKey);
      this.salidaControlada = true;
      this.router.navigate(['/maestros/clientes']);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar el cliente.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/clientes']);
  }

  // ─── Áreas de operación del cliente (CRUD por cliente) ──────────────────
  abrirModalAreas(): void {
    this.modalAreasOpen.set(true);
  }

  onAreasActualizadas(nuevas: AreaCliente[]): void {
    this.areasCliente.set(nuevas);
    this.modalAreasOpen.set(false);
    this.marcarAutoguardadoManual();
  }

  get areasActivas(): AreaCliente[] {
    return this.areasCliente().filter(a => a.estado === 'Activo');
  }

  get sedesDisplay(): SedeListaItem[] {
    return this.esNuevo() ? this.sedesTemp() : this.sedes();
  }

  get contactosDisplay(): ContactoListaItem[] {
    return this.esNuevo() ? this.contactosTemp() : this.contactos();
  }

  get sedesParaModalContacto(): SedeListaItem[] {
    return this.esNuevo() ? this.sedesTemp() : this.sedes();
  }

  onSedeGuardadaLocal(dto: GuardarSedeRequest): void {
    const item: SedeListaItem = {
      idSede:          --this._tempId,
      idCliente:       0,
      nombre:          dto.nombre,
      tipoInstalacion: dto.tipoInstalacion,
      region:          dto.region,
      provincia:       dto.provincia,
      distrito:        dto.distrito,
      urbanizacion:    dto.urbanizacion,
      direccionExacta: dto.direccionExacta,
      estado:          ESTADO.ACTIVO,
    };
    this.sedesTemp.update(list => [...list, item]);
    this.marcarAutoguardadoManual();
    this.cerrarModal();
  }

  onContactoGuardadoLocal(dto: GuardarContactoRequest): void {
    const item: ContactoListaItem = {
      idContacto:                    --this._tempId,
      idCliente:                     0,
      idSede:                        dto.idSede,
      nombres:                       dto.nombres,
      documentoIdentidad:            dto.documentoIdentidad,
      cargo:                         dto.cargo,
      area:                          dto.area,
      correo:                        dto.correo,
      telefonoMovil:                 dto.telefonoMovil,
      telefonoAnexo:                 dto.telefonoAnexo,
      esContactoPrincipal:           dto.esContactoPrincipal,
      sedes:                         dto.sedes ?? [],
      esPrincipalEmpresa:            dto.esPrincipalEmpresa ?? dto.esContactoPrincipal,
      autorizadoAprobarCotizaciones: dto.autorizadoAprobarCotizaciones,
      recibeAlertasCalibracion:      dto.recibeAlertasCalibracion,
      autorizadoRecepcionTecnica:    dto.autorizadoRecepcionTecnica,
      estado:                        ESTADO.ACTIVO,
    };
    this.contactosTemp.update(list => [...list, item]);
    this.marcarAutoguardadoManual();
    this.cerrarModalContacto();
  }

  eliminarSedeTemp(idSede: number): void {
    this.sedesTemp.update(list => list.filter(s => s.idSede !== idSede));
    this.marcarAutoguardadoManual();
  }

  eliminarContactoTemp(idContacto: number): void {
    this.contactosTemp.update(list => list.filter(c => c.idContacto !== idContacto));
    this.marcarAutoguardadoManual();
  }

  abrirModalNuevaSede(): void {
    this.sedeEditar.set(null);
    this.modalSedeOpen.set(true);
  }

  abrirModalEditarSede(sede: SedeListaItem): void {
    this.sedeEditar.set(sede);
    this.modalSedeOpen.set(true);
  }

  cerrarModal(): void {
    this.modalSedeOpen.set(false);
    this.sedeEditar.set(null);
  }

  async onSedeGuardada(): Promise<void> {
    this.cerrarModal();
    if (this.idCliente) {
      const lista = await this.maestrosSvc.obtenerSedesPorCliente(this.idCliente);
      this.sedes.set(lista);
    }
  }

  async toggleEstadoSede(sede: SedeListaItem): Promise<void> {
    const nuevoEstado = sede.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.maestrosSvc.cambiarEstadoSede({ idSede: sede.idSede, estado: nuevoEstado });
      const lista = await this.maestrosSvc.obtenerSedesPorCliente(this.idCliente);
      this.sedes.set(lista);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado de sede.');
    }
  }

  abrirModalNuevoContacto(): void {
    this.contactoEditar.set(null);
    this.modalContactoOpen.set(true);
  }

  abrirModalEditarContacto(contacto: ContactoListaItem): void {
    this.contactoEditar.set(contacto);
    this.modalContactoOpen.set(true);
  }

  cerrarModalContacto(): void {
    this.modalContactoOpen.set(false);
    this.contactoEditar.set(null);
  }

  async onContactoGuardado(): Promise<void> {
    this.cerrarModalContacto();
    if (this.idCliente) {
      const lista = await this.maestrosSvc.obtenerContactosPorCliente(this.idCliente);
      this.contactos.set(lista);
    }
  }

  async toggleEstadoContacto(contacto: ContactoListaItem): Promise<void> {
    const nuevoEstado = contacto.estado === ESTADO.ACTIVO ? ESTADO.INACTIVO : ESTADO.ACTIVO;
    try {
      await this.maestrosSvc.cambiarEstadoContacto({ idContacto: contacto.idContacto, estado: nuevoEstado });
      const lista = await this.maestrosSvc.obtenerContactosPorCliente(this.idCliente);
      this.contactos.set(lista);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado de contacto.');
    }
  }

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.substring(0, 2).toUpperCase();
  }

  get esVip(): boolean {
    return !!this.formulario.get('esVip')?.value;
  }

  get breadcrumb(): BreadcrumbItem[] {
    return breadcrumbMaestros(
      { label: 'Clientes', ruta: '/maestros/clientes' },
      this.esNuevo() ? 'Nuevo Cliente' : 'Editar Cliente',
    );
  }
}
