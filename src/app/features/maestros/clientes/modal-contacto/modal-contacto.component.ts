import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ContactoListaItem, ContactoSede, GuardarContactoRequest, SedeListaItem } from '../../../../core/models/maestros.model';
import { ModalComponent }  from '../../../../shared/ui/modal/modal.component';
import { ModalBorradorComponent } from '../../../../shared/ui/modal-borrador/modal-borrador.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CampoComponent }  from '../../../../shared/ui/campo/campo.component';

@Component({
  selector: 'app-modal-contacto',
  imports: [ReactiveFormsModule, ModalComponent, ModalBorradorComponent, ButtonComponent, CampoComponent],
  templateUrl: './modal-contacto.component.html',
  styleUrl: './modal-contacto.component.scss',
})
export class ModalContactoComponent implements OnInit, OnDestroy {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly borradorSvc = inject(BorradorService);
  private readonly toastSvc    = inject(ToastService);
  private readonly destroyRef  = inject(DestroyRef);

  readonly idCliente       = input.required<number>();
  readonly sedesCliente    = input<SedeListaItem[]>([]);
  readonly contactoEditar  = input<ContactoListaItem | null>(null);

  readonly guardado      = output<void>();
  readonly guardadoLocal = output<GuardarContactoRequest>();
  readonly cancelado     = output<void>();

  readonly guardando = signal(false);
  readonly error     = signal('');

  // Borrador local (solo activo cuando idCliente > 0)
  readonly borradorDisponible = signal<BorradorInfo<unknown> | null>(null);
  private borradorKey = '';
  private borradorHabilitado = false;
  private autoguardadoActivo = false;
  private huboCambiosAutoguardados = false;
  private salidaControlada = false;

  // Sedes vinculadas al contacto (N:M). Mínimo 1 obligatoria. Cada entrada
  // guarda si el contacto es principal de esa sede específica.
  readonly sedesAsignadas    = signal<ContactoSede[]>([]);
  readonly sedeSeleccionada  = signal<string>('');     // id como string para el <select>

  readonly sedesDisponibles = computed(() => {
    const asignadas = new Set(this.sedesAsignadas().map(s => s.idSede));
    return this.sedesCliente().filter(s => !asignadas.has(s.idSede));
  });

  readonly faltaSede = computed(() => this.sedesAsignadas().length === 0);

  formulario: FormGroup = this.fb.group({
    nombres:                        ['', Validators.required],
    documentoIdentidad:             [''],
    cargo:                          [''],
    area:                           [''],
    correo:                         ['', [Validators.email]],
    telefonoMovil:                  [''],
    telefonoAnexo:                  [''],
    esPrincipalEmpresa:             [false],
    autorizadoAprobarCotizaciones:  [false],
    recibeAlertasCalibracion:       [false],
    autorizadoRecepcionTecnica:     [false],
  });

  get tituloModal(): string {
    return this.contactoEditar() ? 'Editar Contacto' : 'Nuevo Contacto Clave & Aprobador';
  }

  cancelar(): void {
    this.cancelado.emit();
  }

