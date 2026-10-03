import {
  Component, Input, Output, EventEmitter,
  inject, signal, computed, OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../../core/services/crm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AutenticacionService } from '../../../../core/services/autenticacion.service';
import { CatalogoItem } from '../../../../core/models/crm.model';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-anular-requerimiento',
  imports: [FormsModule, ButtonComponent],
  templateUrl: './anular-requerimiento.component.html',
  styleUrl:    './anular-requerimiento.component.scss',
})
export class AnularRequerimientoComponent {
  @Input() id!:          number;
  @Input() numero!:      string;
  @Input() razonSocial!: string;
  @Input() categoria:    string | null = null;
  @Input() motivos:      CatalogoItem[] = [];

  @Output() cerrar  = new EventEmitter<void>();
  @Output() anulado = new EventEmitter<void>();

  private readonly crmSvc  = inject(CrmService);
  private readonly toast   = inject(ToastService);
  private readonly authSvc = inject(AutenticacionService);

  readonly idMotivo     = signal(0);
  readonly justificacion = signal('');
  readonly confirmado   = signal(false);
  readonly guardando    = signal(false);

  readonly habilitado = computed(() =>
    this.idMotivo() > 0 &&
    this.justificacion().trim().length >= 10 &&
    this.confirmado() &&
    !this.guardando()
  );

  get nombreUsuario(): string {
    const u = this.authSvc.usuarioActual();
    return u ? `${u.nombre} ${u.apellido}` : '—';
  }

  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  async confirmar(): Promise<void> {
    if (!this.habilitado()) return;
    this.guardando.set(true);
    try {
      await this.crmSvc.anularRequerimiento(this.id, {
        idMotivo:      this.idMotivo(),
        justificacion: this.justificacion().trim(),
      });
      this.toast.exito(`Requerimiento ${this.numero} anulado correctamente.`);
      this.anulado.emit();
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al anular el requerimiento.');
    } finally {
      this.guardando.set(false);
    }
  }
}
