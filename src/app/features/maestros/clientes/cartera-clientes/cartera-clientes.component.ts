import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { ClienteCartera, ComercialCartera } from '../../../../core/models/maestros.model';
import { ToastService } from '../../../../core/services/toast.service';
import { FiltrosBarComponent }    from '../../../../shared/ui/filtros-bar/filtros-bar.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ModalAsignarComercialComponent } from './modal-asignar-comercial/modal-asignar-comercial.component';

const POR_PAGINA = 20;

/**
 * Cartera de clientes (observación 31/10): el Administrador asigna clientes a los comerciales
 * para que luego aparezcan como "sus" clientes al generar RQ y propuestas. El comercial solo ve
 * los suyos (el back filtra automáticamente por su `IdComercial`).
 */
@Component({
  selector: 'app-cartera-clientes',
  imports: [FormsModule, DatePipe, FiltrosBarComponent, TablaPaginadaComponent, ModalAsignarComercialComponent],
  templateUrl: './cartera-clientes.component.html',
  styleUrl: './cartera-clientes.component.scss',
})
export class CarteraClientesComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly toastSvc    = inject(ToastService);

  readonly cargando     = signal(true);
  readonly error        = signal('');
  readonly clientes     = signal<ClienteCartera[]>([]);
  readonly comerciales  = signal<ComercialCartera[]>([]);
  readonly puedeAsignar = signal(false);
  readonly total        = signal(0);
  readonly pagina       = signal(1);
  readonly porPagina    = POR_PAGINA;

  // Selección masiva — solo visible cuando puedeAsignar.
  readonly seleccionados = signal<Set<number>>(new Set());

  // Filtros
  busqueda = '';
  idComercialFiltro: number | '' = '';
  asignacionFiltro: '' | 'todos' | 'asignados' | 'sin_asignar' = '';

  // Modal "Asignar comercial"
  readonly mostrarModalAsignar = signal(false);
  /** `null` cuando se usa el modal para desasignar. */
  readonly idComercialSugerido = signal<number | null>(null);

  readonly totalKpi = computed(() => this.total());
  readonly totalAsignados    = computed(() => this.comerciales().reduce((acc, c) => acc + c.clientes, 0));
  readonly totalSinAsignar   = computed(() => Math.max(0, this.total() - this.totalAsignados()));
  readonly totalComerciales  = computed(() => this.comerciales().filter(c => c.clientes > 0).length);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(resetPagina = false): Promise<void> {
    if (resetPagina) {
      this.pagina.set(1);
      this.seleccionados.set(new Set());
    }
    this.cargando.set(true);
    this.error.set('');
    try {
      const resultado = await this.maestrosSvc.obtenerCarteraClientes({
        busqueda:    this.busqueda || undefined,
        idComercial: this.idComercialFiltro === '' ? null : Number(this.idComercialFiltro),
        asignacion:  this.asignacionFiltro || undefined,
        pagina:      this.pagina(),
        porPagina:   this.porPagina,
      });
      this.clientes.set(resultado.items);
      this.comerciales.set(resultado.comerciales);
      this.total.set(resultado.total);
      this.puedeAsignar.set(resultado.puedeAsignar);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar la cartera.');
    } finally {
      this.cargando.set(false);
    }
  }

  async irAPagina(p: number): Promise<void> {
    this.pagina.set(p);
    this.seleccionados.set(new Set());
    await this.cargar();
  }

  toggleSeleccion(idCliente: number): void {
    this.seleccionados.update(set => {
      const nuevo = new Set(set);
      if (nuevo.has(idCliente)) nuevo.delete(idCliente);
      else                      nuevo.add(idCliente);
      return nuevo;
    });
  }

  toggleSeleccionTodos(): void {
    const idsPagina = this.clientes().map(c => c.idCliente);
    const todosSeleccionados = idsPagina.length > 0 && idsPagina.every(id => this.seleccionados().has(id));
    this.seleccionados.update(set => {
      const nuevo = new Set(set);
      if (todosSeleccionados) idsPagina.forEach(id => nuevo.delete(id));
      else                    idsPagina.forEach(id => nuevo.add(id));
      return nuevo;
    });
  }

  estanTodosSeleccionados(): boolean {
    const ids = this.clientes().map(c => c.idCliente);
    return ids.length > 0 && ids.every(id => this.seleccionados().has(id));
  }

  abrirModalAsignar(): void {
    if (this.seleccionados().size === 0) return;
    this.idComercialSugerido.set(null);
    this.mostrarModalAsignar.set(true);
  }

  async quitarAsignacionMasiva(): Promise<void> {
    if (this.seleccionados().size === 0) return;
    if (!confirm(`¿Quitar la asignación de ${this.seleccionados().size} cliente(s)? Pasarán a "Sin asignar".`)) return;
    try {
      await this.maestrosSvc.asignarCarteraClientes({
        idComercial: null,
        idsClientes: Array.from(this.seleccionados()),
      });
      this.toastSvc.exito('Asignación quitada.');
      this.seleccionados.set(new Set());
      await this.cargar();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo quitar la asignación.');
    }
  }

  async onConfirmarAsignacion(idComercial: number): Promise<void> {
    try {
      await this.maestrosSvc.asignarCarteraClientes({
        idComercial,
        idsClientes: Array.from(this.seleccionados()),
      });
      const comercial = this.comerciales().find(c => c.id === idComercial);
      this.toastSvc.exito(`${this.seleccionados().size} cliente(s) asignados a ${comercial?.nombre ?? 'comercial'}.`);
      this.seleccionados.set(new Set());
      this.mostrarModalAsignar.set(false);
      await this.cargar();
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo asignar la cartera.');
    }
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.idComercialFiltro = '';
    this.asignacionFiltro = '';
    this.cargar(true);
  }

  /** Cambia el filtro de asignación desde los chips superiores. */
  setAsignacion(valor: '' | 'todos' | 'asignados' | 'sin_asignar'): void {
    if (this.asignacionFiltro === valor) return;
    this.asignacionFiltro = valor;
    this.cargar(true);
  }
}
