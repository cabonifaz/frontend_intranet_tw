import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { CatalogoItem, ContactoListaItem, GuardarClienteRequest, GuardarContactoRequest, GuardarSedeRequest, SedeListaItem } from '../../../../core/models/maestros.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { ModalSedeComponent } from '../modal-sede/modal-sede.component';
import { ModalContactoComponent } from '../modal-contacto/modal-contacto.component';

interface SsomaItem {
  clave: 'ssomaPolizaSctr' | 'ssomaCamioneta4x4' | 'ssomaInduccionSsoma' | 'ssomaExamenMedico';
  nombre: string;
  descripcion: string;
}

const SSOMA_ITEMS: SsomaItem[] = [
  {
    clave: 'ssomaPolizaSctr',
    nombre: 'Póliza SCTR Salud y Pensión Obligatoria',
    descripcion: 'Requiere constancia vigente con tasa minera de alto riesgo',
  },
  {
    clave: 'ssomaCamioneta4x4',
    nombre: 'Camioneta 4×4 con Equipamiento Minero',
    descripcion: 'Pértiga, circulina estroboscópica, jaula interna y radio VHF',
  },
  {
    clave: 'ssomaInduccionSsoma',
    nombre: 'Inducción SSOMA / Anexo 4 y 5 Vigente',
    descripcion: 'Capacitación mínima obligatoria presencial en base minera',
  },
  {
    clave: 'ssomaExamenMedico',
    nombre: 'Examen Médico Ocupacional (Anexo 16)',
    descripcion: 'Aptitud médica para gran altitud geográfica (> 4,000 msnm)',
  },
];


