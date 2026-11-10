import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { MaestrosService } from '../../../../../core/services/maestros.service';
import { CuotaPago } from '../../../../../core/models/propuesta-detalle.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { CampoComponent } from '../../../../../shared/ui/campo/campo.component';
import { ToggleComponent } from '../../../../../shared/ui/toggle/toggle.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-seccion-forma-pago',
  imports: [ReactiveFormsModule, FormsModule, SeccionComponent, CampoComponent, ToggleComponent, ButtonComponent],
  templateUrl: './forma-pago.component.html',
  styleUrl: './forma-pago.component.scss',
})
export class FormaPagoComponent implements OnInit {
  readonly draftSvc = inject(PropuestaDraftService);
  private readonly fb        = inject(FormBuilder);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly condicionesPago = signal<{ codigo: string; nombre: string }[]>([]);

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

  async ngOnInit(): Promise<void> {
    try {
      const condiciones = await this.maestrosSvc.obtenerCatalogo('CONDICION_PAGO');
      this.condicionesPago.set(
        condiciones.map(c => ({ codigo: c.codigo ?? c.nombre, nombre: c.nombre }))
      );
    } catch { /* catálogo opcional */ }

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

    // Observación 20 (fix v3 2026-11-03): resolver el valor que debe ir en la
    // descripción del hito. Prioridad: código del back → código buscado por
    // nombre en el catálogo → texto crudo (el select agregará una opción
    // sintética para mostrarlo pre-seleccionado).
    const resolverCondicionCliente = (): string => {
      const codigo = d.condicionPagoCodigoRq;
      const texto  = d.condicionPagoClienteRq;
      const catalogo = this.condicionesPago();
      if (codigo) {
        const match = catalogo.find(c => c.codigo === codigo);
        if (match) return match.codigo;
      }
      if (texto) {
        const porCodigo = catalogo.find(c => c.codigo === texto);
        if (porCodigo) return porCodigo.codigo;
        const porNombre = catalogo.find(c => c.nombre === texto);
        if (porNombre) return porNombre.codigo;
        return texto;   // sin match: lo mostramos como opción sintética
      }
      return '';
    };

    const condicionCliente = resolverCondicionCliente();
    const cuotasActuales = d.cuotas ?? [];

    if (cuotasActuales.length === 0) {
      if (condicionCliente) {
        this.draftSvc.actualizar({
          cuotas: [{
            id: 'c_cliente_' + Date.now(),
            porcentaje: 100,
            descripcion: condicionCliente,
          }],
        });
      } else {
        this.draftSvc.actualizar({
          cuotas: [
            { id: 'c1_' + Date.now(), porcentaje: 50, descripcion: 'Factura a 30 días' },
            { id: 'c2_' + Date.now(), porcentaje: 20, descripcion: 'Contra la entrega de equipos' },
            { id: 'c3_' + Date.now(), porcentaje: 30, descripcion: 'Al finalizar la instalación' },
          ],
        });
      }
    } else if (
      condicionCliente &&
      cuotasActuales.length === 1 &&
      cuotasActuales[0].id.startsWith('c_cliente_') &&
      cuotasActuales[0].descripcion !== condicionCliente
    ) {
      // El hito ya existe (viene del borrador) pero su descripción no coincide
      // con la que queremos mostrar — la normalizamos.
      this.draftSvc.actualizar({
        cuotas: [{ ...cuotasActuales[0], descripcion: condicionCliente }],
      });
    }

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => {
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

  /** Observación 20 (fix 2026-11-03): ¿esta descripción está en el catálogo? */
  esDelCatalogo(valor: string): boolean {
    return this.condicionesPago().some(c => c.codigo === valor);
  }

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
