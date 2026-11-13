import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesMetrologiaService } from '../../../../core/services/ordenes-metrologia.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConceptoCatalogoOs } from '../../../../core/models/ordenes-metrologia.model';

/**
 * HU-43 — Modal "Agregar Concepto del Servicio".
 * Ticket #4435: el back filtra por idPropuesta y devuelve UNA FILA POR LÍNEA
 * (idItem como clave única). Si la propuesta tiene el mismo suministro con dos
 * alcances distintos, se muestran dos filas y cada una conserva su alcance.
 */
@Component({
  selector: 'app-modal-agregar-concepto-om',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-agregar-concepto-om.component.html',
  styleUrl: './modal-agregar-concepto-om.component.scss',
})
export class ModalAgregarConceptoOmComponent implements OnInit {
  /** IDs de líneas (idItem) que ya están en la OM actual. */
  readonly itemsYaAgregados   = input<number[]>([]);
  readonly idPropuesta        = input<number | null>(null);

  readonly cerrar    = output<void>();
  readonly agregados = output<ConceptoCatalogoOs[]>();

  private readonly svc   = inject(OrdenesMetrologiaService);
  private readonly toast = inject(ToastService);

  readonly cargando    = signal(true);
  readonly conceptos   = signal<ConceptoCatalogoOs[]>([]);
  readonly seleccionados = signal<Set<number>>(new Set());

  busqueda = '';
  tipoSel = '';

  readonly tipos = computed(() => {
    const set = new Set(this.conceptos().map(c => c.tipo).filter(Boolean) as string[]);
    return [...set].sort();
  });

  readonly conceptosFiltrados = computed(() => {
    const q = this.busqueda.toLowerCase().trim();
    const t = this.tipoSel;
    return this.conceptos().filter(c =>
      (!q || c.codigo.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q))
      && (!t || c.tipo === t),
    );
  });

  readonly conceptosSeleccionados = computed(() =>
    this.conceptos().filter(c => this.seleccionados().has(c.idItem)),
  );

  readonly puedeAgregar = computed(() => this.seleccionados().size > 0);

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.svc.obtenerConceptosCatalogo(this.idPropuesta() ?? undefined);
      const ya = new Set(this.itemsYaAgregados());
      // Ticket #4435: el back garantiza idItem único por cada línea de la propuesta.
      this.conceptos.set(list.map(c => ({ ...c, yaAgregado: ya.has(c.idItem) })));
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo cargar el catálogo.');
    } finally {
      this.cargando.set(false);
    }
  }

  toggle(c: ConceptoCatalogoOs): void {
    if (c.yaAgregado) return;
    const set = new Set(this.seleccionados());
    if (set.has(c.idItem)) set.delete(c.idItem);
    else set.add(c.idItem);
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
