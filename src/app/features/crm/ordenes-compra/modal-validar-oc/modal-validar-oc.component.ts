import { Component, OnDestroy, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { PreparacionValidacionOrdenCompraDto } from '../../../../core/models/ordenes-compra.model';

@Component({
  selector: 'app-modal-validar-oc',
  imports: [CommonModule, FormsModule, ButtonComponent, ModalComponent],
  templateUrl: './modal-validar-oc.component.html',
  styleUrl: './modal-validar-oc.component.scss',
})
export class ModalValidarOcComponent implements OnDestroy {
  private readonly svc       = inject(OrdenesCompraService);
  private readonly toast     = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  private pdfBlobUrlRaw: string | null = null;

  readonly pdfBlobUrl = signal<SafeResourceUrl | null>(null);
  readonly cargandoPdf = signal(false);

  readonly idOc              = input.required<number>();
  readonly cerrar            = output<void>();
  readonly confirmado        = output<void>();
  readonly solicitarObservar = output<void>();

  readonly cargando  = signal(true);
  readonly guardando = signal(false);
  readonly datos     = signal<PreparacionValidacionOrdenCompraDto | null>(null);

  /** Códigos del checklist que requieren confirmación y que el validador marcó como OK. */
  readonly confirmados = signal<Set<string>>(new Set());
  comentario = '';

  get todosConfirmados(): boolean {
    const d = this.datos();
    if (!d) return false;
    const requeridos = d.checklist.filter(c => c.requiereConfirmacion).map(c => c.codigo);
    const set = this.confirmados();
    return requeridos.every(c => set.has(c));
  }

  get puedeValidar(): boolean {
    const d = this.datos();
    return !!d && d.resumen.puedeValidar && this.todosConfirmados;
  }

  constructor() {
    effect(() => {
      const id = this.idOc();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    this.liberarPdfBlob();
    try {
      const d = await this.svc.prepararValidacion(id);
      this.datos.set(d);
      // Pre-marco los que ya cumplen automáticamente
      const auto = new Set<string>();
      for (const c of d.checklist) if (c.cumpleAuto && c.requiereConfirmacion) auto.add(c.codigo);
      this.confirmados.set(auto);
      // Cargo el PDF embebido en paralelo
      void this.cargarPdfEmbebido(id);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar la validación.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarPdfEmbebido(idOc: number): Promise<void> {
    this.cargandoPdf.set(true);
    try {
      const blob = await this.svc.obtenerPdfBlob(idOc);
      const raw = URL.createObjectURL(blob);
      this.pdfBlobUrlRaw = raw;
      this.pdfBlobUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(raw));
    } catch {
      // Si falla, el panel queda vacío con el botón "Abrir documento"
    } finally {
      this.cargandoPdf.set(false);
    }
  }

  private liberarPdfBlob(): void {
    if (this.pdfBlobUrlRaw) {
      URL.revokeObjectURL(this.pdfBlobUrlRaw);
      this.pdfBlobUrlRaw = null;
    }
    this.pdfBlobUrl.set(null);
  }

  ngOnDestroy(): void { this.liberarPdfBlob(); }

  toggleConfirmado(codigo: string): void {
    const set = new Set(this.confirmados());
    if (set.has(codigo)) set.delete(codigo); else set.add(codigo);
    this.confirmados.set(set);
  }

  async validar(): Promise<void> {
    if (!this.puedeValidar || this.guardando()) return;
    this.guardando.set(true);
    try {
      await this.svc.validarOrdenCompra(this.idOc(), {
        confirmados: Array.from(this.confirmados()),
        comentario: this.comentario || null,
      });
      this.toast.exito('OC validada correctamente.');
      this.confirmado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo validar la OC.');
    } finally {
      this.guardando.set(false);
    }
  }

  observar(): void { this.solicitarObservar.emit(); }
  async abrirDocumento(): Promise<void> {
    const d = this.datos();
    if (!d) return;
    try {
      await this.svc.abrirPdfEnPestana(d.resumen.idOc);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo abrir el PDF.');
    }
  }
  onCerrar(): void { this.cerrar.emit(); }

  formatearMonto(monto: number | null | undefined, simbolo?: string | null): string {
    if (monto == null) return '—';
    const s = simbolo ?? 'S/';
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${v}`;
  }
}
