import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { VistoBuenoService } from '../../../../core/services/visto-bueno.service';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { AprobadorOpcion, ReasignarAprobadorRequest } from '../../../../core/models/visto-bueno.model';
import { ContextoAprobar } from '../modal-aprobar-vb/modal-aprobar-vb.component';

interface MotivoOpcion { id: number; nombre: string; }

@Component({
  selector: 'app-modal-reasignar-aprobador',
  imports: [FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-reasignar-aprobador.component.html',
  styleUrl: './modal-reasignar-aprobador.component.scss',
})
export class ModalReasignarAprobadorComponent implements OnInit {
  private readonly svc         = inject(VistoBuenoService);
  private readonly maestrosSvc = inject(MaestrosService);

  readonly contexto   = input.required<ContextoAprobar & { nombreAprobador: string; slaHorasRestantes: number; fechaSolicitud: string }>();
  readonly cerrar     = output<void>();
  readonly confirmado = output<ReasignarAprobadorRequest>();

  readonly busqueda          = signal<string>('');
  readonly resultadosAbiertos = signal<boolean>(false);
  readonly resultados        = signal<AprobadorOpcion[]>([]);
  readonly aprobadorSel      = signal<AprobadorOpcion | null>(null);

  readonly idMotivo          = signal<number | null>(null);
  readonly motivos           = signal<MotivoOpcion[]>([]);
  readonly comentario        = signal<string>('');
  readonly reiniciarSla      = signal<boolean>(false);
  readonly enviando          = signal<boolean>(false);

  readonly puedeReasignar = computed(() =>
    this.aprobadorSel() !== null && this.idMotivo() !== null && !this.enviando()
  );

  async ngOnInit(): Promise<void> {
    this.motivos.set([
      { id: 1, nombre: 'Monto excede autoridad del aprobador actual' },
      { id: 2, nombre: 'Conflicto de interés' },
      { id: 3, nombre: 'Especialidad técnica requerida' },
      { id: 4, nombre: 'Ausencia imprevista' },
      { id: 5, nombre: 'Rebalanceo de carga' },
    ]);
    this.maestrosSvc.obtenerCatalogo('MOTIVO_REASIGNACION_VB')
      .then(c => this.motivos.set(c.map((x: any) => ({ id: Number(x.id), nombre: x.nombre }))))
      .catch(() => { /* mantener mocks */ });

    await this.buscarAprobadores('');
  }

  async buscarAprobadores(texto: string): Promise<void> {
    this.busqueda.set(texto);
    try {
      const r = await this.svc.obtenerAprobadoresDisponibles(this.contexto().idVb, texto || undefined);
      this.resultados.set(r.filter(a => a.nombreCompleto !== this.contexto().nombreAprobador));
      this.resultadosAbiertos.set(true);
    } catch { /* silencioso */ }
  }

  seleccionar(a: AprobadorOpcion): void {
    this.aprobadorSel.set(a);
    this.busqueda.set(a.nombreCompleto);
    this.resultadosAbiertos.set(false);
  }

  limpiarSeleccion(): void {
    this.aprobadorSel.set(null);
    this.busqueda.set('');
    this.buscarAprobadores('');
  }

  reasignar(): void {
    if (!this.puedeReasignar()) return;
    this.enviando.set(true);
    this.confirmado.emit({
      idVb:             this.contexto().idVb,
      idNuevoAprobador: this.aprobadorSel()!.idUsuario,
      idMotivo:         this.idMotivo()!,
      comentario:       this.comentario().trim() || undefined,
      reiniciarSla:     this.reiniciarSla(),
    });
  }

  onCerrar(): void { this.cerrar.emit(); }

  iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/);
    const primera = partes[0]?.charAt(0) ?? '';
    const ultima  = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primera}${ultima}`.toUpperCase();
  }

  formatearFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  slaRestanteTexto(): string {
    const h = this.contexto().slaHorasRestantes;
    if (h < 0) return `Vencido ${Math.abs(Math.round(h))}h`;
    if (h < 1) return `${Math.round(h * 60)}min restantes`;
    return `${Math.round(h * 10) / 10}h restantes`;
  }
}
