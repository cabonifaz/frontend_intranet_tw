import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import { ComparacionVersiones, VersionDisponible } from '../../../../core/models/visto-bueno.model';

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
  readonly data     = signal<ComparacionVersiones | null>(null);
  readonly tab      = signal<TabComparar>('resumen');

  readonly idBase    = signal<number>(0);
  readonly idDestino = signal<number>(0);

  readonly riesgoClase = computed(() => {
    const r = this.data()?.resumen.riesgoFinanciero;
    if (r === 'ALTO')     return 'riesgo--alto';
    if (r === 'MODERADO') return 'riesgo--moderado';
    return 'riesgo--bajo';
  });

  async ngOnInit(): Promise<void> {
    await this.cargarDisponibles();
  }

  /**
   * Primera carga: el back no sabe cuáles versiones queremos.
   * Pedimos la propuesta actual como `destino` y la versión anterior como `base` (si existe).
   */
  private async cargarDisponibles(): Promise<void> {
    this.cargando.set(true);
    try {
      // Hacemos una llamada "espejo" primero (base=destino=idPropuesta) para obtener la lista de versiones disponibles
      const inicial = await this.svc.compararVersiones(this.idPropuesta(), this.idPropuesta());
      const vers = inicial.versiones;
      // Elegir destino = la actual, base = la anterior más cercana
      const destino = vers.find(v => v.idPropuesta === this.idPropuesta()) ?? vers[0];
      const base    = this.encontrarAnterior(vers, destino) ?? destino;
      this.idBase.set(base.idPropuesta);
      this.idDestino.set(destino.idPropuesta);
      // Si base y destino son distintos, hacer la comparación real
      if (base.idPropuesta !== destino.idPropuesta) {
        const comp = await this.svc.compararVersiones(base.idPropuesta, destino.idPropuesta);
        this.data.set(comp);
      } else {
        this.data.set(inicial);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar las versiones.');
    } finally {
      this.cargando.set(false);
    }
  }

  private encontrarAnterior(vers: VersionDisponible[], destino: VersionDisponible): VersionDisponible | undefined {
    const ordenadas = [...vers].sort((a, b) => b.version - a.version);
    return ordenadas.find(v => v.version < destino.version);
  }

  async cambiarVersion(): Promise<void> {
    if (!this.idBase() || !this.idDestino()) return;
    this.cargando.set(true);
    try {
      const d = await this.svc.compararVersiones(this.idBase(), this.idDestino());
      this.data.set(d);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar las versiones.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: TabComparar): void { this.tab.set(t); }

  onCerrar(): void { this.cerrar.emit(); }

  formatearMonto(valor: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    return `${s} ${v}`;
  }

  formatearFecha(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  diferenciaClase(): string {
    const d = this.data()?.resumen.diferenciaTotal ?? 0;
    if (d > 0) return 'diff--positivo';
    if (d < 0) return 'diff--negativo';
    return 'diff--neutro';
  }

  diferenciaSigno(): string {
    const d = this.data()?.resumen.diferenciaTotal ?? 0;
    return d >= 0 ? '+' : '';
  }
}
