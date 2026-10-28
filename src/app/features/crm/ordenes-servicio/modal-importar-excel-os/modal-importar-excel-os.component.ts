import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  AnalisisImportacionOsOm,
  EstrategiaMergeImportacion,
} from '../../../../core/models/ordenes-servicio.model';

type Paso = 1 | 2 | 3 | 4;
type TabPreview = 'equipos' | 'conceptos';

/**
 * HU-44 — Modal "Importar Equipos y Conceptos desde Excel".
 * Flujo con stepper de 4 pasos: Plantilla → Subir → Previsualizar → Confirmar.
 * NO usa IA: plantilla oficial estructurada.
 */
@Component({
  selector: 'app-modal-importar-excel-os',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-importar-excel-os.component.html',
  styleUrl: './modal-importar-excel-os.component.scss',
})
export class ModalImportarExcelOsComponent {
  readonly idCliente = input.required<number>();
  /** OS existente — opcional, solo si estamos editando una ya guardada. */
  readonly idOs      = input<number | null>(null);
  /** Códigos TW de los equipos cotizados en la propuesta — para marcar "En propuesta: Sí". */
  readonly codigosTwDePropuesta       = input<string[]>([]);
  /** Códigos de los conceptos cotizados en la propuesta — para marcar "En propuesta: Sí". */
  readonly codigosConceptosDePropuesta = input<string[]>([]);
  readonly cerrar     = output<void>();
  readonly importado = output<{ analisis: AnalisisImportacionOsOm; estrategia: EstrategiaMergeImportacion }>();

  private readonly svc   = inject(OrdenesServicioService);
  private readonly toast = inject(ToastService);

  readonly paso         = signal<Paso>(1);
  readonly archivo      = signal<File | null>(null);
  readonly analizando   = signal(false);
  readonly analisis     = signal<AnalisisImportacionOsOm | null>(null);
  readonly confirmando  = signal(false);
  readonly arrastrando  = signal(false);
  readonly tabPreview   = signal<TabPreview>('equipos');
  readonly estrategia   = signal<EstrategiaMergeImportacion>('fusionar');

  /**
   * Cuántos equipos y conceptos se van a importar efectivamente
   * (ignoramos los errores — los OK sí, los ambar también).
   */
  readonly equiposImportables = computed(
    () => this.analisis()?.equipos.filter(e => e.estado !== 'error') ?? [],
  );
  readonly conceptosImportables = computed(
    () => this.analisis()?.conceptos.filter(c => c.estado !== 'error') ?? [],
  );

  /** Habilitado cuando hay al menos 1 fila válida (y la estrategia no es cancelar). */
  readonly puedeConfirmar = computed(() =>
    this.analisis() != null
    && (this.equiposImportables().length + this.conceptosImportables().length) > 0
    && this.estrategia() !== 'cancelar',
  );

  /** Sets para marcado rápido "En propuesta: Sí/No". */
  readonly setCodigosTwPropuesta = computed(() => new Set(this.codigosTwDePropuesta()));
  readonly setCodigosConceptosPropuesta = computed(() => new Set(this.codigosConceptosDePropuesta()));

  esTwDePropuesta(codigoTw: string): boolean {
    return this.setCodigosTwPropuesta().has(codigoTw);
  }
  esConceptoDePropuesta(codigo: string): boolean {
    return this.setCodigosConceptosPropuesta().has(codigo);
  }

  async descargarPlantilla(): Promise<void> {
    try {
      const blob = await this.svc.descargarPlantillaImportOs();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_OS_Equipos_Conceptos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      this.toast.exito('Plantilla descargada.');
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo descargar la plantilla.');
    }
  }

  onDragOver(evt: DragEvent): void {
    evt.preventDefault(); evt.stopPropagation();
    this.arrastrando.set(true);
  }

  onDragLeave(evt: DragEvent): void {
    evt.preventDefault(); evt.stopPropagation();
    this.arrastrando.set(false);
  }

  onDrop(evt: DragEvent): void {
    evt.preventDefault(); evt.stopPropagation();
    this.arrastrando.set(false);
    const f = evt.dataTransfer?.files?.[0];
    if (f) this.subirArchivo(f);
  }

  onArchivoSel(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.subirArchivo(f);
    input.value = '';
  }

  private async subirArchivo(f: File): Promise<void> {
    const ok = ['.xlsx', '.xls'].some(ext => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      this.toast.error('Formato inválido. Solo .xlsx o .xls.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      this.toast.error('El archivo supera 5 MB.');
      return;
    }

    this.archivo.set(f);
    this.paso.set(2);
    this.analizando.set(true);
    try {
      const r = await this.svc.analizarImportOs(f, this.idCliente(), this.idOs());
      this.analisis.set(r);
      this.paso.set(3);
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo analizar el archivo.');
      this.paso.set(1);
    } finally {
      this.analizando.set(false);
    }
  }

  cambiarArchivo(): void {
    this.archivo.set(null);
    this.analisis.set(null);
    this.paso.set(1);
  }

  async confirmar(): Promise<void> {
    if (!this.puedeConfirmar()) return;
    const a = this.analisis();
    if (!a) return;
    this.confirmando.set(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const equiposOk    = this.equiposImportables();
      const conceptosOk  = this.conceptosImportables();
      const equiposError = a.equipos.length - equiposOk.length;
      const conceptosError = a.conceptos.length - conceptosOk.length;

      // Entregamos a la ficha solo las filas sin error — las filas con error
      // se ignoran silenciosamente (se avisa al usuario en el toast).
      const analisisFiltrado: AnalisisImportacionOsOm = {
        ...a,
        equipos:   equiposOk,
        conceptos: conceptosOk,
        totalEquipos:          equiposOk.length,
        totalConceptos:        conceptosOk.length,
        resumenEquiposErrores: 0,
      };

      const partesToast: string[] = [
        `${equiposOk.length} equipos + ${conceptosOk.length} conceptos`,
        this.estrategia() === 'fusionar' ? 'fusionados' : 'reemplazados',
      ];
      if (equiposError + conceptosError > 0) {
        partesToast.push(`(${equiposError + conceptosError} con error ignorados)`);
      }
      this.toast.exito('Importado: ' + partesToast.join(' '));

      this.importado.emit({ analisis: analisisFiltrado, estrategia: this.estrategia() });
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo confirmar la importación.');
    } finally {
      this.confirmando.set(false);
    }
  }

  cambiarTab(t: TabPreview): void { this.tabPreview.set(t); }

  onCerrar(): void { this.cerrar.emit(); }

  claseEstadoFila(estado: string): string {
    return 'chip-info chip-info--' + (estado === 'ok' ? 'verde' : estado === 'advertencia' ? 'ambar' : 'rojo');
  }

  iconoEstadoFila(estado: string): string {
    return estado === 'ok' ? '✓' : estado === 'advertencia' ? '⚠' : '✕';
  }
}
