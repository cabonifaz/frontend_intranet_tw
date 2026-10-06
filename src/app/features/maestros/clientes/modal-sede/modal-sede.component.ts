import { Component, DestroyRef, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { UbigeoService, UbigeoItem } from '../../../../core/services/ubigeo.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CatalogoItem, GuardarSedeRequest, SedeListaItem } from '../../../../core/models/maestros.model';
import { ModalComponent }  from '../../../../shared/ui/modal/modal.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CampoComponent }  from '../../../../shared/ui/campo/campo.component';

@Component({
  selector: 'app-modal-sede',
  imports: [ReactiveFormsModule, ModalComponent, ModalBorradorComponent, ButtonComponent, CampoComponent],
  templateUrl: './modal-sede.component.html',
  styleUrl: './modal-sede.component.scss',
})
export class ModalSedeComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly ubigeoSvc   = inject(UbigeoService);
  private readonly borradorSvc = inject(BorradorService);
  private readonly toastSvc    = inject(ToastService);
  private readonly destroyRef  = inject(DestroyRef);

  readonly idCliente  = input.required<number>();
  readonly sedeEditar = input<SedeListaItem | null>(null);

  readonly guardado       = output<void>();
  readonly guardadoLocal  = output<GuardarSedeRequest>();
  readonly cancelado      = output<void>();

  readonly guardando       = signal(false);
  readonly error           = signal('');
  readonly tiposInstalacion = signal<CatalogoItem[]>([]);

  // Ubigeo INEI (cascada): depende de la selección del padre.
  readonly departamentos = signal<UbigeoItem[]>([]);
  readonly provincias    = signal<UbigeoItem[]>([]);
  readonly distritos     = signal<UbigeoItem[]>([]);
  readonly cargandoProvincias = signal(false);
  readonly cargandoDistritos  = signal(false);

  // Borrador local (solo activo cuando idCliente > 0)
  readonly borradorDisponible = signal<BorradorInfo<unknown> | null>(null);
  private borradorKey = '';
  private borradorHabilitado = false;
  private autoguardadoActivo = false;
  private huboCambiosAutoguardados = false;
  private salidaControlada = false;

  formulario: FormGroup = this.fb.group({
    nombre:          ['', Validators.required],
    tipoInstalacion: [''],
    region:          ['', Validators.required],
    provincia:       ['', Validators.required],
    distrito:        ['', Validators.required],
    urbanizacion:    [''],
    direccionExacta: ['', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    // Tipos de instalación sigue siendo catálogo tabla_maestra.
    // Departamentos los trae del ubigeo INEI (reemplaza REGION_PERU que se usaba antes).
    const [tipos, deps] = await Promise.all([
      this.maestrosSvc.obtenerCatalogo('TIPO_INSTALACION'),
      this.ubigeoSvc.obtenerDepartamentos(),
    ]);
    this.tiposInstalacion.set(tipos);
    this.departamentos.set(deps);

    // Cascada reactiva: al cambiar departamento, cargar sus provincias y resetear
    // provincia/distrito. Idem para provincia → distritos.
    this.formulario.get('region')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async dep => {
        this.provincias.set([]);
        this.distritos.set([]);
        this.formulario.patchValue({ provincia: '', distrito: '' }, { emitEvent: false });
        if (!dep) return;
        this.cargandoProvincias.set(true);
        try {
          this.provincias.set(await this.ubigeoSvc.obtenerProvincias(dep));
        } finally {
          this.cargandoProvincias.set(false);
        }
      });

    this.formulario.get('provincia')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async prov => {
        this.distritos.set([]);
        this.formulario.patchValue({ distrito: '' }, { emitEvent: false });
        const dep = this.formulario.get('region')?.value;
        if (!dep || !prov) return;
        this.cargandoDistritos.set(true);
        try {
          this.distritos.set(await this.ubigeoSvc.obtenerDistritos(dep, prov));
        } finally {
          this.cargandoDistritos.set(false);
        }
      });

    const sede = this.sedeEditar();
    if (sede) {
      // En modo editar, prehidratar las listas padre antes del patchValue para
      // que los <option> ya existan al asignar el valor. Si el nombre guardado
      // no matchea exactamente un departamento del ubigeo (ej. "lima" vs "Lima"),
      // intentamos matchear case-insensitively y guardamos el nombre canónico.
      const depCanonico = this.matchearCanonico(deps, sede.region);
      let provsSede: UbigeoItem[] = [];
      let distsSede: UbigeoItem[] = [];
      if (depCanonico) {
        provsSede = await this.ubigeoSvc.obtenerProvincias(depCanonico);
        this.provincias.set(provsSede);
        const provCanonico = this.matchearCanonico(provsSede, sede.provincia);
        if (provCanonico) {
          distsSede = await this.ubigeoSvc.obtenerDistritos(depCanonico, provCanonico);
          this.distritos.set(distsSede);
        }
      }
      this.formulario.patchValue({
        nombre:          sede.nombre,
        tipoInstalacion: sede.tipoInstalacion ?? '',
        region:          depCanonico ?? sede.region ?? '',
        provincia:       this.matchearCanonico(provsSede, sede.provincia) ?? sede.provincia ?? '',
        distrito:        this.matchearCanonico(distsSede, sede.distrito)   ?? sede.distrito   ?? '',
        urbanizacion:    sede.urbanizacion    ?? '',
        direccionExacta: sede.direccionExacta ?? '',
      }, { emitEvent: false });
    }

    // Habilitar borrador solo cuando hay cliente persistido (idCliente > 0)
    if (this.idCliente() > 0) {
      this.borradorHabilitado = true;
      this.borradorKey = `sede:${this.idCliente()}:${sede?.idSede ?? 'nueva'}`;
      const draft = this.borradorSvc.obtener(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    }
  }

  /** Devuelve el `nombre` canónico de la lista que matchea (case-insensitive) al valor dado. */
  private matchearCanonico(items: UbigeoItem[], valor: string | null | undefined): string | null {
    if (!valor) return null;
    const v = valor.trim().toLowerCase();
    return items.find(i => i.nombre.trim().toLowerCase() === v)?.nombre ?? null;
  }

  // ─── Borrador local ─────────────────────────────────────────────────
  private activarAutoguardado(): void {
    this.autoguardadoActivo = true;
    this.formulario.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.autoguardadoActivo || !this.borradorHabilitado) return;
        this.borradorSvc.guardar(this.borradorKey, this.formulario.getRawValue());
        this.huboCambiosAutoguardados = true;
      });
  }

  ngOnDestroy(): void {
    if (this.borradorHabilitado && !this.salidaControlada && this.huboCambiosAutoguardados && this.borradorSvc.tiene(this.borradorKey)) {
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

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    const v = this.formulario.value;
    const dto: GuardarSedeRequest = {
      idSede:          this.sedeEditar()?.idSede ?? 0,
      idCliente:       this.idCliente(),
      nombre:          v.nombre,
      tipoInstalacion: v.tipoInstalacion || null,
      region:          v.region          || null,
      provincia:       v.provincia       || null,
      distrito:        v.distrito        || null,
      urbanizacion:    v.urbanizacion    || null,
      direccionExacta: v.direccionExacta,
    };

    if (this.idCliente() === 0) {
      this.guardadoLocal.emit(dto);
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    try {
      await this.maestrosSvc.guardarSede(dto);
      if (this.borradorHabilitado) {
        this.borradorSvc.borrar(this.borradorKey);
      }
      this.salidaControlada = true;
      this.guardado.emit();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar la sede.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.cancelado.emit();
  }

  get esEdicion(): boolean {
    return !!this.sedeEditar()?.idSede;
  }
}
