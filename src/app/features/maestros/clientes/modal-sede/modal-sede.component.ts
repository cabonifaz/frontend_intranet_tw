import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { CatalogoItem, GuardarSedeRequest, SedeListaItem } from '../../../../core/models/maestros.model';

@Component({
  selector: 'app-modal-sede',
  imports: [ReactiveFormsModule],
  templateUrl: './modal-sede.component.html',
  styleUrl: './modal-sede.component.scss',
})
export class ModalSedeComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);

  readonly idCliente  = input.required<number>();
  readonly sedeEditar = input<SedeListaItem | null>(null);

  readonly guardado  = output<void>();
  readonly cancelado = output<void>();

  readonly guardando       = signal(false);
  readonly error           = signal('');
  readonly tiposInstalacion = signal<CatalogoItem[]>([]);
  readonly regiones         = signal<CatalogoItem[]>([]);

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
    const [tipos, regs] = await Promise.all([
      this.maestrosSvc.obtenerCatalogo('TIPO_INSTALACION'),
      this.maestrosSvc.obtenerCatalogo('REGION_PERU'),
    ]);
    this.tiposInstalacion.set(tipos);
    this.regiones.set(regs);

    const sede = this.sedeEditar();
    if (sede) {
      this.formulario.patchValue({
        nombre:          sede.nombre,
        tipoInstalacion: sede.tipoInstalacion ?? '',
        region:          sede.region          ?? '',
        provincia:       sede.provincia       ?? '',
        distrito:        sede.distrito        ?? '',
        urbanizacion:    sede.urbanizacion    ?? '',
        direccionExacta: sede.direccionExacta ?? '',
      });
    }
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    this.guardando.set(true);
    this.error.set('');
    try {
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
      await this.maestrosSvc.guardarSede(dto);
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
