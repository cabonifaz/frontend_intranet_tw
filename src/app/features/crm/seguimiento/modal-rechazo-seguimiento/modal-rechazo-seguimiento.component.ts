import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import { PreparacionCierreSeguimiento } from '../../../../core/models/seguimiento.model';

@Component({
  selector: 'app-modal-rechazo-seguimiento',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-rechazo-seguimiento.component.html',
  styleUrl: './modal-rechazo-seguimiento.component.scss',
})
export class ModalRechazoSeguimientoComponent {
  private readonly svc   = inject(SeguimientoService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargandoDatos = signal(true);
  readonly datos         = signal<PreparacionCierreSeguimiento | null>(null);
  readonly enviando      = signal(false);

  readonly idMotivo    = signal<number | null>(null);
  readonly fecha       = signal<string>('');
  readonly comentario  = signal<string>('');

  readonly longitudComentario = computed(() => this.comentario().trim().length);

  readonly puedeGuardar = computed(() => {
    return this.idMotivo() !== null && !!this.fecha() && this.longitudComentario() >= 20;
  });

  readonly subtitulo = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return `${d.cabecera.numero} / ${d.cabecera.razonSocial}`;
  });

  constructor() {
    effect(() => {
      const id = this.idPropuesta();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargandoDatos.set(true);
    try {
      const d = await this.svc.prepararCierre(id);
      this.datos.set(d);
      if (d.cabecera.fechaServidor) this.fecha.set(d.cabecera.fechaServidor.substring(0, 16));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar los datos de cierre.');
    } finally {
      this.cargandoDatos.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  formatearMonto(monto: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`;
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar() || this.enviando()) return;
    this.enviando.set(true);
    try {
      await this.svc.rechazar(this.idPropuesta(), {
        idMotivo:   this.idMotivo(),
        fecha:      this.fecha() || null,
        comentario: this.comentario() || null,
      });
      this.toast.exito('Rechazo registrado correctamente.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar el rechazo.');
    } finally {
      this.enviando.set(false);
    }
  }
}
