import { Component, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { environment } from '../../../../../environments/environment';

/**
 * Modal "Vista Previa PDF" de la propuesta. Mismo patrón que el preview de
 * Procedimientos (ficha-procedimiento): iframe fullscreen con el PDF renderizado
 * por el back (GET /api/crm/propuestas/{id}/pdf).
 *
 * Botones del footer: Cerrar · Imprimir · Descargar.
 */
@Component({
  selector: 'app-modal-preview-pdf',
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './modal-preview-pdf.component.html',
  styleUrl: './modal-preview-pdf.component.scss',
})
export class ModalPreviewPdfComponent implements OnInit, OnDestroy {
  private readonly http      = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  readonly codigo      = input<string>('');
  readonly idPropuesta = input<number>(0);
  readonly cerrar      = output<void>();

  readonly cargando = signal(true);
  readonly error    = signal<string>('');
  readonly pdfUrl   = signal<SafeResourceUrl | null>(null);

  private blobUrl: string | null = null;
  private blob: Blob | null      = null;

  async ngOnInit(): Promise<void> {
    const id = this.idPropuesta();
    if (!id) {
      this.error.set('ID de propuesta inválido.');
      this.cargando.set(false);
      return;
    }

    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/api/crm/propuestas/${id}/pdf`, { responseType: 'blob' })
      );
      this.blob    = blob;
      this.blobUrl = URL.createObjectURL(blob);
      this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl));
    } catch (e: unknown) {
      const err = e as { error?: Blob | { mensaje?: string }; message?: string };
      // Si el back responde con error, el body viene como blob JSON — hay que leerlo
      if (err?.error instanceof Blob) {
        try {
          const texto = await err.error.text();
          const json  = JSON.parse(texto);
          this.error.set(json?.mensaje || 'No se pudo generar el PDF.');
        } catch {
          this.error.set('No se pudo generar el PDF.');
        }
      } else {
        this.error.set(err?.message || 'No se pudo generar el PDF.');
      }
    } finally {
      this.cargando.set(false);
    }
  }

  descargar(): void {
    if (!this.blob) return;
    const url = URL.createObjectURL(this.blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `${this.codigo() || 'propuesta'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  imprimir(): void {
    if (!this.blobUrl) return;
    const win = window.open(this.blobUrl, '_blank');
    if (win) win.addEventListener('load', () => win.print());
  }

  ngOnDestroy(): void {
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
  }
}
