import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { CatalogoItem, GuardarClienteRequest, SedeListaItem } from '../../../../core/models/maestros.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { ModalSedeComponent } from '../modal-sede/modal-sede.component';

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
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent, ModalSedeComponent],
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

  readonly sedes         = signal<SedeListaItem[]>([]);
  readonly modalSedeOpen = signal(false);
  readonly sedeEditar    = signal<SedeListaItem | null>(null);

  readonly ssomaItems      = SSOMA_ITEMS;
  readonly tiposDocumento  = signal<CatalogoItem[]>([]);
  readonly tiposCliente    = signal<CatalogoItem[]>([]);
  readonly condicionesPago = signal<CatalogoItem[]>([]);
  readonly patronesMasas   = signal<CatalogoItem[]>([]);

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
    ]);

    try {
      if (esNuevo) {
        const [tiposDoc, tipos, condiciones, patrones] = await catalogsTask;
        this.tiposDocumento.set(tiposDoc);
        this.tiposCliente.set(tipos);
        this.condicionesPago.set(condiciones);
        this.patronesMasas.set(patrones);
      } else {
        this.idCliente = Number(idParam);
        const [[tiposDoc, tipos, condiciones, patrones], detalle] = await Promise.all([
          catalogsTask,
          this.maestrosSvc.obtenerClientePorId(this.idCliente),
        ]);
        this.tiposDocumento.set(tiposDoc);
        this.tiposCliente.set(tipos);
        this.condicionesPago.set(condiciones);
        this.patronesMasas.set(patrones);

        this.estadoCliente.set(detalle.estado);

        const listaSedes = await this.maestrosSvc.obtenerSedesPorCliente(this.idCliente);
        this.sedes.set(listaSedes);

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
      };

      const id = await this.maestrosSvc.guardarCliente(dto);
      this.router.navigate(['/maestros/clientes', id]);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar el cliente.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/maestros/clientes']);
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
