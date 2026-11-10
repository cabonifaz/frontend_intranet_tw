import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import {
  AccionRevision,
  ComprobanteGasto,
  ConceptoGasto,
  GastoRendido,
  LineaAsignacion,
  LineaViaticoInput,
  ViaticosProgramacion,
  ViaticosTecnico,
} from '../../../../core/models/programacion-viaticos.model';

type Tab = 'asignacion' | 'rendicion';

interface LineaEditable {
  idGasto:        number;        // 0 si es nueva
  idTecnico:      number;
  idConcepto:     number | null; // null si es un concepto nuevo
  nuevoConcepto:  string | null;
  concepto:       string;
  monto:          number;
  estadoDeposito: string;
  fechaDeposito?: string | null;
  editable:       boolean;
  marcadaBorrar:  boolean;
}

/**
 * HU-45 Modal "Gestionar Viáticos" (Modelo B: adelanto + rendición).
 * Se abre desde el Modal Detalle de la Programación cuando la programación está PROGRAMADA.
 * Dos tabs: [1] Asignación de Viáticos (previo) · [2] Rendición de Gastos (post ejecución).
 */
@Component({
  selector: 'app-modal-gestionar-viaticos',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-gestionar-viaticos.component.html',
  styleUrl: './modal-gestionar-viaticos.component.scss',
})
export class ModalGestionarViaticosComponent {
  private readonly svc   = inject(ProgramacionOperativaService);
  private readonly toast = inject(ToastService);

  readonly idProgramacion = input.required<number>();

  readonly cerrar     = output<void>();
  readonly actualizado = output<void>();

  readonly datos      = signal<ViaticosProgramacion | null>(null);
  readonly cargando   = signal(false);
  readonly guardando  = signal(false);
  readonly tabActivo  = signal<Tab>('asignacion');
  readonly lineas     = signal<LineaEditable[]>([]);

  // ── Modal secundario: agregar concepto ───────────────────────────────────
  readonly idTecnicoNuevoConcepto = signal<number | null>(null);
  readonly conceptoSeleccionado   = signal<number | null>(null);
  readonly conceptoNuevo          = signal('');
  readonly montoNuevo             = signal<number | null>(null);

  // ── Modal secundario: revisar gasto (observar/rechazar) ──────────────────
  readonly gastoRevision     = signal<GastoRendido | null>(null);
  readonly accionRevision    = signal<AccionRevision | null>(null);
  readonly comentarioRevision = signal('');
  readonly revisando         = signal(false);

  // ── Modal secundario: comprobante ────────────────────────────────────────
  readonly comprobanteAbierto = signal<ComprobanteGasto | null>(null);

  // ── Confirmar cierre de rendición ────────────────────────────────────────
  readonly confirmandoCierre = signal(false);
  readonly cerrandoRendicion = signal(false);

  readonly cabecera     = computed(() => this.datos()?.cabecera ?? null);
  readonly conceptos    = computed(() => this.datos()?.conceptos ?? []);
  readonly tecnicos     = computed(() => this.datos()?.tecnicos ?? []);
  readonly gastos       = computed(() => this.datos()?.gastos ?? []);
  readonly resumen      = computed(() => this.datos()?.resumen ?? null);
  readonly cierre       = computed(() => this.datos()?.cierre ?? null);
  readonly puedeEditar  = computed(() => !!this.cabecera()?.puedeGestionar && !this.cabecera()?.rendicionCerrada);
  readonly moneda       = computed(() => this.cabecera()?.moneda ?? 'S/');

  readonly lineasPorTecnico = computed(() => {
    const map = new Map<number, LineaEditable[]>();
    for (const l of this.lineas().filter(x => !x.marcadaBorrar)) {
      if (!map.has(l.idTecnico)) map.set(l.idTecnico, []);
      map.get(l.idTecnico)!.push(l);
    }
    return map;
  });

  readonly totalAsignado = computed(() =>
    this.lineas().filter(l => !l.marcadaBorrar).reduce((s, l) => s + (Number(l.monto) || 0), 0),
  );
  readonly totalDepositado = computed(() =>
    this.lineas().filter(l => !l.marcadaBorrar && l.estadoDeposito === 'depositado').reduce((s, l) => s + (Number(l.monto) || 0), 0),
  );
  readonly totalPendiente = computed(() => this.totalAsignado() - this.totalDepositado());

