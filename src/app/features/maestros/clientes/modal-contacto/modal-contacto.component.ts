import { Component, DestroyRef, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { BorradorService, BorradorInfo } from '../../../../core/services/borrador.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ContactoListaItem, GuardarContactoRequest, SedeListaItem } from '../../../../core/models/maestros.model';
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

  formulario: FormGroup = this.fb.group({
    nombres:                        ['', Validators.required],
    documentoIdentidad:             [''],
    cargo:                          [''],
    area:                           [''],
    idSede:                         [null],
    correo:                         ['', [Validators.email]],
    telefonoMovil:                  [''],
    telefonoAnexo:                  [''],
    esContactoPrincipal:            [false],
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
        idSede:                        c.idSede,
        correo:                        c.correo             ?? '',
        telefonoMovil:                 c.telefonoMovil      ?? '',
        telefonoAnexo:                 c.telefonoAnexo      ?? '',
        esContactoPrincipal:           c.esContactoPrincipal,
        autorizadoAprobarCotizaciones: c.autorizadoAprobarCotizaciones,
        recibeAlertasCalibracion:      c.recibeAlertasCalibracion,
        autorizadoRecepcionTecnica:    c.autorizadoRecepcionTecnica,
      });
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

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    const v = this.formulario.value;
    const dto: GuardarContactoRequest = {
      idContacto:                    this.contactoEditar()?.idContacto ?? 0,
      idCliente:                     this.idCliente(),
      idSede:                        v.idSede || null,
      nombres:                       v.nombres,
      documentoIdentidad:            v.documentoIdentidad || null,
      cargo:                         v.cargo              || null,
      area:                          v.area               || null,
      correo:                        v.correo             || null,
      telefonoMovil:                 v.telefonoMovil      || null,
      telefonoAnexo:                 v.telefonoAnexo      || null,
      esContactoPrincipal:           v.esContactoPrincipal,
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
