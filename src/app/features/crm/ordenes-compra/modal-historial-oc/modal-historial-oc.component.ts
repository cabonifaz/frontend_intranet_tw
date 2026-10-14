import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../../core/services/toast.service';
import { OrdenesCompraService } from '../../../../core/services/ordenes-compra.service';
import { AuditoriaOrdenCompraDto, EventoTimelineAuditoriaDto } from '../../../../core/models/ordenes-compra.model';

@Component({
  selector: 'app-modal-historial-oc',
  imports: [CommonModule, DatePipe, ButtonComponent, ModalComponent],
  templateUrl: './modal-historial-oc.component.html',
  styleUrl: './modal-historial-oc.component.scss',
})
export class ModalHistorialOcComponent {
  private readonly svc   = inject(OrdenesCompraService);
  private readonly toast = inject(ToastService);

  readonly idOc     = input.required<number>();
  readonly numeroOc = input<string>('');
  readonly cerrar   = output<void>();

  readonly cargando = signal(true);
  readonly datos    = signal<AuditoriaOrdenCompraDto | null>(null);

  constructor() {
    effect(() => {
      const id = this.idOc();
      if (id > 0) void this.cargar(id);
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    try {
      this.datos.set(await this.svc.obtenerAuditoria(id));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar el historial.');
    } finally {
      this.cargando.set(false);
    }
  }

  async descargarXlsx(): Promise<void> {
    try {
      await this.svc.descargarAuditoriaXlsx(this.idOc(), this.numeroOc());
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo descargar la auditoría.');
    }
  }
  imprimir(): void { window.print(); }
  onCerrar(): void { this.cerrar.emit(); }

  iconoEvento(codigo: string): string {
    // Mapa aproximado — el back usa códigos variables; dejamos un fallback
    if (codigo.includes('creada') || codigo.includes('registro')) return 'add_circle';
    if (codigo.includes('editada') || codigo.includes('edicion')) return 'edit';
    if (codigo.includes('documento') || codigo.includes('pdf'))   return 'autorenew';
    if (codigo.includes('observada') || codigo.includes('observ')) return 'flag';
    if (codigo.includes('validada') || codigo.includes('valid'))  return 'verified';
    if (codigo.includes('liberada') || codigo.includes('liber'))  return 'rocket_launch';
    if (codigo.includes('anulada'))                                return 'cancel';
    if (codigo.includes('complementaria'))                         return 'add_to_queue';
    if (codigo.includes('distribu'))                               return 'account_tree';
    return 'history';
  }

  claseEvento(nivel: string): string {
    switch (nivel) {
      case 'exito':      return 'ev--verde';
      case 'alerta':     return 'ev--ambar';
      case 'documento':  return 'ev--azul';
      case 'neutro':     return 'ev--azul';
      case 'info':
      default:           return 'ev--azul';
    }
  }

  trackEvento = (_: number, e: EventoTimelineAuditoriaDto) => `${e.fecha}-${e.codigo}`;
}
