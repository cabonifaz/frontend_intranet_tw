import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalEditarFilaImportacionComponent } from '../modal-editar-fila-importacion/modal-editar-fila-importacion.component';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  AnalisisImportacionEquipos,
  AccionImportacion,
  EstadoFilaImportacion,
  FilaConfirmarImportacion,
  FilaImportacionEquipo,
  ResultadoImportacionEquipos,
} from '../../../../core/models/importacion-equipos.model';

type Tab = 'auto' | 'manual' | 'completa';

/**
 * HU-89 — Importación masiva de equipos desde Excel con IA.
 * Flujo:
 *   1) subir Excel → POST /equipos/importacion/analizar (back lee, concilia, no guarda)
 *   2) el comercial revisa la vista previa y marca qué filas importar
 *   3) POST /equipos/importacion/confirmar → crea los nuevos en el inventario del cliente
 *      y devuelve la lista final para agregar al listado de equipos de la propuesta.
 */
@Component({
  selector: 'app-modal-import-xls-ia',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, ModalEditarFilaImportacionComponent],
  templateUrl: './modal-import-xls-ia.component.html',
  styleUrl: './modal-import-xls-ia.component.scss',
})
export class ModalImportXlsIaComponent {
  // ─── Inputs ──────────────────────────────────────────────────────────────
  readonly idCliente             = input.required<number>();
  readonly idSede                = input<number | null>(null);
  readonly idsEquipoEnPropuesta  = input<number[]>([]);
  readonly seriesEnPropuesta     = input<string[]>([]);

  // ─── Outputs ─────────────────────────────────────────────────────────────
  readonly cerrar    = output<void>();
  readonly importado = output<ResultadoImportacionEquipos>();

  private readonly svc   = inject(PropuestasService);
  private readonly toast = inject(ToastService);

  // ─── Estado ──────────────────────────────────────────────────────────────
  readonly archivo             = signal<File | null>(null);
  readonly analisis            = signal<AnalisisImportacionEquipos | null>(null);
  readonly filas               = signal<FilaImportacionEquipo[]>([]);
  readonly analizando          = signal(false);
  readonly confirmando         = signal(false);
  readonly descargandoReporte  = signal(false);
  readonly descargandoPlantilla = signal(false);
  readonly tab                 = signal<Tab>('completa');
  readonly error               = signal<string | null>(null);

  // ─── Totales ─────────────────────────────────────────────────────────────
  readonly totalAuto     = computed(() => this.contar('automatico'));
  readonly totalRevision = computed(() => this.contar('revision'));
  readonly totalNuevo    = computed(() => this.contar('nuevo'));
  readonly totalOmitido  = computed(() => this.contar('omitido'));
  readonly totalFilas    = computed(() => this.filas().length);
  readonly totalSeleccionados = computed(() => this.filas().filter(f => f.seleccionado).length);

  readonly progresoAuto   = computed(() => this.pct(this.totalAuto()));
  readonly progresoManual = computed(() => this.pct(this.totalRevision()));

  readonly busqueda = signal('');
  readonly columnasVisibles = signal(false);

  readonly filasFiltradas = computed(() => {
    const t = this.tab();
    const q = this.busqueda().toLowerCase().trim();
    let todas = this.filas();
    if (t === 'auto')   todas = todas.filter(f => f.estado === 'automatico');
    if (t === 'manual') todas = todas.filter(f => f.estado === 'revision');
    if (q) {
      todas = todas.filter(f => {
        const texto = [
          f.leido.numSerie, f.leido.codigoTw, f.leido.codigoCliente,
          f.leido.equipo, f.leido.marca, f.leido.modelo, f.leido.ubicacion, f.leido.sede,
          f.equipo?.codigoTw, f.equipo?.numSerie, f.equipo?.marca, f.equipo?.modelo,
          f.nuevo?.suministroDescripcion,
        ].filter(Boolean).join(' ').toLowerCase();
        return texto.includes(q);
      });
    }
    return todas;
  });

  readonly puedeConfirmar = computed(
    () => !this.confirmando() && !this.analizando() && this.totalSeleccionados() > 0,
  );

  readonly arrastrando = signal(false);
  private readonly extensionesValidas = ['.xlsx', '.xls', '.csv'];

  // ─── Handlers de archivo / plantilla ─────────────────────────────────────
  onArchivoSeleccionado(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    this.recibirArchivo(f);
    input.value = '';
  }

  onDragOver(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.arrastrando.set(true);
  }

  onDragLeave(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.arrastrando.set(false);
  }

  onDrop(evt: DragEvent): void {
    evt.preventDefault();
    evt.stopPropagation();
    this.arrastrando.set(false);
    const f = evt.dataTransfer?.files?.[0];
    if (!f) return;
    this.recibirArchivo(f);
  }

