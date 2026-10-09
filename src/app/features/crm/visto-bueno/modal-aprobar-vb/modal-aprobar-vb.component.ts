import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { AprobarVbRequest } from '../../../../core/models/visto-bueno.model';

export interface ContextoAprobar {
  idVb:            number;
  codigoPropuesta: string;
  version:         number;
  razonSocial:     string;
  nombreComercial: string;
  monto:           number;
  monedaSimbolo:   string;
}

@Component({
  selector: 'app-modal-aprobar-vb',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-aprobar-vb.component.html',
  styleUrl: './modal-aprobar-vb.component.scss',
})
export class ModalAprobarVbComponent {
  readonly contexto    = input.required<ContextoAprobar>();
  readonly cerrar      = output<void>();
  readonly confirmado  = output<AprobarVbRequest>();

  readonly comentario = signal<string>('');
  readonly confirmo   = signal<boolean>(false);
  readonly enviando   = signal<boolean>(false);

  readonly puedeAprobar = computed(() => this.confirmo() && !this.enviando());

  formatearMonto(valor: number, simbolo: string): string {
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    return `${simbolo} ${v}`;
  }

  aprobar(): void {
    if (!this.puedeAprobar()) return;
    this.enviando.set(true);
    this.confirmado.emit({
      idVb:             this.contexto().idVb,
      comentario:       this.comentario().trim() || undefined,
      confirmoRevision: true,
    });
  }

  onCerrar(): void { this.cerrar.emit(); }
}
