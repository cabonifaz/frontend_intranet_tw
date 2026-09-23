import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { ClienteListaItem } from '../../../../core/models/maestros.model';

@Component({
  selector: 'app-lista-clientes',
  imports: [FormsModule],
  templateUrl: './lista-clientes.component.html',
  styleUrl: './lista-clientes.component.scss',
})
export class ListaClientesComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly router      = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal('');
  readonly clientes  = signal<ClienteListaItem[]>([]);

  busqueda = '';
  estadoFiltro = '';

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const lista = await this.maestrosSvc.obtenerClientes(
        this.busqueda || undefined,
        this.estadoFiltro || undefined
      );
      this.clientes.set(lista);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar clientes.');
    } finally {
      this.cargando.set(false);
    }
  }

  irAFicha(idCliente: number): void {
    this.router.navigate(['/maestros/clientes', idCliente]);
  }

  irANuevo(): void {
    this.router.navigate(['/maestros/clientes/nuevo']);
  }

  async toggleEstado(cliente: ClienteListaItem, event: Event): Promise<void> {
    event.stopPropagation();
    const nuevoEstado = cliente.estado === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await this.maestrosSvc.cambiarEstadoCliente({
        idCliente: cliente.idCliente,
        estado: nuevoEstado,
      });
      await this.cargar();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  }
}