  ngOnInit(): void {
    const c = this.contactoEditar();
    if (c) {
      this.formulario.patchValue({
        nombres:                       c.nombres,
        documentoIdentidad:            c.documentoIdentidad ?? '',
        cargo:                         c.cargo              ?? '',
        area:                          c.area               ?? '',
        correo:                        c.correo             ?? '',
        telefonoMovil:                 c.telefonoMovil      ?? '',
        telefonoAnexo:                 c.telefonoAnexo      ?? '',
        // Prioriza el nuevo flag; cae al legacy mientras Bryan actualiza back.
        esPrincipalEmpresa:            c.esPrincipalEmpresa ?? c.esContactoPrincipal,
        autorizadoAprobarCotizaciones: c.autorizadoAprobarCotizaciones,
        recibeAlertasCalibracion:      c.recibeAlertasCalibracion,
        autorizadoRecepcionTecnica:    c.autorizadoRecepcionTecnica,
      });
      // Hidratar sedes: si el back ya devuelve el array nuevo, úsalo;
      // si no, sintetiza una sola fila con el idSede legacy.
      if (c.sedes && c.sedes.length > 0) {
        this.sedesAsignadas.set(this.enriquecerConNombres(c.sedes));
      } else if (c.idSede != null) {
        this.sedesAsignadas.set(this.enriquecerConNombres([{
          idSede: c.idSede,
          esPrincipalSede: c.esContactoPrincipal,
        }]));
      }
    }

    // Habilitar borrador solo cuando hay cliente persistido (idCliente > 0)
    if (this.idCliente() > 0) {
      this.borradorHabilitado = true;
      this.borradorKey = `contacto:${this.idCliente()}:${c?.idContacto ?? 'nuevo'}`;
      const draft = this.borradorSvc.obtener(this.borradorKey);
      if (draft) {
        this.borradorDisponible.set(draft);
      }
      this.activarAutoguardado();
    }
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

  // ─── Gestión de sedes vinculadas ──────────────────────────────────────
  private enriquecerConNombres(sedes: ContactoSede[]): ContactoSede[] {
    const catalogo = this.sedesCliente();
    return sedes.map(s => ({
      ...s,
      nombreSede: catalogo.find(x => x.idSede === s.idSede)?.nombre ?? s.nombreSede ?? `Sede ${s.idSede}`,
    }));
  }

  agregarSede(): void {
    const raw = this.sedeSeleccionada().trim();
    if (!raw) return;
    const idSede = Number(raw);
    if (!idSede || this.sedesAsignadas().some(s => s.idSede === idSede)) {
      this.sedeSeleccionada.set('');
      return;
    }
    const nombre = this.sedesCliente().find(s => s.idSede === idSede)?.nombre;
    this.sedesAsignadas.update(list => [...list, { idSede, nombreSede: nombre, esPrincipalSede: false }]);
    this.sedeSeleccionada.set('');
  }

  quitarSede(idSede: number): void {
    this.sedesAsignadas.update(list => list.filter(s => s.idSede !== idSede));
  }

  togglePrincipalSede(idSede: number): void {
    this.sedesAsignadas.update(list => list.map(s =>
      s.idSede === idSede ? { ...s, esPrincipalSede: !s.esPrincipalSede } : s
    ));
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    if (this.faltaSede()) {
      this.error.set('Asigna al menos una sede al contacto.');
      return;
    }

    const v = this.formulario.value;
    const sedes = this.sedesAsignadas();
    const primeraSede = sedes[0];
    const dto: GuardarContactoRequest = {
      idContacto:                    this.contactoEditar()?.idContacto ?? 0,
      idCliente:                     this.idCliente(),
      // Compat: enviamos la primera sede en el campo legacy.
      idSede:                        primeraSede.idSede,
      nombres:                       v.nombres,
      documentoIdentidad:            v.documentoIdentidad || null,
      cargo:                         v.cargo              || null,
      area:                          v.area               || null,
      correo:                        v.correo             || null,
      telefonoMovil:                 v.telefonoMovil      || null,
      telefonoAnexo:                 v.telefonoAnexo      || null,
      // Compat: espejamos el flag de empresa en el legacy mientras Bryan
      // separa los flags en el back.
      esContactoPrincipal:           v.esPrincipalEmpresa,
      esPrincipalEmpresa:            v.esPrincipalEmpresa,
      sedes:                         sedes.map(s => ({ idSede: s.idSede, esPrincipalSede: s.esPrincipalSede })),
      autorizadoAprobarCotizaciones: v.autorizadoAprobarCotizaciones,
      recibeAlertasCalibracion:      v.recibeAlertasCalibracion,
      autorizadoRecepcionTecnica:    v.autorizadoRecepcionTecnica,
    };

    if (this.idCliente() === 0) {
      this.guardadoLocal.emit(dto);
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    try {
      await this.maestrosSvc.guardarContacto(dto);
      if (this.borradorHabilitado) {
        this.borradorSvc.borrar(this.borradorKey);
      }
      this.salidaControlada = true;
      this.guardado.emit();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar el contacto.');
    } finally {
      this.guardando.set(false);
    }
  }
}
