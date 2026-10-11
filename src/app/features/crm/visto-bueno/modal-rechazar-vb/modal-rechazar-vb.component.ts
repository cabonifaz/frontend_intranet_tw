import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import {
  DecisionVb,
  ItemBandejaVb,
  OpcionCatalogoVb,
  ResolverVbRequest,
} from '../../../../core/models/visto-bueno.model';

@Component({
  selector: 'app-modal-rechazar-vb',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-rechazar-vb.component.html',
  styleUrl: './modal-rechazar-vb.component.scss',
})
export class ModalRechazarVbComponent implements OnInit {
  private readonly svc = inject(VistoBuenoService);

  readonly contexto    = input.required<ItemBandejaVb>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<{ idPropuesta: number; dto: ResolverVbRequest }>();

  readonly motivos        = signal<OpcionCatalogoVb[]>([]);
  readonly idMotivo       = signal<number | null>(null);
  readonly justificacion  = signal<string>('');
  readonly enviando       = signal(false);
  readonly cargandoDatos  = signal(true);

  readonly puedeRechazar = computed(() =>
    this.idMotivo() !== null &&
    this.justificacion().trim().length >= 10 &&
    !this.enviando()
  );

  async ngOnInit(): Promise<void> {
    try {
      const d: DecisionVb = await this.svc.prepararDecision(this.contexto().idPropuesta);
      this.motivos.set(d.motivosRechazo);
    } catch { /* el padre maneja el error */ }
    finally { this.cargandoDatos.set(false); }
  }

  formatearMonto(valor: number, simbolo?: string | null): string {
    const s = simbolo ?? 'S/';
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    return `${s} ${v}`;
  }

  rechazar(): void {
    if (!this.puedeRechazar()) return;
    this.enviando.set(true);
    this.confirmado.emit({
      idPropuesta: this.contexto().idPropuesta,
      dto: {
        accion:          'rechazar',
        idMotivoRechazo: this.idMotivo()!,
        comentario:      this.justificacion().trim(),
      },
    });
  }

  onCerrar(): void { this.cerrar.emit(); }
}
