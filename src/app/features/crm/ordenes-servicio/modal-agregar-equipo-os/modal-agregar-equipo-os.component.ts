import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EquipoCatalogoClienteOs } from '../../../../core/models/ordenes-servicio.model';

type TabModal = 'propuesta' | 'todos';

/**
 * HU-43 — Modal "Agregar Equipo / Instrumento".
 * 2 tabs: "De la propuesta" (precargados) + "Todos del cliente" (catálogo completo).
 */
@Component({
  selector: 'app-modal-agregar-equipo-os',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-agregar-equipo-os.component.html',
  styleUrl: './modal-agregar-equipo-os.component.scss',
})
export class ModalAgregarEquipoOsComponent implements OnInit {
  readonly idCliente           = input.required<number>();
  readonly idPropuesta         = input<number | null>(null);
  readonly razonSocial         = input<string>('');
  readonly idsEquiposAgregados = input<number[]>([]);

  readonly cerrar    = output<void>();
  readonly agregados = output<EquipoCatalogoClienteOs[]>();

  private readonly svc   = inject(OrdenesServicioService);
  private readonly toast = inject(ToastService);

  readonly cargando    = signal(true);
  readonly equipos     = signal<EquipoCatalogoClienteOs[]>([]);
  readonly seleccionados = signal<Set<number>>(new Set());
  readonly tab         = signal<TabModal>('propuesta');

  busqueda = '';
  tipoSel: string = '';
  ubicacionSel: string = '';

  readonly ubicaciones = computed(() => {
    const set = new Set(this.equipos().map(e => e.ubicacion).filter(Boolean) as string[]);
    return [...set].sort();
  });

  readonly equiposDePropuesta = computed(() =>
    this.equipos().filter(e => e.deLaPropuesta),
  );

  readonly equiposFiltrados = computed(() => {
    const q = this.busqueda.toLowerCase().trim();
    const base = this.tab() === 'propuesta' ? this.equiposDePropuesta() : this.equipos();
    return base.filter(e =>
      (!q || e.codigoTw.toLowerCase().includes(q) || e.marca.toLowerCase().includes(q) ||
             e.modelo.toLowerCase().includes(q) || e.numSerie.toLowerCase().includes(q))
      && (!this.tipoSel || e.clasificacion === this.tipoSel)
      && (!this.ubicacionSel || e.ubicacion === this.ubicacionSel),
    );
  });

  readonly equiposSeleccionados = computed(() =>
    this.equipos().filter(e => this.seleccionados().has(e.idEquipo)),
  );

  readonly puedeAgregar = computed(() => this.seleccionados().size > 0);

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.svc.obtenerEquiposCatalogoCliente(this.idCliente(), this.idPropuesta() ?? undefined);
      const ya = this.idsEquiposAgregados();
      this.equipos.set(list.map(e => ({ ...e, yaAgregado: ya.includes(e.idEquipo) })));
      if (this.equiposDePropuesta().length === 0) this.tab.set('todos');
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo cargar el catálogo del cliente.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: TabModal): void {
    this.tab.set(t);
    this.tipoSel = '';
    this.ubicacionSel = '';
    this.busqueda = '';
  }

  toggle(e: EquipoCatalogoClienteOs): void {
    if (e.yaAgregado) return;
    const set = new Set(this.seleccionados());
    if (set.has(e.idEquipo)) set.delete(e.idEquipo);
    else set.add(e.idEquipo);
    this.seleccionados.set(set);
  }

  limpiarSeleccion(): void {
    this.seleccionados.set(new Set());
  }

  agregar(): void {
    const lista = this.equiposSeleccionados();
    if (lista.length === 0) return;
    this.agregados.emit(lista);
  }

  onCerrar(): void { this.cerrar.emit(); }

  claseChipTipo(c: string): string {
    return c === 'equipo' ? 'chip-info chip-info--azul' : 'chip-info chip-info--morado';
  }
}
