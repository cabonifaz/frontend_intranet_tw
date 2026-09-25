import { Component, OnInit, inject, signal, output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { ClienteListaItem } from '../../../../core/models/maestros.model';

export interface ClienteSeleccionado {
  idCliente:   number;
  razonSocial: string;
  ruc:         string;
}

@Component({
  selector: 'app-seleccionar-cliente',
  imports: [FormsModule],
  templateUrl: './seleccionar-cliente.component.html',
  styleUrl: './seleccionar-cliente.component.scss',
})
export class SeleccionarClienteComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);

  readonly confirmado  = output<ClienteSeleccionado>();
  readonly cancelado   = output<void>();

  readonly cargando     = signal(true);
  readonly clientes     = signal<ClienteListaItem[]>([]);
  readonly seleccionado = signal<ClienteListaItem | null>(null);
  readonly pagina       = signal(1);
  readonly porPagina    = 5;

  readonly totalPaginas = computed(() => Math.ceil(this.clientes().length / this.porPagina) || 1);

  readonly clientesPagina = computed(() => {
    const inicio = (this.pagina() - 1) * this.porPagina;
    return this.clientes().slice(inicio, inicio + this.porPagina);
  });

  get inicio(): number { return this.clientes().length === 0 ? 0 : (this.pagina() - 1) * this.porPagina + 1; }
  get fin():    number { return Math.min(this.pagina() * this.porPagina, this.clientes().length); }

  busqueda     = '';
  estadoFiltro = 'Activo';

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.pagina.set(1);
    try {
      const lista = await this.maestrosSvc.obtenerClientes(
        this.busqueda     || undefined,
        this.estadoFiltro || undefined,
      );
      this.clientes.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  irPagina(n: number): void {
    if (n < 1 || n > this.totalPaginas()) return;
    this.pagina.set(n);
  }

  seleccionar(cliente: ClienteListaItem): void {
    this.seleccionado.set(cliente);
  }

  confirmar(): void {
    const s = this.seleccionado();
    if (!s) return;
    this.confirmado.emit({ idCliente: s.idCliente, razonSocial: s.razonSocial, ruc: s.ruc });
  }

  cancelar(): void {
    this.cancelado.emit();
  }
}
