import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { JefeComercialOs, MotivoEdicionOs } from '../../../../core/models/ordenes-servicio.model';

/**
 * HU-40 Fase C — Modal "Solicitar Edición al Jefe Comercial".
 * Se abre cuando una OS/OM está EMITIDA y el comercial responsable quiere editarla.
 */
@Component({
  selector: 'app-modal-solicitar-edicion-os',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-solicitar-edicion-os.component.html',
  styleUrl: './modal-solicitar-edicion-os.component.scss',
})
export class ModalSolicitarEdicionOsComponent implements OnInit {
  readonly idOs         = input.required<number>();
  readonly numeroOs     = input.required<string>();
  readonly razonSocial  = input<string>('');

  readonly cerrar  = output<void>();
  readonly enviada = output<void>();

  private readonly svc   = inject(OrdenesServicioService);
  private readonly toast = inject(ToastService);

  readonly cargando = signal(true);
  readonly enviando = signal(false);

  readonly motivos      = signal<MotivoEdicionOs[]>([]);
  readonly jefe         = signal<JefeComercialOs | null>(null);

  idMotivoSel: number | null = null;
  comentario = '';

  readonly minComentario = 20;
  readonly maxComentario = 500;

  readonly puedeEnviar = computed(() =>
    this.idMotivoSel != null && this.comentario.trim().length >= this.minComentario,
  );

  async ngOnInit(): Promise<void> {
    try {
      const [motivos, jefe] = await Promise.all([
        this.svc.obtenerMotivosEdicion(),
        this.svc.obtenerJefeComercial(this.idOs()),
      ]);
      this.motivos.set(motivos);
      this.jefe.set(jefe);
      if (motivos.length > 0) this.idMotivoSel = motivos[0].idMotivo;
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo cargar la información.');
    } finally {
      this.cargando.set(false);
    }
  }

  async enviar(): Promise<void> {
    if (!this.puedeEnviar()) return;
    this.enviando.set(true);
    try {
      await this.svc.solicitarEdicion({
        idOs:       this.idOs(),
        idMotivo:   this.idMotivoSel!,
        comentario: this.comentario.trim(),
      });
      this.toast.exito(`Solicitud enviada al Jefe Comercial ${this.jefe()?.nombre}.`);
      this.enviada.emit();
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo enviar la solicitud.');
    } finally {
      this.enviando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
