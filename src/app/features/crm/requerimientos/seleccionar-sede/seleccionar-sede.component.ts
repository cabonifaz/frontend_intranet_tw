import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { SedeListaItem } from '../../../../core/models/maestros.model';
import { ModalComponent }  from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

export interface SedeSeleccionada {
  idSede:          number;
  nombre:          string;
  tipoInstalacion: string | null;
  region:          string | null;
}

@Component({
  selector: 'app-seleccionar-sede',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './seleccionar-sede.component.html',
  styleUrl: './seleccionar-sede.component.scss',
})
export class SeleccionarSedeComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);

  readonly idCliente      = input.required<number>();
  /** Auto-selección si solo hay 1 sede (observación 31/10: reducir clicks). */
  readonly autoSeleccionar = input<boolean>(true);
  readonly confirmado = output<SedeSeleccionada>();
  readonly cancelado  = output<void>();

  readonly cargando     = signal(true);
  readonly sedes        = signal<SedeListaItem[]>([]);
  readonly seleccionado = signal<SedeListaItem | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const lista = await this.maestrosSvc.obtenerSedesPorCliente(this.idCliente());
      this.sedes.set(lista);
      if (this.autoSeleccionar() && lista.length === 1) {
        // Única sede del cliente: la aplicamos sin que el usuario tenga que elegirla.
        this.emitir(lista[0]);
      }
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionar(s: SedeListaItem): void {
    this.seleccionado.set(s);
    this.emitir(s);
  }

  confirmar(): void {
    const s = this.seleccionado();
    if (!s) return;
    this.emitir(s);
  }

  private emitir(s: SedeListaItem): void {
    this.confirmado.emit({
      idSede:          s.idSede,
      nombre:          s.nombre,
      tipoInstalacion: s.tipoInstalacion,
      region:          s.region,
    });
  }

  cancelar(): void {
    this.cancelado.emit();
  }
}
