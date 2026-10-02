import { Component, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { CuotaPago } from '../../../../../core/models/propuesta-detalle.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { CampoComponent } from '../../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../../shared/ui/toggle/toggle.component';

@Component({
  selector: 'app-seccion-forma-pago',
  imports: [ReactiveFormsModule, FormsModule, SeccionComponent, CampoComponent, ToggleComponent],
  templateUrl: './forma-pago.component.html',
  styleUrl: './forma-pago.component.scss',
})
export class FormaPagoComponent implements OnInit {
  readonly draftSvc = inject(PropuestaDraftService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    tipoMoneda:         ['USD'],
    tipoCambio:         [3.75],
    garantiaEquipos:    [12],
    plazoEntrega:       [15],
    plazoEntregaUnidad: ['habiles'],
    validezOferta:      [30],
    igvDesagregado:     [false],
  });

  readonly totalCuotas = computed(() => this.draftSvc.totalCuotas());
  readonly esValido100 = computed(() => Math.abs(this.totalCuotas() - 100) < 0.01);

  ngOnInit(): void {
    const d = this.draftSvc.draft();
    this.form.patchValue({
      tipoMoneda:         d.tipoMoneda || 'USD',
      tipoCambio:         d.tipoCambio || 3.75,
      garantiaEquipos:    d.garantiaEquipos || 12,
      plazoEntrega:       d.plazoEntrega || 15,
      plazoEntregaUnidad: d.plazoEntregaUnidad || 'habiles',
      validezOferta:      d.validezOferta || 30,
      igvDesagregado:     d.igvDesagregado || false,
    }, { emitEvent: false });

    if ((d.cuotas ?? []).length === 0) {
      this.draftSvc.actualizar({
        cuotas: [
          { id: 'c1_' + Date.now(), porcentaje: 50, descripcion: 'Factura a 30 días' },
          { id: 'c2_' + Date.now(), porcentaje: 20, descripcion: 'Contra la entrega de equipos' },
          { id: 'c3_' + Date.now(), porcentaje: 30, descripcion: 'Al finalizar la instalación' },
        ],
      });
    }

    this.form.valueChanges.subscribe(v => {
      this.draftSvc.actualizar({
        tipoMoneda:         v.tipoMoneda ?? 'USD',
        tipoCambio:         v.tipoCambio ?? 3.75,
        garantiaEquipos:    v.garantiaEquipos ?? 12,
        plazoEntrega:       v.plazoEntrega ?? 15,
        plazoEntregaUnidad: (v.plazoEntregaUnidad as 'habiles' | 'calendario') ?? 'habiles',
        validezOferta:      v.validezOferta ?? 30,
        igvDesagregado:     !!v.igvDesagregado,
      });
    });
  }

  readonly cuotas = computed(() => this.draftSvc.draft().cuotas);

  agregarCuota(): void {
    this.draftSvc.actualizar({
      cuotas: [...this.cuotas(), { id: 'c_' + Date.now(), porcentaje: 0, descripcion: 'Nueva cuota' }],
    });
  }

  eliminarCuota(id: string): void {
    this.draftSvc.actualizar({ cuotas: this.cuotas().filter(c => c.id !== id) });
  }

  actualizarCuota(id: string, campo: keyof CuotaPago, valor: number | string): void {
    const nuevas = this.cuotas().map(c => c.id === id ? { ...c, [campo]: valor } as CuotaPago : c);
    this.draftSvc.actualizar({ cuotas: nuevas });
  }

  restablecerDefault(): void {
    this.draftSvc.actualizar({
      tipoMoneda: 'USD',
      tipoCambio: 3.75,
      garantiaEquipos: 12,
      plazoEntrega: 15,
      plazoEntregaUnidad: 'habiles',
      validezOferta: 30,
      igvDesagregado: false,
      cuotas: [
        { id: 'c1_' + Date.now(), porcentaje: 50, descripcion: 'Factura a 30 días' },
        { id: 'c2_' + Date.now(), porcentaje: 50, descripcion: 'Al finalizar el servicio' },
      ],
    });
    this.form.patchValue({
      tipoMoneda: 'USD', tipoCambio: 3.75, garantiaEquipos: 12, plazoEntrega: 15,
      plazoEntregaUnidad: 'habiles', validezOferta: 30, igvDesagregado: false,
    });
  }
}
