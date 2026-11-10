import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeguimientoOperativoService } from '../../../../core/services/seguimiento-operativo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DemoraIncidenciaServicio } from '../../../../core/models/seguimiento-operativo.model';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/**
 * HU-52 / HU-53 — Modal de detalle de una incidencia / demora / registro del Asistente.
 * Se abre desde la bandeja de Seguimiento Operativo al clic en una fila del tab Demoras/Incidencias
 * (reemplaza al modal de Detalle del Servicio, con botón "Volver" que lo reabre).
 *
 * Carga el detalle extendido (GET /incidencias/{clave}) y, si hay evidencia, la descarga como blob
 * (GET /incidencias/{clave}/evidencia, con token del interceptor) para renderizarla en <img>.
 */
@Component({
  selector: 'app-modal-detalle-incidencia',
  imports: [CommonModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-detalle-incidencia.component.html',
  styleUrl: './modal-detalle-incidencia.component.scss',
})
export class ModalDetalleIncidenciaComponent implements OnInit, OnDestroy {
  private readonly svc   = inject(SeguimientoOperativoService);
  private readonly toast = inject(ToastService);

  readonly idServicio = input.required<number>();
  readonly numeroOs   = input<string>('');
  readonly evento     = input.required<DemoraIncidenciaServicio>();

  readonly cerrar   = output<void>();
  readonly verMapa  = output<{ lat: number; lng: number }>();

  readonly cargando     = signal(true);
  readonly descripcion  = signal<string | null>(null);
  readonly evidenciaUrl = signal<string | null>(null);
  readonly cargandoFoto = signal(false);
  readonly blobFoto     = signal<string | null>(null);

  readonly chipImpactoClase = computed(() => {
    const ev = this.evento();
    return ev.detiene ? 'chip chip--rojo' : 'chip chip--ambar';
  });

  readonly labelImpacto = computed(() => {
    const ev = this.evento();
    return ev.detiene ? 'Detiene' : 'Retrasa';
  });

  readonly iconoVariante = computed(() => {
    const ev = this.evento();
    if (ev.detiene) return 'rojo';
    if (ev.retrasa) return 'ambar';
    return 'azul';
  });

  readonly labelOrigen = computed(() => {
    switch (this.evento().origen) {
      case 'tecnico':   return 'Técnico (app)';
      case 'asistente': return 'Asistente (manual)';
      case 'sistema':   return 'Sistema';
      default:          return this.evento().origen;
    }
  });

  async ngOnInit(): Promise<void> {
    await this.cargarDetalle();
  }

  ngOnDestroy(): void {
    const b = this.blobFoto();
    if (b) URL.revokeObjectURL(b);
  }

  private async cargarDetalle(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await this.svc.obtenerDetalleIncidencia(this.idServicio(), this.evento().idDemora);
      const fila = r.filas?.[0];
      this.descripcion.set(fila?.descripcion ?? null);
      this.evidenciaUrl.set(fila?.evidencia ?? null);
      if (fila?.evidencia) void this.cargarFotoBlob();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el detalle del registro.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarFotoBlob(): Promise<void> {
    this.cargandoFoto.set(true);
    try {
      const blob = await this.svc.obtenerEvidenciaIncidencia(this.idServicio(), this.evento().idDemora);
      this.blobFoto.set(URL.createObjectURL(blob));
    } catch (e: unknown) {
      console.error('[HU-53] Evidencia no pudo cargarse:', e);
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la foto de evidencia.');
    } finally {
      this.cargandoFoto.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  onVerMapa(): void {
    const ev = this.evento();
    if (ev.lat !== null && ev.lng !== null) {
      this.verMapa.emit({ lat: ev.lat, lng: ev.lng });
    }
  }
}
