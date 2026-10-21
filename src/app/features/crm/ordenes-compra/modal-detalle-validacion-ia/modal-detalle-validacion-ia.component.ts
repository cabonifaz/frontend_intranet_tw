import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { ValidacionOrdenCompraDto } from '../../../../core/models/ordenes-compra.model';

type Tab = 'comparacion' | 'historial' | 'insights';

/**
 * HU-24 — Modal Detalle de Validación por IA.
 * 3 tabs: Comparación (campos y conceptos), Historial (corridas), Insights IA (explicaciones Gemini).
 */
@Component({
  selector: 'app-modal-detalle-validacion-ia',
  imports: [CommonModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-detalle-validacion-ia.component.html',
  styleUrl: './modal-detalle-validacion-ia.component.scss',
})
export class ModalDetalleValidacionIaComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc        = input.required<number>();
  readonly idPropuesta = input.required<number>();
  readonly numeroOc    = input.required<string>();

  readonly cerrar = output<void>();

  readonly tab         = signal<Tab>('comparacion');
  readonly cargando    = signal(true);
  readonly datos       = signal<ValidacionOrdenCompraDto | null>(null);
  readonly revalidando = signal(false);
  readonly idPropuestaActual = signal<number | null>(null);

  readonly cabecera = computed(() => this.datos()?.cabecera ?? null);

  readonly subtitulo = computed(() => {
    const c = this.cabecera();
    if (!c) return '';
    return `${this.numeroOc()} vs ${c.numeroPropuesta} v${c.versionPropuesta}`;
  });

  /** Filtra campos de la propuesta actualmente seleccionada en el pill. */
  readonly campos = computed(() => {
    const d = this.datos();
    const id = this.idPropuestaActual();
    if (!d) return [];
    return id ? d.campos.filter(c => c.idPropuesta === id) : d.campos;
  });

  readonly conceptos = computed(() => this.datos()?.conceptos ?? []);
  readonly insights  = computed(() => this.datos()?.insights ?? []);
  readonly historial = computed(() => this.datos()?.historial ?? []);
  readonly pills     = computed(() => this.datos()?.propuestas ?? []);

  constructor() {
    effect(() => {
      const id = this.idOc();
      const idP = this.idPropuesta();
      if (id > 0 && idP > 0) {
        this.idPropuestaActual.set(idP);
        void this.cargar(idP);
      }
    });
  }

  onCerrar(): void { this.cerrar.emit(); }

  cambiarTab(t: Tab): void { this.tab.set(t); }

  seleccionarPill(idPropuesta: number): void {
    this.idPropuestaActual.set(idPropuesta);
    void this.cargar(idPropuesta);
  }

  async revalidar(): Promise<void> {
    const id = this.idPropuestaActual();
    this.revalidando.set(true);
    try {
      await this.svc.revalidar(this.idOc(), id);
      await this.cargar(id);
      this.toast.exito('Re-validación IA ejecutada.');
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo revalidar.');
    } finally {
      this.revalidando.set(false);
    }
  }

  private async cargar(idPropuesta: number | null): Promise<void> {
    this.cargando.set(true);
    try {
      const d = await this.svc.obtenerValidacion(this.idOc(), idPropuesta);
      this.datos.set(d);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la validación.');
    } finally {
      this.cargando.set(false);
    }
  }

  iconoSeveridad(sev: string): string {
    switch (sev) {
      case 'ok':          return 'check_circle';
      case 'advertencia': return 'warning';
      case 'critico':     return 'error';
      default:            return 'help';
    }
  }

  claseSeveridad(sev: string): string {
    switch (sev) {
      case 'ok':          return 'chip-severidad--ok';
      case 'advertencia': return 'chip-severidad--advertencia';
      case 'critico':     return 'chip-severidad--critica';
      default:            return 'chip-severidad--neutro';
    }
  }
}
