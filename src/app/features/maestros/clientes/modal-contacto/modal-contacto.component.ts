import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { ContactoListaItem, GuardarContactoRequest, SedeListaItem } from '../../../../core/models/maestros.model';

@Component({
  selector: 'app-modal-contacto',
  imports: [ReactiveFormsModule],
  templateUrl: './modal-contacto.component.html',
  styleUrl: './modal-contacto.component.scss',
})
export class ModalContactoComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);

  readonly idCliente       = input.required<number>();
  readonly sedesCliente    = input<SedeListaItem[]>([]);
  readonly contactoEditar  = input<ContactoListaItem | null>(null);

  readonly guardado       = output<void>();
  readonly guardadoLocal  = output<GuardarContactoRequest>();
  readonly cancelado      = output<void>();

  readonly guardando = signal(false);
  readonly error     = signal('');

  formulario: FormGroup = this.fb.group({
    nombres:                        ['', Validators.required],
    documentoIdentidad:             [''],
    cargo:                          [''],
    area:                           [''],
    idSede:                         [null],
    correo:                         [''],
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
      this.guardado.emit();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar el contacto.');
    } finally {
      this.guardando.set(false);
    }
  }
}
