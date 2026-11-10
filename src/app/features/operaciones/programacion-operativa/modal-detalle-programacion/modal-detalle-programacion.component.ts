import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DetalleProgramacion } from '../../../../core/models/programacion-operativa.model';
import { ViaticosProgramacion } from '../../../../core/models/programacion-viaticos.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

type Tab = 'datos' | 'checklist' | 'historial' | 'viaticos';

/**
 * Modal "Detalle de la Programación" (HU-37). 3 bloques internos navegables por tab:
 *  - DATOS: cabecera + técnicos + equipos + conceptos + alertas SSOMA.
 *  - CHECKLIST: 4 items de validación + respuestas de cliente.
 *  - HISTORIAL: timeline de eventos.
 *
 * Desde acá se dispara "Registrar respuesta del cliente", abrir OS/Expediente/Propuesta,
 * y los flujos HU-38 (reprogramar/cancelar) + HU-45 (viáticos) cuando las acciones apliquen.
 */
@Component({
  selector: 'app-modal-detalle-programacion',
  imports: [CommonModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-detalle-programacion.component.html',
  styleUrl: './modal-detalle-programacion.component.scss',
})
export class ModalDetalleProgramacionComponent implements OnInit {
  private readonly svc    = inject(ProgramacionOperativaService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  readonly idProgramacion = input.required<number>();

  readonly cerrar               = output<void>();
  readonly actualizado          = output<void>();
  /** El padre reemplaza este modal por el sub-flujo correspondiente. */
  readonly pedirRegistrarRespuesta = output<number>();
  readonly pedirCancelar           = output<number>();
  readonly pedirReprogramar        = output<number>();
  readonly pedirGestionarViaticos  = output<number>();
  readonly pedirResolverSolicitud  = output<number>();
  readonly pedirRetirarSolicitud   = output<number>();

  readonly tab      = signal<Tab>('datos');
  readonly cargando = signal(true);
  readonly detalle  = signal<DetalleProgramacion | null>(null);

  readonly viaticos         = signal<ViaticosProgramacion | null>(null);
  readonly viaticosCargando = signal(false);
  readonly viaticosError    = signal<string | null>(null);

  readonly cabecera = computed(() => this.detalle()?.programacion);
  readonly acciones = computed(() => this.cabecera()?.acciones);

  async irATab(t: Tab): Promise<void> {
    this.tab.set(t);
    if (t === 'viaticos' && !this.viaticos() && !this.viaticosCargando()) {
      await this.cargarViaticos();
    }
  }

  private async cargarViaticos(): Promise<void> {
    const id = this.cabecera()?.idProgramacion;
    if (!id) return;
    this.viaticosCargando.set(true);
    this.viaticosError.set(null);
    try {
      const v = await this.svc.obtenerViaticos(id);
      this.viaticos.set(v);
    } catch (e: unknown) {
      this.viaticosError.set(e instanceof Error ? e.message : 'No se pudo cargar los viáticos.');
    } finally {
      this.viaticosCargando.set(false);
    }
  }

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await this.svc.obtenerDetalleProgramacion(this.idProgramacion());
      this.detalle.set(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el detalle.');
      this.cerrar.emit();
    } finally {
      this.cargando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  // ─── Enlaces cruzados ────────────────────────────────────────────────────

  irAOs(): void {
    const c = this.cabecera();
    if (!c) return;
    this.cerrar.emit();
    this.router.navigate(['/crm/ordenes-servicio'], { queryParams: { ver: c.idOs } });
  }

  irAExpediente(): void {
    const c = this.cabecera();
    if (!c?.idExpediente) return;
    this.cerrar.emit();
    this.router.navigate(['/crm/expedientes-digitales', c.idExpediente]);
  }

  irAPropuesta(): void {
    const c = this.cabecera();
    if (!c?.idPropuesta) return;
    this.cerrar.emit();
    this.router.navigate(['/crm/propuestas'], { queryParams: { ver: c.idPropuesta } });
  }

  // ─── Acciones ────────────────────────────────────────────────────────────

  abrirRegistrarRespuesta(): void {
    const c = this.cabecera();
    if (!c) return;
    this.pedirRegistrarRespuesta.emit(c.idProgramacion);
  }

  reprogramar(): void {
    const c = this.cabecera();
    if (!c) return;
    this.pedirReprogramar.emit(c.idProgramacion);
  }

  cancelar(): void {
    const c = this.cabecera();
    if (!c) return;
    this.pedirCancelar.emit(c.idProgramacion);
  }

  gestionarViaticos(): void {
    const c = this.cabecera();
    if (!c) return;
    this.pedirGestionarViaticos.emit(c.idProgramacion);
  }

  resolverSolicitud(): void {
    const c = this.cabecera();
    if (!c?.idSolicitudPendiente) return;
    this.pedirResolverSolicitud.emit(c.idSolicitudPendiente);
  }

  retirarSolicitud(): void {
    const c = this.cabecera();
    if (!c?.idSolicitudPendiente) return;
    this.pedirRetirarSolicitud.emit(c.idSolicitudPendiente);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  claseEstado(estado: string): string {
    switch (estado) {
      case 'pendiente_confirmacion': return 'chip chip--ambar';
      case 'confirmada':
      case 'programado':             return 'chip chip--verde';
      case 'cancelada':              return 'chip chip--rojo';
      default:                        return 'chip';
    }
  }

  claseSsoma(e: string | null | undefined): string {
    switch (e) {
      case 'conforme':   return 'chip chip--verde';
      case 'por_vencer': return 'chip chip--ambar';
      case 'incompleto':
      case 'pendiente':  return 'chip chip--rojo';
      case 'bloqueado':  return 'chip chip--rojo';
      default:            return 'chip chip--gris';
    }
  }

  iconoEvento(tipo: string): string {
    switch (tipo) {
      case 'programacion':     return 'event_available';
      case 'respuesta_cliente': return 'record_voice_over';
      case 'reprogramacion':   return 'edit_calendar';
      case 'aprobacion':       return 'check_circle';
      case 'cancelacion':      return 'block';
      case 'estado':           return 'swap_horiz';
      default:                  return 'history';
    }
  }
}
