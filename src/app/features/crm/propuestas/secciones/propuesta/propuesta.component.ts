import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { LineaItemPropuesta } from '../../../../../core/models/propuesta-detalle.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';

interface SumCatalogo {
  id:       number;
  codigo:   string;
  descripcion: string;
  tipo:     string;
  subtipo:  string;
  precio:   number;
}

const CATALOGO_MOCK: SumCatalogo[] = [
  { id: 6627,  codigo: 'SUM-0001', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-6000', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 150.00 },
  { id: 13057, codigo: 'SUM-0057', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-15KG', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 850.00 },
  { id: 6434,  codigo: 'SUM-0034', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-2000', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 420.00 },
  { id: 6628,  codigo: 'SUM-0028', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-300',  tipo: 'Balanza', subtipo: 'Laboratorio', precio: 580.00 },
  { id: 16959, codigo: 'SUM-0159', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-6000', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 320.00 },
  { id: 16552, codigo: 'SUM-0152', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-6300', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 85.00 },
  { id: 8679,  codigo: 'SUM-0079', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-6600', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 290.00 },
  { id: 11640, codigo: 'SUM-0140', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo EK-180A', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 390.00 },
  { id: 8723,  codigo: 'SUM-0123', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo FX-1200', tipo: 'Balanza', subtipo: 'Laboratorio', precio: 450.00 },
  { id: 9980,  codigo: 'SUM-0180', descripcion: 'Suministro Balanza Laboratorio Marca AND Modelo FX-120',  tipo: 'Balanza', subtipo: 'Laboratorio', precio: 230.00 },
];

@Component({
  selector: 'app-seccion-propuesta',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent],
  templateUrl: './propuesta.component.html',
  styleUrl: './propuesta.component.scss',
})
export class PropuestaComponent {
  readonly draftSvc = inject(PropuestaDraftService);

  readonly catalogo = signal<SumCatalogo[]>(CATALOGO_MOCK);
  readonly catalogoFiltrado = signal<SumCatalogo[]>(CATALOGO_MOCK);
  readonly seleccionado = signal<number | null>(null);
  readonly seleccionadoLinea = signal<number | null>(null);

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
