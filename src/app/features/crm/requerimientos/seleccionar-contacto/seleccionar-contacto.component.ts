import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { ContactoListaItem } from '../../../../core/models/maestros.model';

export interface ContactoSeleccionado {
  idContacto: number;
  nombres:    string;
  cargo:      string | null;
}

@Component({
  selector: 'app-seleccionar-contacto',
  imports: [],
  templateUrl: './seleccionar-contacto.component.html',
  styleUrl: './seleccionar-contacto.component.scss',
})
export class SeleccionarContactoComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);

  readonly idCliente  = input.required<number>();
  readonly confirmado = output<ContactoSeleccionado>();
  readonly cancelado  = output<void>();

  readonly cargando     = signal(true);
  readonly contactos    = signal<ContactoListaItem[]>([]);
  readonly seleccionado = signal<ContactoListaItem | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const lista = await this.maestrosSvc.obtenerContactosPorCliente(this.idCliente());
      this.contactos.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionar(c: ContactoListaItem): void {
    this.seleccionado.set(c);
  }

  confirmar(): void {
    const s = this.seleccionado();
    if (!s) return;
    this.confirmado.emit({ idContacto: s.idContacto, nombres: s.nombres, cargo: s.cargo });
  }

  cancelar(): void {
    this.cancelado.emit();
  }
}