@Component({
  selector: 'app-ficha-cliente',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent, ModalSedeComponent, ModalContactoComponent],
  templateUrl: './ficha-cliente.component.html',
  styleUrl: './ficha-cliente.component.scss',
})
export class FichaClienteComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);

  readonly cargando      = signal(true);
  readonly guardando     = signal(false);
  readonly error         = signal('');
  readonly esNuevo       = signal(false);
  readonly estadoCliente = signal('Borrador');

  readonly sedes              = signal<SedeListaItem[]>([]);
  readonly modalSedeOpen      = signal(false);
  readonly sedeEditar         = signal<SedeListaItem | null>(null);
  readonly sedesTemp          = signal<SedeListaItem[]>([]);

  readonly contactos          = signal<ContactoListaItem[]>([]);
  readonly modalContactoOpen  = signal(false);
  readonly contactoEditar     = signal<ContactoListaItem | null>(null);
  readonly contactosTemp      = signal<ContactoListaItem[]>([]);

  private _tempId = 0;

  readonly ssomaItems       = SSOMA_ITEMS;
  readonly tiposDocumento   = signal<CatalogoItem[]>([]);
  readonly tiposCliente     = signal<CatalogoItem[]>([]);
  readonly condicionesPago  = signal<CatalogoItem[]>([]);
  readonly patronesMasas    = signal<CatalogoItem[]>([]);
  readonly categoriasCliente = signal<CatalogoItem[]>([]);

  idCliente = 0;

  formulario: FormGroup = this.fb.group({
    tipoDocumento:          ['RUC'],
    ruc:                    ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
    tipoCliente:            ['', Validators.required],
    razonSocial:            ['', Validators.required],
    nombreComercial:        [''],
    condicionFiscal:        ['Activo'],
    condicionContribuyente: ['Habido'],
    condicionPago:          [''],
    lineaCreditoUsd:        [null],
    telefonoCentral:        [''],
    domicilioFiscal:        [''],
    esVip:                  [false],
    reglaVip:               [''],
    descuentoVipPct:        [null],
    patronMasasAsignado:    [''],
    ssomaPolizaSctr:        [false],
    ssomaCamioneta4x4:      [false],
    ssomaInduccionSsoma:    [false],
    ssomaExamenMedico:      [false],
    ssomaNotas:             [''],
    categoria:              [''],
  });

  async ngOnInit(): Promise<void> {
    const idParam  = this.route.snapshot.paramMap.get('id');
    const esNuevo  = !idParam || idParam === 'nuevo';
    this.esNuevo.set(esNuevo);

    const catalogsTask = Promise.all([
      this.maestrosSvc.obtenerCatalogo('TIPO_DOC_CLIENTE'),
      this.maestrosSvc.obtenerCatalogo('TIPO_CLIENTE'),
      this.maestrosSvc.obtenerCatalogo('CONDICION_PAGO'),
      this.maestrosSvc.obtenerCatalogo('PATRON_MASAS'),
      this.maestrosSvc.obtenerCatalogo('CATEGORIA_CLIENTE'),
    ]);

    try {
      if (esNuevo) {
        const [tiposDoc, tipos, condiciones, patrones, categorias] = await catalogsTask;
        this.tiposDocumento.set(tiposDoc);
        this.tiposCliente.set(tipos);
        this.condicionesPago.set(condiciones);
        this.patronesMasas.set(patrones);
        this.categoriasCliente.set(categorias);
      } else {
        this.idCliente = Number(idParam);
        const [[tiposDoc, tipos, condiciones, patrones, categorias], detalle] = await Promise.all([
          catalogsTask,
          this.maestrosSvc.obtenerClientePorId(this.idCliente),
        ]);
        this.tiposDocumento.set(tiposDoc);
        this.tiposCliente.set(tipos);
        this.condicionesPago.set(condiciones);
        this.patronesMasas.set(patrones);
        this.categoriasCliente.set(categorias);

        this.estadoCliente.set(detalle.estado);

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
          condicionFiscal:        detalle.condicionFiscal,
          condicionContribuyente: detalle.condicionContribuyente,
          condicionPago:          detalle.condicionPago ?? '',
          lineaCreditoUsd:        detalle.lineaCreditoUsd,
          telefonoCentral:        detalle.telefonoCentral ?? '',
          domicilioFiscal:        detalle.domicilioFiscal ?? '',
          esVip:                  detalle.esVip,
          reglaVip:               detalle.reglaVip ?? '',
          descuentoVipPct:        detalle.descuentoVipPct,
          patronMasasAsignado:    detalle.patronMasasAsignado ?? '',
          ssomaPolizaSctr:        detalle.ssomaPolizaSctr,
          ssomaCamioneta4x4:      detalle.ssomaCamioneta4x4,
          ssomaInduccionSsoma:    detalle.ssomaInduccionSsoma,
          ssomaExamenMedico:      detalle.ssomaExamenMedico,
          ssomaNotas:             detalle.ssomaNotas ?? '',
          categoria:              detalle.categoria ?? '',
        });
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      this.cargando.set(false);
    }
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
        condicionFiscal:        v.condicionFiscal,
        condicionContribuyente: v.condicionContribuyente,
        condicionPago:          v.condicionPago || null,
        lineaCreditoUsd:        v.lineaCreditoUsd,
        telefonoCentral:        v.telefonoCentral || null,
        domicilioFiscal:        v.domicilioFiscal || null,
        esVip:                  v.esVip,
        reglaVip:               v.reglaVip || null,
        descuentoVipPct:        v.descuentoVipPct,
        patronMasasAsignado:    v.patronMasasAsignado || null,
        ssomaPolizaSctr:        v.ssomaPolizaSctr,
        ssomaCamioneta4x4:      v.ssomaCamioneta4x4,
        ssomaInduccionSsoma:    v.ssomaInduccionSsoma,
        ssomaExamenMedico:      v.ssomaExamenMedico,
        ssomaNotas:             v.ssomaNotas || null,
        categoria:              v.categoria || null,
      };

      const id = await this.maestrosSvc.guardarCliente(dto);

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
            const resolvedSede = c.idSede != null && c.idSede < 0
              ? (sedeIdMap.get(c.idSede) ?? null)
              : c.idSede;
            const req: GuardarContactoRequest = {
              idContacto:                    0,
              idCliente:                     id,
              idSede:                        resolvedSede,
              nombres:                       c.nombres,
              documentoIdentidad:            c.documentoIdentidad,
              cargo:                         c.cargo,
              area:                          c.area,
              correo:                        c.correo,
              telefonoMovil:                 c.telefonoMovil,
              telefonoAnexo:                 c.telefonoAnexo,
              esContactoPrincipal:           c.esContactoPrincipal,
              autorizadoAprobarCotizaciones: c.autorizadoAprobarCotizaciones,
              recibeAlertasCalibracion:      c.recibeAlertasCalibracion,
              autorizadoRecepcionTecnica:    c.autorizadoRecepcionTecnica,
            };
            return this.maestrosSvc.guardarContacto(req);
          })
        );
      }

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
      estado:          'Activo',
    };
    this.sedesTemp.update(list => [...list, item]);
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
      autorizadoAprobarCotizaciones: dto.autorizadoAprobarCotizaciones,
      recibeAlertasCalibracion:      dto.recibeAlertasCalibracion,
      autorizadoRecepcionTecnica:    dto.autorizadoRecepcionTecnica,
      estado:                        'Activo',
    };
    this.contactosTemp.update(list => [...list, item]);
    this.cerrarModalContacto();
  }

  eliminarSedeTemp(idSede: number): void {
    this.sedesTemp.update(list => list.filter(s => s.idSede !== idSede));
  }

  eliminarContactoTemp(idContacto: number): void {
    this.contactosTemp.update(list => list.filter(c => c.idContacto !== idContacto));
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
    const nuevoEstado = sede.estado === 'Activo' ? 'Inactivo' : 'Activo';
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
    const nuevoEstado = contacto.estado === 'Activo' ? 'Inactivo' : 'Activo';
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
    return [
      { label: 'Inicio',    ruta: '/dashboard' },
      { label: 'Maestros' },
      { label: 'Clientes',  ruta: '/maestros/clientes' },
      { label: this.esNuevo() ? 'Nuevo Cliente' : 'Editar Cliente' },
    ];
  }
}
