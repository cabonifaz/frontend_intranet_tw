import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { EditorCorreoComponent } from '../../../../shared/ui/editor-correo/editor-correo.component';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  PreparacionEnvioCliente,
  PlantillaEnvioCliente,
} from '../../../../core/models/propuesta-modales.model';

/**
 * HU-10b — Enviar al cliente.
 * Se abre desde el detalle de propuesta en estado 'aprobado'. Permite editar PARA, CC,
 * asunto, cuerpo y aplicar una plantilla. Al enviar: marca la propuesta como 'enviado'
 * (inmutable) + dispara el correo vía Brevo + entra al pipeline de Seguimiento Comercial.
 */
@Component({
  selector: 'app-modal-enviar-cliente',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, EditorCorreoComponent],
  templateUrl: './modal-enviar-cliente.component.html',
  styleUrl: './modal-enviar-cliente.component.scss',
})
export class ModalEnviarClienteComponent {
  private readonly svc   = inject(PropuestasService);
  private readonly toast = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly cerrar      = output<void>();
  readonly enviado     = output<void>();

  readonly cargandoDatos  = signal(true);
  readonly datos          = signal<PreparacionEnvioCliente | null>(null);
  readonly enviando       = signal(false);
  readonly pdfUrl         = signal<string | null>(null);
  readonly pdfCargando    = signal(false);
  readonly pdfError       = signal<string>('');

  // Form state
  readonly idPlantilla = signal<number | null>(null);
  readonly para        = signal<string>('');   // CSV editable de correos
  readonly cc          = signal<string>('');
  readonly asunto      = signal<string>('');
  readonly cuerpoHtml  = signal<string>('');

  readonly subtitulo = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return `${d.cabecera.numero} · v${d.cabecera.version} / ${d.cabecera.razonSocial}`;
  });

  readonly puedeEnviar = computed(() => {
    return !this.enviando()
        && this.parseDestinatarios(this.para()).length > 0
        && this.asunto().trim().length > 0
        && this.cuerpoHtml().trim().length > 0;
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
      const d = await this.svc.prepararEnvioCliente(id);
      this.datos.set(d);
      // Prefill: PARA con contacto principal/propuesta del cliente
      const principal = d.contactos.find(c => c.esContactoPropuesta)
                     ?? d.contactos.find(c => c.esContactoPrincipal)
                     ?? d.contactos[0];
      if (principal?.correo) this.para.set(principal.correo);
      // Si hay plantilla, la aplico por defecto (la primera)
      if (d.plantillas.length > 0) this.aplicarPlantilla(d.plantillas[0].idPlantilla);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo preparar el envío.');
    } finally {
      this.cargandoDatos.set(false);
    }
    // Genera el PDF en paralelo para que el usuario pueda previsualizarlo antes de enviar.
    void this.cargarPdf(id);
  }

  private async cargarPdf(id: number): Promise<void> {
    this.pdfCargando.set(true);
    this.pdfError.set('');
    try {
      const blob = await this.svc.obtenerPdfBlob(id);
      // Revoca la URL anterior si hubiera
      const anterior = this.pdfUrl();
      if (anterior) URL.revokeObjectURL(anterior);
      this.pdfUrl.set(URL.createObjectURL(blob));
    } catch (e: unknown) {
      this.pdfError.set(e instanceof Error ? e.message : 'No se pudo generar la vista previa del PDF.');
    } finally {
      this.pdfCargando.set(false);
    }
  }

  verPdf(): void {
    const url = this.pdfUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  aplicarPlantilla(idPlantilla: number): void {
    const p = this.datos()?.plantillas.find(x => x.idPlantilla === idPlantilla);
    if (!p) return;
    this.idPlantilla.set(idPlantilla);
    this.asunto.set(p.asunto);
    this.cuerpoHtml.set(p.cuerpoHtml);
  }

  usarContacto(correo?: string | null): void {
    if (!correo) return;
    const actual = this.parseDestinatarios(this.para()).map(d => d.correo.toLowerCase());
    if (actual.includes(correo.toLowerCase())) return;
    const nuevo = this.para().trim();
    this.para.set(nuevo ? `${nuevo}, ${correo}` : correo);
  }

  onCerrar(): void {
    const url = this.pdfUrl();
    if (url) URL.revokeObjectURL(url);
    this.pdfUrl.set(null);
    this.cerrar.emit();
  }

  private parseDestinatarios(csv: string): { correo: string }[] {
    return csv.split(',').map(s => s.trim()).filter(Boolean).map(correo => ({ correo }));
  }

  async enviarCorreo(): Promise<void> {
    if (!this.puedeEnviar() || this.enviando()) return;
    this.enviando.set(true);
    try {
      const r = await this.svc.enviarAlCliente(this.idPropuesta(), {
        idPlantilla: this.idPlantilla(),
        para:        this.parseDestinatarios(this.para()),
        cc:          this.parseDestinatarios(this.cc()),
        asunto:      this.asunto().trim(),
        cuerpoHtml:  this.cuerpoHtml(),
      });
      if (r.correoEnviado) {
        this.toast.exito('Propuesta enviada al cliente. Ya aparece en Seguimiento Comercial.');
      } else {
        this.toast.info(
          'La propuesta se marcó como enviada pero el correo no salió: ' +
          (r.correoError || 'sin detalle') + '. Puedes reintentar el envío desde Seguimiento.'
        );
      }
      this.enviado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo enviar al cliente.');
    } finally {
      this.enviando.set(false);
    }
  }

  formatearMonto(monto: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const valor = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
    return `${s} ${valor}`;
  }

  trackByContacto = (_: number, c: { idContacto: number }) => c.idContacto;
  trackByPlantilla = (_: number, p: PlantillaEnvioCliente) => p.idPlantilla;
}
