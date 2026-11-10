import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { ContactoListaItem } from '../../../../core/models/maestros.model';
import { ModalComponent }  from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

export interface ContactoSeleccionado {
  idContacto: number;
  nombres:    string;
  cargo:      string | null;
}

@Component({
  selector: 'app-seleccionar-contacto',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './seleccionar-contacto.component.html',
  styleUrl: './seleccionar-contacto.component.scss',
})
export class SeleccionarContactoComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);

  readonly idCliente       = input.required<number>();
  /** Auto-selección si solo hay 1 contacto (observación 31/10: reducir clicks). */
  readonly autoSeleccionar = input<boolean>(true);
  /** ID de contacto a excluir de la lista (p. ej. el contacto principal al elegir el secundario). */
  readonly excluirIdContacto = input<number | null>(null);
  readonly confirmado = output<ContactoSeleccionado>();
  readonly cancelado  = output<void>();

  readonly cargando     = signal(true);
  readonly contactos    = signal<ContactoListaItem[]>([]);
  readonly seleccionado = signal<ContactoListaItem | null>(null);
  /** El cliente sí tenía contactos pero el filtro de exclusión los quitó todos (p. ej. único contacto ya elegido como principal). */
  readonly vacioPorFiltro = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const lista = await this.maestrosSvc.obtenerContactosPorCliente(this.idCliente());
      const excluir = this.excluirIdContacto();
      const filtrada = excluir ? lista.filter(c => c.idContacto !== excluir) : lista;
      const vacioPorFiltroCalc = !!excluir && lista.length > 0 && filtrada.length === 0;
      this.vacioPorFiltro.set(vacioPorFiltroCalc);
      this.contactos.set(filtrada);
      this.cargando.set(false);

      // Si tras aplicar el filtro de exclusión no queda ningún contacto, cerramos el modal
      // automáticamente — no tiene sentido mostrar un listado vacío.
      if (vacioPorFiltroCalc) {
        this.cancelado.emit();
        return;
      }
      if (this.autoSeleccionar() && filtrada.length === 1) {
        // Único contacto disponible: lo aplicamos sin pedir clic.
        this.emitir(filtrada[0]);
      }
    } catch {
      this.cargando.set(false);
    }
  }

  seleccionar(c: ContactoListaItem): void {
    this.seleccionado.set(c);
    this.emitir(c);
  }

  confirmar(): void {
    const s = this.seleccionado();
    if (!s) return;
    this.emitir(s);
  }

  private emitir(c: ContactoListaItem): void {
    this.confirmado.emit({ idContacto: c.idContacto, nombres: c.nombres, cargo: c.cargo });
  }

  cancelar(): void {
    this.cancelado.emit();
  }
}
