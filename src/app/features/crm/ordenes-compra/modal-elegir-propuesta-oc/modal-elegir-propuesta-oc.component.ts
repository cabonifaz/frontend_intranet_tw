import { Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PropuestaDisponibleOcDto } from '../../../../core/models/ordenes-compra.model';

/**
 * Modal pequeño "+ Nueva OC" — lista las propuestas aceptadas sin OC.
 * Al elegir una propuesta, emite el output `elegida(idPropuesta)` para que
 * el padre navegue a la ficha de registrar OC.
 */
@Component({
  selector: 'app-modal-elegir-propuesta-oc',
  imports: [CommonModule, ModalComponent],
  templateUrl: './modal-elegir-propuesta-oc.component.html',
  styleUrl: './modal-elegir-propuesta-oc.component.scss',
})
export class ModalElegirPropuestaOcComponent implements OnInit {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly cerrar  = output<void>();
  readonly elegida = output<number>();

  readonly cargando = signal(true);
  readonly propuestas = signal<PropuestaDisponibleOcDto[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.svc.obtenerPropuestasDisponibles();
      this.propuestas.set(list);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudieron cargar las propuestas.');
    } finally {
      this.cargando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  seleccionar(p: PropuestaDisponibleOcDto): void {
    this.elegida.emit(p.idPropuesta);
  }

  formatearMonto(monto: number, simbolo?: string | null): string {
    const s = simbolo ?? '';
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${v}`.trim();
  }
}