  constructor() { queueMicrotask(() => this.cargar()); }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const d = await this.svc.obtenerViaticos(this.idProgramacion());
      this.datos.set(d);
      this.lineas.set(d.lineas.map(l => this.toLineaEditable(l)));
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudieron cargar los viáticos.');
    } finally {
      this.cargando.set(false);
    }
  }

  private toLineaEditable(l: LineaAsignacion): LineaEditable {
    return {
      idGasto:        l.idGasto,
      idTecnico:      l.idTecnico,
      idConcepto:     l.idConcepto,
      nuevoConcepto:  null,
      concepto:       l.concepto,
      monto:          l.monto,
      estadoDeposito: l.estadoDeposito,
      fechaDeposito:  l.fechaDeposito,
      editable:       l.editable,
      marcadaBorrar:  false,
    };
  }

  // ── Tab 1: líneas ────────────────────────────────────────────────────────

  abrirAgregarConcepto(idTecnico: number): void {
    this.idTecnicoNuevoConcepto.set(idTecnico);
    this.conceptoSeleccionado.set(null);
    this.conceptoNuevo.set('');
    this.montoNuevo.set(null);
  }

  cerrarAgregarConcepto(): void {
    this.idTecnicoNuevoConcepto.set(null);
  }

  confirmarAgregarConcepto(): void {
    const idTec = this.idTecnicoNuevoConcepto();
    const monto = Number(this.montoNuevo());
    const idConcepto = this.conceptoSeleccionado();
    const nuevo = this.conceptoNuevo().trim();
    if (!idTec)   { this.toast.error('Técnico no identificado.'); return; }
    if (!monto || monto <= 0) { this.toast.error('El monto debe ser mayor a cero.'); return; }
    if (!idConcepto && !nuevo) { this.toast.error('Selecciona un concepto o crea uno nuevo.'); return; }

    const concepto = idConcepto
      ? (this.conceptos().find(c => c.idConcepto === idConcepto)?.nombre ?? '')
      : nuevo;

    this.lineas.update(arr => [
      ...arr,
      {
        idGasto:        0,
        idTecnico:      idTec,
        idConcepto:     idConcepto,
        nuevoConcepto:  idConcepto ? null : nuevo,
        concepto,
        monto,
        estadoDeposito: 'pendiente',
        fechaDeposito:  null,
        editable:       true,
        marcadaBorrar:  false,
      },
    ]);
    this.cerrarAgregarConcepto();
  }

  actualizarMonto(linea: LineaEditable, monto: number): void {
    this.lineas.update(arr => arr.map(l => l === linea ? { ...l, monto } : l));
  }

  quitarLinea(linea: LineaEditable): void {
    if (!linea.editable) {
      this.toast.error('Esta línea ya fue depositada; no puede eliminarse.');
      return;
    }
    if (linea.idGasto === 0) {
      // Nueva: la quitamos del arreglo
      this.lineas.update(arr => arr.filter(l => l !== linea));
    } else {
      this.lineas.update(arr => arr.map(l => l === linea ? { ...l, marcadaBorrar: true } : l));
    }
  }

  async guardarAsignacion(): Promise<void> {
    if (this.guardando()) return;
    const lineas: LineaViaticoInput[] = this.lineas()
      .filter(l => !l.marcadaBorrar)
      .map(l => ({
        idGasto:       l.idGasto > 0 ? l.idGasto : null,
        idTecnico:     l.idTecnico,
        idConcepto:    l.idConcepto ?? null,
        nuevoConcepto: l.idConcepto ? null : l.nuevoConcepto,
        monto:         Number(l.monto) || 0,
      }));

    this.guardando.set(true);
    try {
      const r = await this.svc.guardarViaticos(this.idProgramacion(), {
        version: this.cabecera()?.version ?? null,
        lineas,
      });
      if (r.sinCambios) {
        this.toast.info('No había cambios para guardar.');
      } else {
        const partes = [];
        if (r.creadas)     partes.push(`${r.creadas} nueva${r.creadas > 1 ? 's' : ''}`);
        if (r.modificadas) partes.push(`${r.modificadas} actualizada${r.modificadas > 1 ? 's' : ''}`);
        if (r.retiradas)   partes.push(`${r.retiradas} retirada${r.retiradas > 1 ? 's' : ''}`);
        this.toast.exito(
          `Viáticos guardados (${partes.join(' · ')}). Contabilidad notificada: ${r.notificadosContabilidad}.`,
        );
      }
      await this.cargar();
      this.actualizado.emit();
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo guardar la asignación.');
    } finally {
      this.guardando.set(false);
    }
  }

  // ── Tab 2: revisión de gastos ────────────────────────────────────────────

  async aprobarGasto(g: GastoRendido): Promise<void> {
    await this.ejecutarRevision(g, 'aprobar', null);
  }

  abrirObservar(g: GastoRendido): void {
    this.gastoRevision.set(g);
    this.accionRevision.set('observar');
    this.comentarioRevision.set('');
  }

  abrirRechazar(g: GastoRendido): void {
    this.gastoRevision.set(g);
    this.accionRevision.set('rechazar');
    this.comentarioRevision.set('');
  }

  cerrarModalRevision(): void {
    this.gastoRevision.set(null);
    this.accionRevision.set(null);
    this.comentarioRevision.set('');
  }

  async confirmarRevision(): Promise<void> {
    const g = this.gastoRevision();
    const accion = this.accionRevision();
    const comentario = this.comentarioRevision().trim();
    if (!g || !accion) return;
    if (!comentario) {
      this.toast.error(accion === 'observar' ? 'El comentario es obligatorio para observar.' : 'El motivo es obligatorio para rechazar.');
      return;
    }
    await this.ejecutarRevision(g, accion, comentario);
    this.cerrarModalRevision();
  }

  private async ejecutarRevision(g: GastoRendido, accion: AccionRevision, comentario: string | null): Promise<void> {
    if (this.revisando()) return;
    this.revisando.set(true);
    try {
      await this.svc.revisarGasto(this.idProgramacion(), g.idGasto, { accion, comentario });
      this.toast.exito(
        accion === 'aprobar'  ? `Gasto aprobado (${this.moneda()} ${g.monto.toFixed(2)}).` :
        accion === 'observar' ? 'Gasto observado. El técnico será notificado.' :
                                 'Gasto rechazado.',
      );
      await this.cargar();
      this.actualizado.emit();
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar la revisión.');
    } finally {
      this.revisando.set(false);
    }
  }

  async verComprobante(g: GastoRendido): Promise<void> {
    if (!g.tieneComprobante) {
      this.toast.info('Este gasto no tiene comprobante adjunto.');
      return;
    }
    try {
      const c = await this.svc.obtenerComprobante(this.idProgramacion(), g.idGasto);
      this.comprobanteAbierto.set(c);
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo obtener el comprobante.');
    }
  }

  cerrarComprobante(): void { this.comprobanteAbierto.set(null); }

  esImagen(url: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
  }

  abrirConfirmarCierre(): void { this.confirmandoCierre.set(true); }
  cerrarConfirmarCierre(): void { this.confirmandoCierre.set(false); }

  async confirmarCierreRendicion(): Promise<void> {
    if (this.cerrandoRendicion()) return;
    this.cerrandoRendicion.set(true);
    try {
      const r = await this.svc.cerrarRendicion(this.idProgramacion());
      const saldoTxt =
        r.tipoSaldo === 'a_favor_tecnico' ? `reembolso adicional de ${this.moneda()} ${Math.abs(r.saldo).toFixed(2)}` :
        r.tipoSaldo === 'a_devolver'      ? `devolución del técnico de ${this.moneda()} ${Math.abs(r.saldo).toFixed(2)}` :
                                             'cuadra (saldo cero)';
      this.toast.exito(`Rendición cerrada. Contabilidad notificada: ${r.notificadosContabilidad}. Saldo: ${saldoTxt}.`);
      this.confirmandoCierre.set(false);
      await this.cargar();
      this.actualizado.emit();
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cerrar la rendición.');
    } finally {
      this.cerrandoRendicion.set(false);
    }
  }

  // ── Helpers UI ───────────────────────────────────────────────────────────

  chipDeposito(estado: string): string {
    switch (estado) {
      case 'depositado': return 'chip chip--verde';
      default:           return 'chip chip--ambar';
    }
  }

  labelDeposito(estado: string): string {
    return estado === 'depositado' ? 'Depositado' : 'Pendiente depósito';
  }

  chipGasto(estado: string): string {
    switch (estado) {
      case 'aprobado':  return 'chip chip--verde';
      case 'observado': return 'chip chip--ambar';
      case 'rechazado': return 'chip chip--rojo';
      default:          return 'chip chip--gris';
    }
  }

  labelGasto(estado: string): string {
    switch (estado) {
      case 'aprobado':  return 'Aprobado';
      case 'observado': return 'Observado';
      case 'rechazado': return 'Rechazado';
      default:          return 'Pendiente';
    }
  }

  chipTipoSaldo(tipo: string): string {
    switch (tipo) {
      case 'a_favor_tecnico': return 'chip chip--ambar';
      case 'a_devolver':      return 'chip chip--azul';
      case 'cuadrado':        return 'chip chip--verde';
      default:                return 'chip';
    }
  }

  labelTipoSaldo(tipo: string): string {
    switch (tipo) {
      case 'a_favor_tecnico': return 'Reembolso adicional';
      case 'a_devolver':      return 'Devolución del técnico';
      case 'cuadrado':        return 'Cuadrado';
      default:                return '—';
    }
  }

  tecnicoDe(idUsuario: number): ViaticosTecnico | undefined {
    return this.tecnicos().find(t => t.idUsuario === idUsuario);
  }

  subtotalTecnico(idUsuario: number): number {
    return this.lineas()
      .filter(l => !l.marcadaBorrar && l.idTecnico === idUsuario)
      .reduce((s, l) => s + (Number(l.monto) || 0), 0);
  }

  conceptosDisponibles(): ConceptoGasto[] {
    return this.conceptos();
  }
}
