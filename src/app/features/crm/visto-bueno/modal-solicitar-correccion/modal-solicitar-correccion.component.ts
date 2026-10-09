import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import {
  AreaCorreccion,
  AREAS_CORRECCION,
  SolicitarCorreccionRequest,
} from '../../../../core/models/visto-bueno.model';
import { ContextoAprobar } from '../modal-aprobar-vb/modal-aprobar-vb.component';

@Component({
  selector: 'app-modal-solicitar-correccion',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-solicitar-correccion.component.html',
  styleUrl: './modal-solicitar-correccion.component.scss',
})
export class ModalSolicitarCorreccionComponent {
  readonly contexto   = input.required<ContextoAprobar & { nombreComercial: string }>();
  readonly cerrar     = output<void>();
  readonly confirmado = output<SolicitarCorreccionRequest>();

  readonly areas          = AREAS_CORRECCION;
  readonly areasSel       = signal<Set<AreaCorreccion>>(new Set());
  readonly observaciones  = signal<string>('');
  readonly fechaLimite    = signal<string>(this.fechaDefault());
  readonly enviando       = signal(false);

  readonly puedeEnviar = computed(() =>
    this.areasSel().size > 0 &&
    this.observaciones().trim().length >= 20 &&
    !!this.fechaLimite() &&
    !this.enviando()
  );

  toggleArea(a: AreaCorreccion): void {
    const set = new Set(this.areasSel());
    if (set.has(a)) set.delete(a);
    else set.add(a);
    this.areasSel.set(set);
  }

  seleccionada(a: AreaCorreccion): boolean { return this.areasSel().has(a); }

  solicitar(): void {
    if (!this.puedeEnviar()) return;
    this.enviando.set(true);
    this.confirmado.emit({
      idVb:          this.contexto().idVb,
      areas:         [...this.areasSel()],
      observaciones: this.observaciones().trim(),
      fechaLimite:   new Date(this.fechaLimite()).toISOString(),
    });
  }

  onCerrar(): void { this.cerrar.emit(); }

  private fechaDefault(): string {
    // Default: hoy + 24h, formato datetime-local YYYY-MM-DDThh:mm
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
