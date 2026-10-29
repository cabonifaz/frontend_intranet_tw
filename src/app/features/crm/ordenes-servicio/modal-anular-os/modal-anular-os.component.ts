import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { OrdenesServicioService } from '../../../../core/services/ordenes-servicio.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ImpactoAnulacionOs, MotivoAnulacionOs } from '../../../../core/models/ordenes-servicio.model';

/**
 * HU-40 Fase C — Modal "Anular Orden de Servicio / Metrología".
 * Si la OS/OM ya está PROGRAMADA, muestra el impacto (técnico, fecha, viáticos liberados).
 * El flujo real por rol/estado se maneja en la ficha; este modal recoge la justificación.
 */
@Component({
  selector: 'app-modal-anular-os',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-anular-os.component.html',
  styleUrl: './modal-anular-os.component.scss',
})
export class ModalAnularOsComponent implements OnInit {
  readonly idOs         = input.required<number>();
  readonly numeroOs     = input.required<string>();
  readonly razonSocial  = input<string>('');

  readonly cerrar     = output<void>();
  readonly anulada    = output<void>();

  private readonly svc   = inject(OrdenesServicioService);
  private readonly toast = inject(ToastService);

  readonly cargando  = signal(true);
  readonly anulando  = signal(false);

  readonly motivos  = signal<MotivoAnulacionOs[]>([]);
  readonly impacto  = signal<ImpactoAnulacionOs | null>(null);

  readonly idMotivoSel  = signal<number | null>(null);
  readonly justificacion = signal('');

  readonly minJustificacion = 20;
  readonly maxJustificacion = 500;

  readonly puedeAnular = computed(() =>
    this.idMotivoSel() != null && this.justificacion().trim().length >= this.minJustificacion,
  );

  async ngOnInit(): Promise<void> {
    try {
      const [motivos, impacto] = await Promise.all([
        this.svc.obtenerMotivosAnulacion(),
        this.svc.obtenerImpactoAnulacion(this.idOs()),
      ]);
      this.motivos.set(motivos);
      this.impacto.set(impacto);
      if (motivos.length > 0) this.idMotivoSel.set(motivos[0].idMotivo);
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo cargar la información.');
    } finally {
      this.cargando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    if (!this.puedeAnular()) return;
    this.anulando.set(true);
    try {
      await this.svc.anular({
        idOs:          this.idOs(),
        idMotivo:      this.idMotivoSel()!,
        justificacion: this.justificacion().trim(),
      });
      this.toast.exito(`${this.numeroOs()} anulada correctamente.`);
      this.anulada.emit();
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo anular la OS/OM.');
    } finally {
      this.anulando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
