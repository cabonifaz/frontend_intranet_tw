import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CrmService } from '../../../../core/services/crm.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CatalogoItem,
  RequerimientoFicha,
  GuardarRequerimientoComando,
} from '../../../../core/models/crm.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { HeroHeaderComponent } from '../../../../shared/ui/hero-header/hero-header.component';
import { SeccionComponent }    from '../../../../shared/ui/seccion/seccion.component';
import { FormFooterComponent } from '../../../../shared/ui/form-footer/form-footer.component';
import { EstadoVacioComponent } from '../../../../shared/ui/estado-vacio/estado-vacio.component';
import { ButtonComponent }     from '../../../../shared/ui/button/button.component';
import { ESTADO_RQ } from '../../../../core/constants/estados';
import {
  SeleccionarClienteComponent,
  ClienteSeleccionado,
} from '../seleccionar-cliente/seleccionar-cliente.component';
import {
  SeleccionarContactoComponent,
  ContactoSeleccionado,
} from '../seleccionar-contacto/seleccionar-contacto.component';
import {
  SeleccionarSedeComponent,
  SedeSeleccionada,
} from '../seleccionar-sede/seleccionar-sede.component';

@Component({
  selector: 'app-ficha-requerimiento',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, BreadcrumbComponent, HeroHeaderComponent, SeccionComponent, FormFooterComponent, EstadoVacioComponent, ButtonComponent, SeleccionarClienteComponent, SeleccionarSedeComponent, SeleccionarContactoComponent],
  templateUrl: './ficha-requerimiento.component.html',
  styleUrl: './ficha-requerimiento.component.scss',
})
export class FichaRequerimientoComponent implements OnInit {
  private readonly fb       = inject(FormBuilder);
  private readonly crmSvc   = inject(CrmService);
  private readonly toastSvc = inject(ToastService);
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);

  readonly cargando    = signal(true);
  readonly guardando   = signal(false);
  readonly error       = signal('');
  readonly esNuevo     = signal(true);
  readonly ficha       = signal<RequerimientoFicha | null>(null);
  readonly origenes    = signal<CatalogoItem[]>([]);
  readonly areas       = signal<CatalogoItem[]>([]);
  readonly prioridades = signal<CatalogoItem[]>([]);
  readonly mostrarModalCliente   = signal(false);
  readonly mostrarModalSede      = signal(false);
  readonly mostrarModalContacto  = signal(false);
  readonly cliente    = signal<ClienteSeleccionado | null>(null);
  readonly sede       = signal<SedeSeleccionada | null>(null);
  readonly contacto   = signal<ContactoSeleccionado | null>(null);

  readonly esSoloLectura = computed(() => {
    const estado = this.ficha()?.estado;
    return estado === ESTADO_RQ.ANULADO || estado === ESTADO_RQ.CERRADO;
  });

  idRequerimiento = 0;

  readonly pasosFlujo = [
    { key: 'rq',          label: 'Requerimiento' },
    { key: 'propuesta',   label: 'Propuesta'     },
    { key: 'vb',          label: 'Visto Bueno'   },
    { key: 'envio',       label: 'Envío'         },
    { key: 'seguimiento', label: 'Seguimiento'   },
    { key: 'aceptacion',  label: 'Aceptación'    },
  ];

  protected readonly ESTADO_RQ = ESTADO_RQ;

  private readonly estadoAStep: Record<string, string> = {
    [ESTADO_RQ.NUEVO]:         'rq',
    [ESTADO_RQ.EN_PROCESO]:    'propuesta',
    [ESTADO_RQ.CON_PROPUESTA]: 'envio',
    [ESTADO_RQ.CERRADO]:       'aceptacion',
  };

  pasoIndice(key: string): number {
    return this.pasosFlujo.findIndex(p => p.key === key);
  }

  pasoCls(pasoKey: string, estadoActual: string): string {
    if (estadoActual === ESTADO_RQ.ANULADO) return 'timeline__item--gris';
    const stepActual = this.estadoAStep[estadoActual] ?? estadoActual;
    const idxActual  = this.pasoIndice(stepActual);
    if (idxActual < 0) return '';
    const idxPaso = this.pasoIndice(pasoKey);
    if (idxPaso < idxActual)   return 'timeline__item--done';
    if (idxPaso === idxActual) return 'timeline__item--activo';
    return '';
  }

  calcularFlujoPct(): number {
    const f = this.ficha();
    if (!f) return 0;
    const stepActual = this.estadoAStep[f.estado] ?? f.estado;
    const idx = this.pasoIndice(stepActual);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / this.pasosFlujo.length) * 100);
  }

  calcularSlaPct(): number {
    const f = this.ficha();
    if (!f?.fechaNecesidad) return 0;
    const inicio = new Date(f.fechaCreacion).getTime();
    const fin    = new Date(f.fechaNecesidad);
    fin.setHours(23, 59, 59, 999);
    const total  = fin.getTime() - inicio;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round(((Date.now() - inicio) / total) * 100)));
  }

  calcularSlaTexto(): string {
    const f = this.ficha();
    if (!f?.fechaNecesidad) return 'Sin fecha límite';
    const dias = Math.ceil((new Date(f.fechaNecesidad).getTime() - Date.now()) / 86_400_000);
    if (dias < 0)   return `${Math.abs(dias)} días vencido`;
    if (dias === 0) return 'Vence hoy';
    return `${dias} días restantes`;
  }

  slaBarraCls(): string {
    const f = this.ficha();
    if (!f?.fechaNecesidad) return '';
    const dias = Math.ceil((new Date(f.fechaNecesidad).getTime() - Date.now()) / 86_400_000);
    if (dias <= 0) return 'sla__fill--rojo';
    if (dias <= 3) return 'sla__fill--naranja';
    return '';
  }

  formatearFechaRelativa(fecha: string): string {
    const utc   = fecha.endsWith('Z') || fecha.includes('+') ? fecha : fecha + 'Z';
    const diff  = Date.now() - new Date(utc).getTime();
    if (diff < 0) return 'Ahora mismo';
    const mins  = Math.floor(diff / 60_000);
    const horas = Math.floor(diff / 3_600_000);
    const dias  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return 'Ahora mismo';
    if (mins  < 60) return `Hace ${mins} min`;
    if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  }

  readonly formulario: FormGroup = this.fb.group({
    idOrigen:        ['',  Validators.required],
    idArea:          ['',  Validators.required],
    idPrioridad:     ['',  Validators.required],
    fechaNecesidad:  [''],
    descripcion:     ['',  [Validators.required, Validators.minLength(10)]],
    notificarCorreo: [false],
    requiereVisita:  [false],
    clienteDeuda:    [false],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const nuevo   = !idParam;
    this.esNuevo.set(nuevo);

    try {
      const cats = await this.crmSvc.obtenerCatalogos();
      this.origenes.set(cats.origenes);
      this.areas.set(cats.areas);
      this.prioridades.set(cats.prioridades);

      if (!nuevo) {
        this.idRequerimiento = Number(idParam);
        const f = await this.crmSvc.obtenerRequerimientoPorId(this.idRequerimiento);
        this.ficha.set(f);
        this.cliente.set({ idCliente: f.idCliente, razonSocial: f.razonSocial, ruc: f.ruc });
        if (f.idSede) {
          this.sede.set({ idSede: f.idSede, nombre: f.nombreSede ?? '', tipoInstalacion: null, region: null });
        }
        if (f.idContacto) {
          this.contacto.set({ idContacto: f.idContacto, nombres: f.nombreContacto ?? '', cargo: null });
        }
        this.formulario.patchValue({
          idOrigen:        f.idOrigen,
          idArea:          f.idArea,
          idPrioridad:     f.idPrioridad,
          fechaNecesidad:  f.fechaNecesidad ? f.fechaNecesidad.substring(0, 10) : '',
          descripcion:     f.descripcion,
          notificarCorreo: f.notificarCorreo,
          requiereVisita:  f.requiereVisita,
          clienteDeuda:    f.clienteDeuda,
        });
        if (this.esSoloLectura()) {
          this.formulario.disable();
        }
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      this.cargando.set(false);
    }
  }

  onClienteConfirmado(sel: ClienteSeleccionado): void {
    this.cliente.set(sel);
    this.mostrarModalCliente.set(false);
    this.sede.set(null);
    this.contacto.set(null);
  }

  onSedeConfirmada(sel: SedeSeleccionada): void {
    this.sede.set(sel);
    this.mostrarModalSede.set(false);
    this.contacto.set(null);
  }

  onContactoConfirmado(sel: ContactoSeleccionado): void {
    this.contacto.set(sel);
    this.mostrarModalContacto.set(false);
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || !this.cliente() || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      const v = this.formulario.value;
      const cmd: GuardarRequerimientoComando = {
        idRequerimiento: this.idRequerimiento,
        idCliente:       this.cliente()!.idCliente,
        idSede:          this.sede()?.idSede ?? null,
        idContacto:      this.contacto()?.idContacto ?? null,
        idOrigen:        Number(v.idOrigen),
        idArea:          Number(v.idArea),
        idPrioridad:     Number(v.idPrioridad),
        fechaNecesidad:  v.fechaNecesidad || null,
        descripcion:     v.descripcion,
        notificarCorreo: v.notificarCorreo,
        requiereVisita:  v.requiereVisita,
        clienteDeuda:    v.clienteDeuda,
      };
      await this.crmSvc.guardarRequerimiento(cmd);
      const msg = this.esNuevo()
        ? 'Requerimiento creado exitosamente.'
        : 'Cambios guardados correctamente.';
      this.toastSvc.exito(msg);
      this.router.navigate(['/crm/requerimientos']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar el requerimiento.';
      this.error.set(msg);
      this.toastSvc.error(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/crm/requerimientos']);
  }

  get puedeGuardar(): boolean {
    return this.formulario.valid && !!this.cliente() && !this.esSoloLectura();
  }

  get breadcrumb(): BreadcrumbItem[] {
    const f     = this.ficha();
    const items: BreadcrumbItem[] = [
      { label: 'Inicio',         ruta: '/dashboard' },
      { label: 'CRM' },
      { label: 'Requerimientos', ruta: '/crm/requerimientos' },
    ];
    if (!this.esNuevo() && f) {
      items.push({ label: f.numero });
      items.push({ label: 'Editar' });
    } else {
      items.push({ label: 'Nuevo' });
    }
    return items;
  }
}
