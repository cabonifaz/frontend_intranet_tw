import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { SuministrosService } from '../../../../../core/services/suministros.service';
import { LineaItemPropuesta } from '../../../../../core/models/propuesta-detalle.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';
import { ModalDescuentoGlobalComponent } from '../../modal-descuento-global/modal-descuento-global.component';
import { DescuentoResultado } from '../../../../../core/models/propuesta-modales.model';

interface SumCatalogo {
  id:          number;
  codigo:      string;
  descripcion: string;
  tipo:        string;
  subtipo:     string;
  precio:      number;
}

@Component({
  selector: 'app-seccion-propuesta',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent, ButtonComponent, ModalDescuentoGlobalComponent],
  templateUrl: './propuesta.component.html',
  styleUrl: './propuesta.component.scss',
})
export class PropuestaComponent implements OnInit {
  readonly draftSvc        = inject(PropuestaDraftService);
  private readonly sumsSvc = inject(SuministrosService);

  readonly catalogo         = signal<SumCatalogo[]>([]);
  readonly catalogoFiltrado = signal<SumCatalogo[]>([]);
  readonly cargandoCatalogo = signal(false);
  readonly seleccionado      = signal<number | null>(null);
  readonly seleccionadoLinea = signal<number | null>(null);
  readonly modalDescuentoAbierto = signal(false);

  abrirModalDescuento(): void {
    if (!this.draftSvc.draft().idPropuesta) return;
    this.modalDescuentoAbierto.set(true);
  }
  cerrarModalDescuento(): void { this.modalDescuentoAbierto.set(false); }

  onDescuentoAplicado(r: DescuentoResultado): void {
    // Sincroniza el draft con lo que vuelve del back (persistido).
    this.draftSvc.actualizar({
      descuentoPct:      r.porcentaje ?? null,
      descuentoMonto:    r.tipo === 'monto' ? r.descuentoNuevo : null,
      idMotivoDescuento: r.idMotivoDescuento ?? null,
    });
    this.cerrarModalDescuento();
  }

  async ngOnInit(): Promise<void> {
    this.cargandoCatalogo.set(true);
    try {
      // Solo suministros activos y marcados "usar en propuestas".
      const r = await this.sumsSvc.obtenerSuministros(undefined, undefined, undefined, 'Activo', true, 1, 200);
      const items: SumCatalogo[] = r.items.map(s => ({
        id:          s.idSuministro,
        codigo:      `SUM-${String(s.idSuministro).padStart(4, '0')}`,
        descripcion: s.descripcion,
        tipo:        s.tipoLabel    ?? '',
        subtipo:     s.subtipoLabel ?? '',
        precio:      0,
      }));
      this.catalogo.set(items);
      this.catalogoFiltrado.set(items);
    } catch { /* silencioso: el usuario puede reintentar con el buscador */ }
    finally { this.cargandoCatalogo.set(false); }
  }

  readonly lineas = computed(() => this.draftSvc.draft().lineasPropuesta);

  readonly totalDescuento = computed(() =>
    this.lineas().reduce((acc, l) => acc + (l.cantidad * l.frecuencia * l.precioUnitario * l.descuentoPct / 100), 0));

  buscar(q: string): void {
    const query = q.toLowerCase().trim();
    this.catalogoFiltrado.set(
      query ? this.catalogo().filter(c =>
        c.descripcion.toLowerCase().includes(query) ||
        c.codigo.toLowerCase().includes(query) ||
        c.tipo.toLowerCase().includes(query)
      ) : this.catalogo()
    );
  }

  agregar(): void {
    const id = this.seleccionado();
    if (id == null) return;
    const sum = this.catalogo().find(c => c.id === id);
    if (!sum) return;

    const nueva: LineaItemPropuesta = {
      idSuministro:    sum.id,
      descripcion:     sum.descripcion,
      alcance:         '—',
      ptosCalibracion: '',
      cantidad:        1,
      frecuencia:      1,
      precioUnitario:  sum.precio,
      descuentoPct:    0,
    };
    this.draftSvc.actualizar({
      lineasPropuesta: [...this.lineas(), nueva],
    });
  }

  quitar(): void {
    const idx = this.seleccionadoLinea();
    if (idx == null) return;
    const nuevas = this.lineas().filter((_, i) => i !== idx);
    this.draftSvc.actualizar({ lineasPropuesta: nuevas });
    this.seleccionadoLinea.set(null);
  }

  actualizarLinea(idx: number, campo: keyof LineaItemPropuesta, valor: number | string): void {
    const nuevas = [...this.lineas()];
    nuevas[idx] = { ...nuevas[idx], [campo]: valor } as LineaItemPropuesta;
    this.draftSvc.actualizar({ lineasPropuesta: nuevas });
  }

  subtotalLinea(l: LineaItemPropuesta): number {
    return l.cantidad * l.frecuencia * l.precioUnitario * (1 - l.descuentoPct / 100);
  }

  actualizarDescuentoGlobal(tipo: 'pct' | 'monto', valor: number): void {
    if (tipo === 'pct') {
      this.draftSvc.actualizar({
        descuentoPct:   valor > 0 ? valor : null,
        descuentoMonto: valor > 0 ? null : this.draftSvc.draft().descuentoMonto,
      });
    } else {
      this.draftSvc.actualizar({
        descuentoMonto: valor > 0 ? valor : null,
        descuentoPct:   null,
      });
    }
  }

  formato(n: number): string {
    return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
