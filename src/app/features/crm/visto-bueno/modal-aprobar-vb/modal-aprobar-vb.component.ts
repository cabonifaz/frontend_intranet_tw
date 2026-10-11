import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import {
  DecisionVb,
  ItemBandejaVb,
  ResolverVbRequest,
  ValidacionRequerida,
} from '../../../../core/models/visto-bueno.model';

@Component({
  selector: 'app-modal-aprobar-vb',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-aprobar-vb.component.html',
  styleUrl: './modal-aprobar-vb.component.scss',
})
export class ModalAprobarVbComponent implements OnInit {
  private readonly svc = inject(VistoBuenoService);

  readonly contexto    = input.required<ItemBandejaVb>();
  readonly cerrar      = output<void>();
  /** Emite el `(idPropuesta, dto)` cuando el padre debe llamar al endpoint resolver. */
  readonly confirmado  = output<{ idPropuesta: number; dto: ResolverVbRequest }>();

  readonly cargandoDatos    = signal<boolean>(true);
  readonly decision         = signal<DecisionVb | null>(null);
  readonly validaciones     = signal<ValidacionRequerida[]>([]);
  readonly confirmadas      = signal<Set<string>>(new Set());
  readonly comentario       = signal<string>('');
  readonly enviando         = signal<boolean>(false);

  /** Puede aprobar sólo cuando todas las validaciones OBLIGATORIAS están confirmadas. */
  readonly puedeAprobar = computed(() => {
    if (this.enviando() || this.cargandoDatos()) return false;
    const confirmadas = this.confirmadas();
    return this.validaciones().filter(v => v.obligatoria).every(v => confirmadas.has(v.codigo));
  });

  async ngOnInit(): Promise<void> {
    try {
      const d = await this.svc.prepararDecision(this.contexto().idPropuesta);
      this.decision.set(d);
      this.validaciones.set(d.validacionesRequeridas);
    } catch { /* el padre maneja el error */ }
    finally { this.cargandoDatos.set(false); }
  }

  toggleValidacion(codigo: string): void {
    const set = new Set(this.confirmadas());
    if (set.has(codigo)) set.delete(codigo);
    else set.add(codigo);
    this.confirmadas.set(set);
  }

  esConfirmada(codigo: string): boolean { return this.confirmadas().has(codigo); }

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
        accion:                  'aprobar',
        comentario:              this.comentario().trim() || undefined,
        validacionesConfirmadas: [...this.confirmadas()],
      },
    });
  }

  onCerrar(): void { this.cerrar.emit(); }
}
