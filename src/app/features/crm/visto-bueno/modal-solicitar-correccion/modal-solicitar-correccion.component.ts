import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import {
  AreaCorreccion,
  DecisionVb,
  ItemBandejaVb,
  ResolverVbRequest,
} from '../../../../core/models/visto-bueno.model';

@Component({
  selector: 'app-modal-solicitar-correccion',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-solicitar-correccion.component.html',
  styleUrl: './modal-solicitar-correccion.component.scss',
})
export class ModalSolicitarCorreccionComponent implements OnInit {
  private readonly svc = inject(VistoBuenoService);

  readonly contexto    = input.required<ItemBandejaVb>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<{ idPropuesta: number; dto: ResolverVbRequest }>();

  readonly cargandoDatos  = signal(true);
  readonly areas          = signal<AreaCorreccion[]>([]);
  readonly areasSel       = signal<Set<string>>(new Set());
  readonly observaciones  = signal<string>('');
  readonly enviando       = signal(false);

  readonly puedeEnviar = computed(() =>
    this.areasSel().size > 0 &&
    this.observaciones().trim().length >= 10 &&
    !this.enviando()
  );

  async ngOnInit(): Promise<void> {
    try {
      const d: DecisionVb = await this.svc.prepararDecision(this.contexto().idPropuesta);
      this.areas.set(d.areasCorreccion);
    } catch { /* silencioso */ }
    finally { this.cargandoDatos.set(false); }
  }

  toggleArea(codigo: string): void {
    const set = new Set(this.areasSel());
    if (set.has(codigo)) set.delete(codigo);
    else set.add(codigo);
    this.areasSel.set(set);
  }

  seleccionada(codigo: string): boolean { return this.areasSel().has(codigo); }

  solicitar(): void {
    if (!this.puedeEnviar()) return;
    this.enviando.set(true);
    // Observación 27 (31/10): se quitó la fecha límite del flujo; el back ya acepta null.
    this.confirmado.emit({
      idPropuesta: this.contexto().idPropuesta,
      dto: {
        accion:      'corregir',
        areas:       [...this.areasSel()],
        comentario:  this.observaciones().trim(),
      },
    });
  }

  onCerrar(): void { this.cerrar.emit(); }
}
