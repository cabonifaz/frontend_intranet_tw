import { Component, computed, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

type EstadoFila = 'auto' | 'manual' | 'nuevo';
type Tab = 'auto' | 'manual' | 'completa';

interface FilaConciliacion {
  nsXls:            string;
  codigoTwAsignado: string;
  equipo:           string;
  capacidadAlcance: string;
  ubicacion:        string;
  estado:           EstadoFila;
  estadoLabel:      string;
  seleccionado:     boolean;
  esNuevo?:         boolean;
}

/**
 * Modal mock de "Importación XLS con IA" (HU-89).
 * Simula el procesamiento de un archivo Excel con reconocimiento IA de los
 * equipos y su reconciliación contra el catálogo de equipos del cliente.
 * TODO: cuando el back exponga /api/crm/propuestas/{id}/importar-equipos-ia,
 * reemplazar los datos simulados por la respuesta real.
 */
@Component({
  selector: 'app-modal-import-xls-ia',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-import-xls-ia.component.html',
  styleUrl: './modal-import-xls-ia.component.scss',
})
export class ModalImportXlsIaComponent {
  readonly cerrar    = output<void>();
  readonly importado = output<FilaConciliacion[]>();

  readonly archivo = signal<File | null>(null);
  readonly tab     = signal<Tab>('completa');
  readonly importando = signal(false);

  // Datos simulados (mock) para mostrar el flujo visual
  readonly filas = signal<FilaConciliacion[]>([
    { nsXls: 'MT-864429-2023', codigoTwAsignado: 'EQ-TW-2026-0041', equipo: 'Balanza Camiones 80Th', capacidadAlcance: '80 000 kg × 10 kg',  ubicacion: 'Puerta Principal — Sulfuros',       estado: 'auto',   estadoLabel: 'Match 100% Automático', seleccionado: true },
    { nsXls: 'RL-77819-A22',    codigoTwAsignado: 'EQ-TW-2026-0042', equipo: 'Balanza Analítica Sartorius', capacidadAlcance: '220 g × 0.1 mg', ubicacion: 'Laboratorio Químico A',          estado: 'auto',   estadoLabel: 'Match 100% Automático', seleccionado: true },
    { nsXls: 'BC-ANTA-9981-B',  codigoTwAsignado: 'EQ-TW-2026-0038', equipo: 'Báscula Camionera Entrada Norte', capacidadAlcance: '80 000 kg × 10 kg', ubicacion: 'Entrada Norte Muelle A', estado: 'manual', estadoLabel: 'Resuelto Manual (N/S corregido)', seleccionado: true },
    { nsXls: 'BAL-LAB-NUEVA-04',codigoTwAsignado: 'EQ-TW-2026-0043', equipo: 'Balanza Micro Analítica Sartorius Cubis II', capacidadAlcance: '5.1 g × 0.001 mg', ubicacion: 'Laboratorio Central', estado: 'nuevo', estadoLabel: 'Nuevo Registro en Sede', seleccionado: true, esNuevo: true },
    { nsXls: 'PT-5501-M2',      codigoTwAsignado: 'EQ-TW-2026-0044', equipo: 'Pesas Patrón Clase M1 (Juego 20kg)',  capacidadAlcance: '20 kg total',    ubicacion: 'Taller de Mantenimiento',   estado: 'auto',   estadoLabel: 'Match 100% Automático', seleccionado: true },
    { nsXls: 'TC-4402-2022',    codigoTwAsignado: 'EQ-TW-2026-0045', equipo: 'Tolva de Pesaje de Concentrado',       capacidadAlcance: '5 000 kg × 1 kg', ubicacion: 'Planta Concentradora Fase 2', estado: 'auto', estadoLabel: 'Match 98% Automático',  seleccionado: true },
    { nsXls: 'UN1-P150-1029',   codigoTwAsignado: 'EQ-TW-2026-0046', equipo: 'Unidad de Piso Extraplana',            capacidadAlcance: '1 500 kg × 0.5 kg', ubicacion: 'Almacén de Reactivos',     estado: 'auto',   estadoLabel: 'Match 100% Automático', seleccionado: true },
    { nsXls: 'DIN-CRANE-7786',  codigoTwAsignado: 'EQ-TW-2026-0047', equipo: 'Dinamómetro Digital Grúa',             capacidadAlcance: '10 000 kg × 5 kg', ubicacion: 'Maestranza y Bahía Minera', estado: 'auto', estadoLabel: 'Match 98% Automático',  seleccionado: true },
  ]);

  readonly totalAuto    = computed(() => this.filas().filter(f => f.estado === 'auto').length);
  readonly totalManual  = computed(() => this.filas().filter(f => f.estado === 'manual').length);
  readonly totalNuevo   = computed(() => this.filas().filter(f => f.estado === 'nuevo').length);
  readonly totalResueltos = computed(() => this.filas().length);
  readonly totalFilas     = computed(() => this.filas().length);
  readonly totalSeleccionados = computed(() => this.filas().filter(f => f.seleccionado).length);

  readonly progresoAuto   = computed(() => Math.round((this.totalAuto() / this.totalFilas()) * 100));
  readonly progresoManual = computed(() => Math.round((this.totalManual() / this.totalFilas()) * 100));

  readonly filasFiltradas = computed(() => {
    const t = this.tab();
    if (t === 'auto')     return this.filas().filter(f => f.estado === 'auto');
    if (t === 'manual')   return this.filas().filter(f => f.estado === 'manual');
    return this.filas();
  });

  onArchivoSeleccionado(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.archivo.set(f);
  }

  cambiarTab(t: Tab): void { this.tab.set(t); }

  toggleFila(fila: FilaConciliacion): void {
    this.filas.update(l => l.map(f => f === fila ? { ...f, seleccionado: !f.seleccionado } : f));
  }

  toggleTodos(valor: boolean): void {
    this.filas.update(l => l.map(f => ({ ...f, seleccionado: valor })));
  }

  async importar(): Promise<void> {
    const sel = this.filas().filter(f => f.seleccionado);
    if (sel.length === 0) return;
    this.importando.set(true);
    // Simulación de llamada
    await new Promise(r => setTimeout(r, 600));
    this.importando.set(false);
    this.importado.emit(sel);
  }

  descargarReporte(): void {
    // Mock: en real descargaría un XLS con el reporte de conciliación
  }

  onCerrar(): void { this.cerrar.emit(); }

  claseEstado(e: EstadoFila): string {
    return 'estado--' + e;
  }
}
