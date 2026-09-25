import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { SedeListaItem } from '../../../../core/models/maestros.model';

export interface SedeSeleccionada {
  idSede:          number;
  nombre:          string;
  tipoInstalacion: string | null;
  region:          string | null;
}

@Component({
  selector: 'app-seleccionar-sede',
  imports: [],
  templateUrl: './seleccionar-sede.component.html',
  styleUrl: './seleccionar-sede.component.scss',
})
export class SeleccionarSedeComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);

  readonly idCliente  = input.required<number>();
  readonly confirmado = output<SedeSeleccionada>();
  readonly cancelado  = output<void>();

  readonly cargando     = signal(true);
  readonly sedes        = signal<SedeListaItem[]>([]);
  readonly seleccionado = signal<SedeListaItem | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const lista = await this.maestrosSvc.obtenerSedesPorCliente(this.idCliente());
      this.sedes.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionar(s: SedeListaItem): void {
    this.seleccionado.set(s);
  }

  confirmar(): void {
    const s = this.seleccionado();
    if (!s) return;
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
