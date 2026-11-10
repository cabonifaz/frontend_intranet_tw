import { Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import {
  ItemBandejaVb,
  ResolverVbRequest,
} from '../../../../core/models/visto-bueno.model';

@Component({
  selector: 'app-modal-aprobar-vb',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-aprobar-vb.component.html',
  styleUrl: './modal-aprobar-vb.component.scss',
})
export class ModalAprobarVbComponent implements OnInit {
  readonly contexto    = input.required<ItemBandejaVb>();
  readonly cerrar      = output<void>();
  /** Emite el `(idPropuesta, dto)` cuando el padre debe llamar al endpoint resolver. */
  readonly confirmado  = output<{ idPropuesta: number; dto: ResolverVbRequest }>();

  readonly comentario       = signal<string>('');
  readonly enviando         = signal<boolean>(false);

  /** Observación 29 (31/10): se quitaron las validaciones automáticas.
   *  El aprobador puede aprobar solo con un mensaje (o incluso vacío). */
  readonly puedeAprobar = computed(() => !this.enviando());

  async ngOnInit(): Promise<void> { /* ya no cargamos validaciones */ }

  formatearMonto(valor: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    return `${s} ${v}`;
  }

  aprobar(): void {
    if (!this.puedeAprobar()) return;
    this.enviando.set(true);
    this.confirmado.emit({
      idPropuesta: this.contexto().idPropuesta,
      dto: {
        accion:     'aprobar',
        comentario: this.comentario().trim() || undefined,
      },
    });
  }

  onCerrar(): void { this.cerrar.emit(); }
}
