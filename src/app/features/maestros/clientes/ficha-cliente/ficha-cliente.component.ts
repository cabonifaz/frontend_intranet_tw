import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { GuardarClienteRequest } from '../../../../core/models/maestros.model';

interface SsomaItem {
  clave: 'ssomaPaseIngreso' | 'ssomaTrabajoAltura' | 'ssomaEspacioConfinado' | 'ssomaInduccionPrevia';
  nombre: string;
  descripcion: string;
}

const SSOMA_ITEMS: SsomaItem[] = [
  {
    clave: 'ssomaPaseIngreso',
    nombre: 'Requiere pase de ingreso',
    descripcion: 'El acceso al sitio requiere tramitación previa con el área de seguridad',
  },
  {
    clave: 'ssomaTrabajoAltura',
    nombre: 'Trabajo en altura',
    descripcion: 'Los técnicos deben acreditar certificado vigente de trabajo en altura',
  },
  {
    clave: 'ssomaEspacioConfinado',
    nombre: 'Espacio confinado',
    descripcion: 'Aplica protocolo especial con vigía de seguridad para el servicio',
  },
  {
    clave: 'ssomaInduccionPrevia',
    nombre: 'Inducción previa obligatoria',
    descripcion: 'Se requiere inducción presencial antes del primer acceso al site',
  },
];

const TIPOS_CLIENTE = [
  'Gran Minería',
  'Mediana Minería',
  'Pequeña Minería',
  'Petroquímica / Energía',
  'Industrial',
  'Gobierno / Estado',
  'Otro',
];

const CONDICIONES_PAGO = [
  'Contado',
  'Crédito 15 días',
  'Crédito 30 días',
  'Crédito 45 días',
  'Crédito 60 días',
  'Crédito 90 días',
];

const PATRONES_MASAS = [
  'Clase E2 Certificado INACAL',
  'Clase F1 Certificado INACAL',
  'Clase F2 Certificado INACAL',
  'Clase M1 / F2 Certificado INACAL',
  'Clase M2 Certificado INACAL',
];

@Component({
  selector: 'app-ficha-cliente',
  imports: [ReactiveFormsModule],
  templateUrl: './ficha-cliente.component.html',
  styleUrl: './ficha-cliente.component.scss',
})
export class FichaClienteComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly route       = inject(ActivatedRoute);
  private readonly router      = inject(Router);

  readonly cargando   = signal(true);
  readonly guardando  = signal(false);
  readonly error      = signal('');
  readonly esNuevo    = signal(false);

  readonly ssomaItems    = SSOMA_ITEMS;
  readonly tiposCliente  = TIPOS_CLIENTE;
  readonly condicionesPago = CONDICIONES_PAGO;
  readonly patronesMasas = PATRONES_MASAS;

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
    ssomaPaseIngreso:       [false],
    ssomaTrabajoAltura:     [false],
    ssomaEspacioConfinado:  [false],
    ssomaInduccionPrevia:   [false],
    ssomaNotas:             [''],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (!idParam || idParam === 'nuevo') {
      this.esNuevo.set(true);
      this.cargando.set(false);
      return;
    }

    this.idCliente = Number(idParam);
    try {
      const detalle = await this.maestrosSvc.obtenerClientePorId(this.idCliente);
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
        ssomaPaseIngreso:       detalle.ssomaPaseIngreso,
        ssomaTrabajoAltura:     detalle.ssomaTrabajoAltura,
        ssomaEspacioConfinado:  detalle.ssomaEspacioConfinado,
        ssomaInduccionPrevia:   detalle.ssomaInduccionPrevia,
        ssomaNotas:             detalle.ssomaNotas ?? '',
      });
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar el cliente.');
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
        ssomaPaseIngreso:       v.ssomaPaseIngreso,
        ssomaTrabajoAltura:     v.ssomaTrabajoAltura,
        ssomaEspacioConfinado:  v.ssomaEspacioConfinado,
        ssomaInduccionPrevia:   v.ssomaInduccionPrevia,
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

  get esVip(): boolean {
    return !!this.formulario.get('esVip')?.value;
  }
}
