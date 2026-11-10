import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RevisionInformesService } from '../../../../core/services/revision-informes.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CodigoChecklistRevision, ItemChecklistRevisionApi, PreparacionRevisionApi } from '../../../../core/models/revision-informes-api.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

/**
 * HU-59 — Modal "Registrar Revisión del Informe" (Módulo 12).
 * Muestra el checklist 5/5 que arma el back, una nota opcional del supervisor y el impacto tras el cierre.
 * Al confirmar, el informe queda inmutable.
 */
@Component({
  selector: 'app-modal-registrar-revision',
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './modal-registrar-revision.component.html',
  styleUrl: './modal-registrar-revision.component.scss',
})
export class ModalRegistrarRevisionComponent implements OnInit {
  private readonly svc   = inject(RevisionInformesService);
  private readonly toast = inject(ToastService);

  readonly idInforme = input.required<number>();

  readonly cerrar     = output<void>();
  readonly confirmado = output<number>();

  readonly cargando     = signal(true);
  readonly guardando    = signal(false);
  readonly error        = signal<string | null>(null);
  readonly preparacion  = signal<PreparacionRevisionApi | null>(null);

  nota = '';
  readonly MAX_NOTA = 500;

  readonly cabecera  = computed(() => this.preparacion()?.cabecera ?? null);
  readonly checklist = computed<ItemChecklistRevisionApi[]>(() => this.preparacion()?.checklist ?? []);

  async ngOnInit(): Promise<void> {
    try {
      this.preparacion.set(await this.svc.prepararRevision(this.idInforme()));
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo preparar la revisión.');
    } finally {
      this.cargando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    const cab = this.cabecera();
    if (!cab || !cab.puedeConfirmar) return;
    this.guardando.set(true);
    try {
      const r = await this.svc.registrarRevision(this.idInforme(), { nota: this.nota.trim() || null });
      this.toast.exito('Informe marcado como revisado.');
      this.confirmado.emit(r.idInforme);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo registrar la revisión.');
    } finally {
      this.guardando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }

  iconoItem(c: CodigoChecklistRevision | null): string {
    switch (c) {
      case 'fotos':         return 'image';
      case 'ensayos':       return 'science';
      case 'observaciones': return 'warning';
      case 'precotizacion': return 'receipt_long';
      case 'procedimiento': return 'checklist';
      default:              return 'check_circle';
    }
  }
}
