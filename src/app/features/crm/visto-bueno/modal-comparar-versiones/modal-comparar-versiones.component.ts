import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import { CompararVersionesData } from '../../../../core/models/visto-bueno.model';

type TabComparar = 'resumen' | 'items' | 'condiciones' | 'equipos' | 'textos';

@Component({
  selector: 'app-modal-comparar-versiones',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-comparar-versiones.component.html',
  styleUrl: './modal-comparar-versiones.component.scss',
})
export class ModalCompararVersionesComponent implements OnInit {
  private readonly svc = inject(VistoBuenoService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();

  readonly cargando = signal(true);
  readonly error    = signal('');
  readonly data     = signal<CompararVersionesData | null>(null);
  readonly tab      = signal<TabComparar>('resumen');

  // IDs seleccionados en los dropdowns
  readonly idBase    = signal<number>(0);
  readonly idDestino = signal<number>(0);

  readonly riesgoClase = computed(() => {
    const r = this.data()?.diferencia.riesgoFinanciero;
    if (r === 'ALTO')     return 'riesgo--alto';
    if (r === 'MODERADO') return 'riesgo--moderado';
    return 'riesgo--bajo';
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const d = await this.svc.obtenerCompararVersiones(this.idPropuesta(), this.idBase() || undefined, this.idDestino() || undefined);
      this.data.set(d);
      this.idBase.set(d.base.idPropuesta);
      this.idDestino.set(d.destino.idPropuesta);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar las versiones.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarVersion(): void {
    this.cargar();
  }

  cambiarTab(t: TabComparar): void { this.tab.set(t); }

  onCerrar(): void { this.cerrar.emit(); }

  formatearMonto(valor: number, simbolo: string): string {
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    return `${simbolo} ${v}`;
  }

  formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  diferenciaClase(): string {
    const d = this.data()?.diferencia.diferenciaTotal ?? 0;
    if (d > 0) return 'diff--positivo';
    if (d < 0) return 'diff--negativo';
    return 'diff--neutro';
  }

  diferenciaSigno(): string {
    const d = this.data()?.diferencia.diferenciaTotal ?? 0;
    return d >= 0 ? '+' : '';
  }
}
