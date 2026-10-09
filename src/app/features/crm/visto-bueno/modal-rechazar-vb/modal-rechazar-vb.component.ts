import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { RechazarVbRequest } from '../../../../core/models/visto-bueno.model';
import { ContextoAprobar } from '../modal-aprobar-vb/modal-aprobar-vb.component';

interface MotivoOpcion { id: number; nombre: string; }

@Component({
  selector: 'app-modal-rechazar-vb',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-rechazar-vb.component.html',
  styleUrl: './modal-rechazar-vb.component.scss',
})
export class ModalRechazarVbComponent implements OnInit {
  private readonly maestrosSvc = inject(MaestrosService);

  readonly contexto   = input.required<ContextoAprobar>();
  readonly cerrar     = output<void>();
  readonly confirmado = output<RechazarVbRequest>();

  readonly idMotivo    = signal<number | null>(null);
  readonly justificacion = signal<string>('');
  readonly motivos     = signal<MotivoOpcion[]>([]);
  readonly enviando    = signal(false);

  readonly puedeRechazar = computed(() =>
    this.idMotivo() !== null && this.justificacion().trim().length >= 20 && !this.enviando()
  );

  async ngOnInit(): Promise<void> {
    // Mocks — en producción vendrán de MOTIVO_RECHAZO_VB
    this.motivos.set([
      { id: 1, nombre: 'Precio no competitivo' },
      { id: 2, nombre: 'Alcance insuficiente' },
      { id: 3, nombre: 'Condiciones comerciales no aceptables' },
      { id: 4, nombre: 'Cliente ya tiene propuesta aprobada similar' },
      { id: 5, nombre: 'Falta de información técnica suficiente' },
      { id: 6, nombre: 'Riesgo financiero elevado' },
    ]);
    this.maestrosSvc.obtenerCatalogo('MOTIVO_RECHAZO_VB')
      .then(c => this.motivos.set(c.map((x: any) => ({ id: Number(x.id), nombre: x.nombre }))))
      .catch(() => { /* mantener mocks */ });
  }

  formatearMonto(valor: number, simbolo: string): string {
    const v = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    return `${simbolo} ${v}`;
  }

  rechazar(): void {
    if (!this.puedeRechazar()) return;
    this.enviando.set(true);
    this.confirmado.emit({
      idVb:          this.contexto().idVb,
      idMotivo:      this.idMotivo()!,
      justificacion: this.justificacion().trim(),
    });
  }

  onCerrar(): void { this.cerrar.emit(); }
}