  private recibirArchivo(f: File): void {
    const nombre = f.name.toLowerCase();
    const extOk = this.extensionesValidas.some(ext => nombre.endsWith(ext));
    if (!extOk) {
      this.toast.error('Formato no soportado. Usá .xlsx, .xls o .csv.');
      return;
    }
    this.archivo.set(f);
    this.analizar(f);
  }

  async descargarPlantilla(): Promise<void> {
    this.descargandoPlantilla.set(true);
    try {
      const blob = await this.svc.descargarPlantillaImportacion();
      this.guardarBlob(blob, 'Plantilla_Importacion_Equipos.xlsx');
    } catch (e: any) {
      this.toast.error(this.mensajeError(e) ?? 'No se pudo descargar la plantilla.');
    } finally {
      this.descargandoPlantilla.set(false);
    }
  }

  async analizar(archivo: File): Promise<void> {
    this.analizando.set(true);
    this.error.set(null);
    try {
      const resp = await this.svc.analizarImportacionEquipos({
        archivo,
        idCliente:             this.idCliente(),
        idSede:                this.idSede(),
        idsEquipoEnPropuesta:  this.idsEquipoEnPropuesta(),
        seriesEnPropuesta:     this.seriesEnPropuesta(),
      });
      this.analisis.set(resp);
      this.filas.set(resp.filas);
      if (resp.avisoIa) this.toast.info(resp.avisoIa);
    } catch (e: any) {
      const msg = this.mensajeError(e) ?? 'No se pudo analizar el archivo.';
      this.error.set(msg);
      this.toast.error(msg);
    } finally {
      this.analizando.set(false);
    }
  }

  // ─── Tabla ───────────────────────────────────────────────────────────────
  cambiarTab(t: Tab): void { this.tab.set(t); }

  toggleFila(fila: FilaImportacionEquipo): void {
    if (!fila.importable) return;
    this.filas.update(l => l.map(f => f.fila === fila.fila ? { ...f, seleccionado: !f.seleccionado } : f));
  }

  toggleTodos(valor: boolean): void {
    this.filas.update(l => l.map(f => ({ ...f, seleccionado: f.importable && valor })));
  }

  readonly filaEditando = signal<FilaImportacionEquipo | null>(null);

  editarFila(f: FilaImportacionEquipo): void {
    this.filaEditando.set(f);
  }

  cerrarEdicionFila(): void {
    this.filaEditando.set(null);
  }

  guardarEdicionFila(actualizada: FilaImportacionEquipo): void {
    this.filas.update(l => l.map(f => f.fila === actualizada.fila ? actualizada : f));
    this.filaEditando.set(null);
    this.toast.exito(`Fila #${actualizada.fila} actualizada.`);
  }

  // ─── Confirmar ───────────────────────────────────────────────────────────
  async confirmar(): Promise<void> {
    const filasAEnviar: FilaConfirmarImportacion[] = this.filas()
      .filter(f => f.seleccionado && f.importable)
      .map(f => this.toConfirmarDto(f));

    if (filasAEnviar.length === 0) {
      this.toast.info('Selecciona al menos una fila para importar.');
      return;
    }

    this.confirmando.set(true);
    try {
      const r = await this.svc.confirmarImportacionEquipos({
        idCliente: this.idCliente(),
        filas:     filasAEnviar,
      });
      this.importado.emit(r);
      this.toast.exito(
        `Importados ${r.equipos.length} equipos (${r.vinculados} vinculados, ${r.creados} creados${r.reutilizados ? `, ${r.reutilizados} reutilizados` : ''}).`,
      );
    } catch (e: any) {
      this.toast.error(this.mensajeError(e) ?? 'No se pudo confirmar la importación.');
    } finally {
      this.confirmando.set(false);
    }
  }

