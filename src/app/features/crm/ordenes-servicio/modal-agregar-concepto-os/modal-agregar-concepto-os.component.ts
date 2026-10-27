import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConceptoCatalogoOs } from '../../../../core/models/ordenes-servicio.model';

type TabModal = 'propuesta' | 'todos';

/**
 * HU-43 — Modal "Agregar Concepto del Servicio".
 * 2 tabs: "De la propuesta" (precargados) + "Todos" (catálogo maestros completo).
 */
@Component({
  selector: 'app-modal-agregar-concepto-os',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-agregar-concepto-os.component.html',
  styleUrl: './modal-agregar-concepto-os.component.scss',
})
export class ModalAgregarConceptoOsComponent implements OnInit {
  readonly codigosYaAgregados = input<string[]>([]);
  readonly idPropuesta        = input<number | null>(null);

  readonly cerrar    = output<void>();
  readonly agregados = output<ConceptoCatalogoOs[]>();

  private readonly svc   = inject(OrdenesServicioService);
  private readonly toast = inject(ToastService);

  readonly cargando    = signal(true);
  readonly conceptos   = signal<ConceptoCatalogoOs[]>([]);
  readonly seleccionados = signal<Set<number>>(new Set());
  readonly tab         = signal<TabModal>('propuesta');

  busqueda = '';
  tipoSel = '';

  readonly tipos = computed(() => {
    const set = new Set(this.conceptos().map(c => c.tipo).filter(Boolean) as string[]);
    return [...set].sort();
  });

  readonly conceptosDePropuesta = computed(() =>
    this.conceptos().filter(c => c.deLaPropuesta),
  );

  readonly conceptosFiltrados = computed(() => {
    const q = this.busqueda.toLowerCase().trim();
    const t = this.tipoSel;
    const base = this.tab() === 'propuesta' ? this.conceptosDePropuesta() : this.conceptos();
    return base.filter(c =>
      (!q || c.codigo.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q))
      && (!t || c.tipo === t),
    );
  });

  readonly conceptosSeleccionados = computed(() =>
    this.conceptos().filter(c => this.seleccionados().has(c.idSuministro)),
  );

  readonly puedeAgregar = computed(() => this.seleccionados().size > 0);

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.svc.obtenerConceptosCatalogo(this.idPropuesta() ?? undefined);
      const ya = this.codigosYaAgregados();
      this.conceptos.set(list.map(c => ({ ...c, yaAgregado: ya.includes(c.codigo) })));
      // Si hay conceptos de la propuesta, por default arranco en ese tab; si no, salto a "todos"
      if (this.conceptosDePropuesta().length === 0) this.tab.set('todos');
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo cargar el catálogo.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: TabModal): void {
    this.tab.set(t);
    this.tipoSel = '';
    this.busqueda = '';
  }

  toggle(c: ConceptoCatalogoOs): void {
    if (c.yaAgregado) return;
    const set = new Set(this.seleccionados());
    if (set.has(c.idSuministro)) set.delete(c.idSuministro);
    else set.add(c.idSuministro);
    this.seleccionados.set(set);
  }

  limpiarSeleccion(): void {
    this.seleccionados.set(new Set());
  }

  agregar(): void {
    const lista = this.conceptosSeleccionados();
    if (lista.length === 0) return;
    this.agregados.emit(lista);
  }

  onCerrar(): void { this.cerrar.emit(); }
}
