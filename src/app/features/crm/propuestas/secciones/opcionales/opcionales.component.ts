import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PropuestaDraftService } from '../../../../../core/services/propuesta-draft.service';
import { SuministrosService } from '../../../../../core/services/suministros.service';
import { LineaItemPropuesta } from '../../../../../core/models/propuesta-detalle.model';
import { SeccionComponent } from '../../../../../shared/ui/seccion/seccion.component';
import { DoblePanelComponent } from '../../../../../shared/ui/doble-panel/doble-panel.component';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';

interface SumCatalogo {
  id:          number;
  codigo:      string;
  descripcion: string;
  tipo:        string;
  subtipo:     string;
  precio:      number;
}

@Component({
  selector: 'app-seccion-opcionales',
  imports: [FormsModule, SeccionComponent, DoblePanelComponent, ButtonComponent],
  styles: `:host { display: block; }`,
  templateUrl: './opcionales.component.html',
  styleUrl: '../propuesta/propuesta.component.scss',
})
export class OpcionalesComponent implements OnInit {
  readonly draftSvc        = inject(PropuestaDraftService);
  private readonly sumsSvc = inject(SuministrosService);

  readonly catalogo         = signal<SumCatalogo[]>([]);
  readonly catalogoFiltrado = signal<SumCatalogo[]>([]);
  readonly cargandoCatalogo = signal(false);
  readonly seleccionado      = signal<number | null>(null);
  readonly seleccionadoLinea = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    this.cargandoCatalogo.set(true);
    try {
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
    } catch { /* silencioso */ }
    finally { this.cargandoCatalogo.set(false); }
  }

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

  actualizarDescuentoOpcionales(valor: number): void {
    this.draftSvc.actualizar({ descuentoOpcionales: valor > 0 ? valor : null });
  }

  formato(n: number): string {
    return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