  async descargarReporte(): Promise<void> {
    if (this.filas().length === 0) return;
    this.descargandoReporte.set(true);
    try {
      const blob = await this.svc.descargarReporteImportacion(this.filas());
      this.guardarBlob(blob, 'Reporte_Importacion_Equipos.xlsx');
    } catch (e: any) {
      this.toast.error(this.mensajeError(e) ?? 'No se pudo descargar el reporte.');
    } finally {
      this.descargandoReporte.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ─── Helpers visuales ────────────────────────────────────────────────────
  toggleColumnas(): void { this.columnasVisibles.update(v => !v); }

  /** Nombre humano del campo detectado por la IA. */
  labelCampo(campo: string): string {
    switch (campo) {
      case 'numSerie':      return 'N/S fabricante';
      case 'codigoTw':      return 'Código TW';
      case 'codigoCliente': return 'Código del cliente';
      case 'equipo':        return 'Equipo / instrumento';
      case 'marca':         return 'Marca';
      case 'modelo':        return 'Modelo';
      case 'capacidad':     return 'Capacidad / alcance';
      case 'ubicacion':     return 'Ubicación';
      case 'sede':          return 'Sede';
      default:              return campo;
    }
  }

  /** Mensaje corto del motivo para el chip debajo del estado. */
  labelMotivo(motivo: string): string {
    switch (motivo) {
      case 'num_serie':        return 'match por N/S';
      case 'codigo_tw':        return 'match por Cód TW';
      case 'codigo_cliente':   return 'match por Cód cliente';
      case 'serie_similar':    return 'serie parecida';
      case 'serie_repetida':   return 'serie repetida en cliente';
      case 'serie_distinta':   return 'Cód TW con otra serie';
      case 'equipo_inactivo':  return 'equipo inactivo';
      case 'sugerencia_ia':    return 'match por marca/modelo (IA)';
      case 'catalogo':         return 'modelo del catálogo';
      case 'sin_catalogo':     return 'sin ficha del catálogo';
      case 'sin_suministro':   return 'falta suministro';
      case 'sin_serie':        return 'falta N/S';
      case 'faltan_datos':     return 'faltan datos';
      case 'otro_cliente':     return 'de otro cliente';
      case 'duplicado_archivo':return 'duplicado en archivo';
      case 'ya_en_propuesta':  return 'ya en la propuesta';
      case 'resuelto_manual':  return 'resuelto manualmente';
      case 'omitido_manual':   return 'omitido manualmente';
      default:                 return motivo;
    }
  }

  claseEstado(e: EstadoFilaImportacion): string {
    switch (e) {
      case 'automatico': return 'estado--auto';
      case 'revision':   return 'estado--manual';
      case 'nuevo':      return 'estado--nuevo';
      case 'omitido':    return 'estado--omitido';
    }
  }

  /** Código TW a mostrar: el equipo vinculado, el "(Nuevo)" del nuevo, o lo que vino del Excel. */
  codigoTwFila(f: FilaImportacionEquipo): string {
    if (f.accion === 'vincular' && f.equipo) return f.equipo.codigoTw;
    if (f.accion === 'crear') return '— (Nuevo)';
    return f.leido.codigoTw?.trim() || '—';
  }

  equipoFila(f: FilaImportacionEquipo): string {
    if (f.accion === 'vincular' && f.equipo) {
      const partes = [f.equipo.clasificacionLabel, f.equipo.marca, f.equipo.modelo].filter(Boolean);
      return partes.join(' · ') || '—';
    }
    const partes = [f.leido.equipo, f.leido.marca, f.leido.modelo].filter(Boolean);
    return partes.join(' · ') || '—';
  }

  capacidadFila(f: FilaImportacionEquipo): string {
    return f.equipo?.alcanceMaximo || f.leido.capacidad || '—';
  }

  ubicacionFila(f: FilaImportacionEquipo): string {
    return f.equipo?.ubicacion || f.leido.ubicacion || '—';
  }

  nsFila(f: FilaImportacionEquipo): string {
    return f.leido.numSerie?.trim() || '—';
  }

  // ─── Internos ────────────────────────────────────────────────────────────
  private contar(estado: EstadoFilaImportacion): number {
    return this.filas().filter(f => f.estado === estado).length;
  }

  private pct(n: number): number {
    const total = this.totalFilas();
    return total > 0 ? Math.round((n / total) * 100) : 0;
  }

  private toConfirmarDto(f: FilaImportacionEquipo): FilaConfirmarImportacion {
    if (f.accion === 'vincular') {
      return {
        fila:     f.fila,
        accion:   'vincular' as AccionImportacion,
        idEquipo: f.equipo?.idEquipo ?? null,
      };
    }
    const n = f.nuevo;
    return {
      fila:          f.fila,
      accion:        'crear' as AccionImportacion,
      numSerie:      n?.numSerie ?? f.leido.numSerie ?? null,
      marca:         n?.marca ?? f.leido.marca ?? null,
      modelo:        n?.modelo ?? f.leido.modelo ?? null,
      clasificacion: (n?.clasificacion as string | undefined) ?? null,
      idSuministro:  n?.idSuministro ?? null,
      idSede:        n?.idSede ?? this.idSede() ?? null,
      codigoCliente: n?.codigoCliente ?? f.leido.codigoCliente ?? null,
      ubicacion:     n?.ubicacion ?? f.leido.ubicacion ?? null,
      alcanceMaximo: n?.alcanceMaximo ?? null,
    };
  }

  private guardarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Lee mensaje de error del back, soportando payload JSON dentro de Blob (responseType:'blob'). */
  private mensajeError(e: any): string | null {
    const m = e?.error?.mensaje ?? e?.error?.message ?? e?.message;
    return typeof m === 'string' && m.trim() ? m : null;
  }
}
