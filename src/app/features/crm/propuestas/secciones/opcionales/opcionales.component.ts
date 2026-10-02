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
  { id: 6627,  codigo: 'OPT-0001', descripcion: 'Impresora térmica de etiquetas con ribbon térmico',   tipo: 'Accesorio',  subtipo: 'Impresión',   precio: 420.00 },
  { id: 13057, codigo: 'OPT-0057', descripcion: 'Certificado INACAL de trazabilidad externa',          tipo: 'Servicio',   subtipo: 'Certificación', precio: 350.00 },
  { id: 6434,  codigo: 'OPT-0034', descripcion: 'Software de registro histórico 1 año licencia',       tipo: 'Software',   subtipo: 'Licencia',    precio: 1200.00 },
  { id: 6628,  codigo: 'OPT-0028', descripcion: 'Capacitación on-site a operadores (4 horas)',         tipo: 'Capacitación', subtipo: 'Técnica',   precio: 580.00 },
  { id: 16959, codigo: 'OPT-0159', descripcion: 'Extensión de garantía a 24 meses adicionales',        tipo: 'Garantía',   subtipo: 'Extendida',   precio: 420.00 },
  { id: 16552, codigo: 'OPT-0152', descripcion: 'Kit de limpieza y mantenimiento preventivo',          tipo: 'Accesorio',  subtipo: 'Mantenimiento', precio: 85.00 },
];

@Component({
  selector: 'app-seccion-opcionales',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent],
  styles: `:host { display: block; }`,
  templateUrl: './opcionales.component.html',
  styleUrl: '../propuesta/propuesta.component.scss',
})
export class OpcionalesComponent {
  readonly draftSvc = inject(PropuestaDraftService);

  readonly catalogo = signal<SumCatalogo[]>(CATALOGO_MOCK);
  readonly catalogoFiltrado = signal<SumCatalogo[]>(CATALOGO_MOCK);
  readonly seleccionado = signal<number | null>(null);
  readonly seleccionadoLinea = signal<number | null>(null);

  readonly lineas = computed(() => this.draftSvc.draft().lineasOpcionales);

  readonly totalDescuento = computed(() =>
    this.lineas().reduce((acc, l) => acc + (l.cantidad * l.frecuencia * l.precioUnitario * l.descuentoPct / 100), 0));

  buscar(q: string): void {
    const query = q.toLowerCase().trim();
    this.catalogoFiltrado.set(
      query ? this.catalogo().filter(c =>
        c.descripcion.toLowerCase().includes(query) || c.codigo.toLowerCase().includes(query)
      ) : this.catalogo()
    );
  }

  agregar(): void {
    const id = this.seleccionado();
    if (id == null) return;
    const sum = this.catalogo().find(c => c.id === id);
    if (!sum) return;
    const nueva: LineaItemPropuesta = {
      idSuministro: sum.id, descripcion: sum.descripcion, alcance: '—',
      ptosCalibracion: '', cantidad: 1, frecuencia: 1, precioUnitario: sum.precio, descuentoPct: 0,
    };
    this.draftSvc.actualizar({ lineasOpcionales: [...this.lineas(), nueva] });
  }

  quitar(): void {
    const idx = this.seleccionadoLinea();
    if (idx == null) return;
    this.draftSvc.actualizar({ lineasOpcionales: this.lineas().filter((_, i) => i !== idx) });
    this.seleccionadoLinea.set(null);
  }

  actualizarLinea(idx: number, campo: keyof LineaItemPropuesta, valor: number | string): void {
    const nuevas = [...this.lineas()];
    nuevas[idx] = { ...nuevas[idx], [campo]: valor } as LineaItemPropuesta;
    this.draftSvc.actualizar({ lineasOpcionales: nuevas });
  }

  subtotalLinea(l: LineaItemPropuesta): number {
    return l.cantidad * l.frecuencia * l.precioUnitario * (1 - l.descuentoPct / 100);
  }

  formato(n: number): string {
    return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
