import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CrmService } from '../../../../core/services/crm.service';
import {
  CatalogoItem,
  RequerimientoFicha,
  GuardarRequerimientoComando,
} from '../../../../core/models/crm.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
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
  imports: [ReactiveFormsModule, RouterLink, DatePipe, BreadcrumbComponent, SeleccionarClienteComponent, SeleccionarSedeComponent, SeleccionarContactoComponent],
  templateUrl: './ficha-requerimiento.component.html',
  styleUrl: './ficha-requerimiento.component.scss',
})
export class FichaRequerimientoComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly crmSvc = inject(CrmService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  idRequerimiento = 0;

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

  async guardar(continuar = false): Promise<void> {
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
      const id = await this.crmSvc.guardarRequerimiento(cmd);
      if (continuar) {
        this.router.navigate(['/crm/requerimientos', id, 'editar']);
      } else {
        this.router.navigate(['/crm/requerimientos']);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al guardar el requerimiento.');
    } finally {
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/crm/requerimientos']);
  }

  get puedeGuardar(): boolean {
    return this.formulario.valid && !!this.cliente();
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
