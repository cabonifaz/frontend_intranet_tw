import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SeguimientoService } from '../../../../core/services/seguimiento.service';
import { PreparacionCierreSeguimiento } from '../../../../core/models/seguimiento.model';

@Component({
  selector: 'app-modal-aceptacion-seguimiento',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-aceptacion-seguimiento.component.html',
  styleUrl: './modal-aceptacion-seguimiento.component.scss',
})
export class ModalAceptacionSeguimientoComponent {
  private readonly svc   = inject(SeguimientoService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<void>();

  readonly cargandoDatos = signal(true);
  readonly datos         = signal<PreparacionCierreSeguimiento | null>(null);
  readonly enviando      = signal(false);

  readonly idTipoAceptacion = signal<number | null>(null);
  readonly idContacto       = signal<number | null>(null);
  readonly fecha            = signal<string>('');
  readonly comentario       = signal<string>('');
  readonly archivos         = signal<File[]>([]);

  readonly puedeGuardar = computed(() => {
    return this.idTipoAceptacion() !== null
        && !!this.fecha()
        && this.archivos().length > 0;
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
      if (d.cabecera.idContacto)    this.idContacto.set(d.cabecera.idContacto);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar los datos de cierre.');
    } finally {
      this.cargandoDatos.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  onArchivosSeleccionados(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    const nuevos = Array.from(input.files);
    this.archivos.update(prev => [...prev, ...nuevos].slice(0, 5));
    input.value = '';
  }
  quitarArchivo(i: number): void {
    this.archivos.update(prev => prev.filter((_, idx) => idx !== i));
  }

  formatearMonto(monto: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`;
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar() || this.enviando()) return;
    this.enviando.set(true);
    try {
      const resultado = await this.svc.aceptar(this.idPropuesta(), {
        idTipoAceptacion: this.idTipoAceptacion(),
        idContacto:       this.idContacto(),
        fecha:            this.fecha() || null,
        comentario:       this.comentario() || null,
      });
      if (this.archivos().length > 0 && resultado.idSeguimiento) {
        try { await this.svc.subirAdjuntos(resultado.idSeguimiento, this.archivos()); }
        catch (e: unknown) {
          this.toast.error('Aceptación registrada, pero fallaron adjuntos: ' +
            (e instanceof Error ? e.message : ''));
        }
      }
      this.toast.exito('Aceptación registrada correctamente.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar la aceptación.');
    } finally {
      this.enviando.set(false);
    }
  }
}
