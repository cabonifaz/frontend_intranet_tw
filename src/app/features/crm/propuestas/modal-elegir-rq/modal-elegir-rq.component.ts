import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../../core/services/crm.service';
import { RequerimientoListaItem } from '../../../../core/models/crm.model';

@Component({
  selector: 'app-modal-elegir-rq',
  imports: [FormsModule],
  templateUrl: './modal-elegir-rq.component.html',
  styleUrl: './modal-elegir-rq.component.scss',
})
export class ModalElegirRqComponent implements OnInit {
  private readonly crmSvc = inject(CrmService);

  readonly cerrar       = output<void>();
  readonly seleccionado = output<number>();   // emite idRequerimiento

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly items    = signal<RequerimientoListaItem[]>([]);
  readonly busqueda = signal('');
  readonly elegido  = signal<number | null>(null);

  readonly filtrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter(i =>
      i.numero.toLowerCase().includes(q) ||
      i.razonSocial.toLowerCase().includes(q) ||
      (i.ruc ?? '').includes(q)
    );
  });

  async ngOnInit(): Promise<void> {
    try {
      // Traer los RQ abiertos (nuevos + en proceso). El listado max se filtrará en cliente.
      const r = await this.crmSvc.obtenerRequerimientos(undefined, undefined, 1, 100);
      // Solo los que admiten crear propuesta — excluimos CERRADO y ANULADO.
      const admiten = r.items.filter(i => !['cerrado', 'anulado'].includes(i.estado?.toLowerCase?.() ?? ''));
      this.items.set(admiten);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar requerimientos.');
    } finally {
      this.cargando.set(false);
    }
  }

  confirmar(): void {
    const id = this.elegido();
    if (id != null) this.seleccionado.emit(id);
  }

  formatearFecha(f: string): string {
    try { return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return f; }
  }
}
