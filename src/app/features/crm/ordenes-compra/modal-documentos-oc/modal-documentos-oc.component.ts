import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { DocumentosOrdenCompraDto, VersionDocumentoOrdenCompraDto } from '../../../../core/models/ordenes-compra.model';

@Component({
  selector: 'app-modal-documentos-oc',
  imports: [CommonModule, FormsModule, DatePipe, ButtonComponent, ModalComponent],
  templateUrl: './modal-documentos-oc.component.html',
  styleUrl: './modal-documentos-oc.component.scss',
})
export class ModalDocumentosOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc       = input.required<number>();
  readonly numeroOc   = input<string>('');
  readonly cerrar     = output<void>();
  readonly confirmado = output<void>();

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly datos     = signal<DocumentosOrdenCompraDto | null>(null);
  readonly reemplazando = signal(false);

  nuevoArchivo: File | null = null;
  nuevoNombre = '';
  motivoReemplazo = '';

  constructor() {
    effect(() => {
      const id = this.idOc();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    try {
      this.datos.set(await this.svc.obtenerDocumentos(id));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar versiones.');
    } finally {
      this.cargando.set(false);
    }
  }

  abrirReemplazo(): void { this.reemplazando.set(true); }
  cancelarReemplazo(): void {
    this.reemplazando.set(false);
    this.nuevoArchivo = null;
    this.nuevoNombre = '';
    this.motivoReemplazo = '';
  }

  onArchivoSeleccionado(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      this.toast.error('Solo se admite PDF.');
      return;
    }
    this.nuevoArchivo = file;
    this.nuevoNombre = file.name;
  }

  async guardarNuevaVersion(): Promise<void> {
    if (!this.nuevoArchivo || !this.motivoReemplazo.trim()) {
      this.toast.error('Adjunta el archivo e indica el motivo del reemplazo.');
      return;
    }
    this.guardando.set(true);
    try {
      await this.svc.reemplazarDocumento(this.idOc(), this.motivoReemplazo.trim(), this.nuevoArchivo);
      this.toast.exito('Nueva versión registrada.');
      this.confirmado.emit();
      await this.cargar(this.idOc());
      this.cancelarReemplazo();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo subir la nueva versión.');
    } finally {
      this.guardando.set(false);
    }
  }

  async verVersion(v: VersionDocumentoOrdenCompraDto): Promise<void> {
    try {
      await this.svc.abrirPdfEnPestana(this.idOc(), v.idDocumento);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo abrir el PDF.');
    }
  }

  async descargar(v: VersionDocumentoOrdenCompraDto): Promise<void> {
    try {
      await this.svc.descargarPdf(this.idOc(), v.nombreArchivo, v.idDocumento);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo descargar el PDF.');
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
