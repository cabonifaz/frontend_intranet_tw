import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/ui/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ToastService } from '../../../../core/services/toast.service';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { MaestrosService } from '../../../../core/services/maestros.service';
import { DescuentoResultado } from '../../../../core/models/propuesta-modales.model';

interface MotivoOpcion {
  id:     number;
  nombre: string;
}

@Component({
  selector: 'app-modal-descuento-global',
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent],
  templateUrl: './modal-descuento-global.component.html',
  styleUrl: './modal-descuento-global.component.scss',
})
export class ModalDescuentoGlobalComponent {
  private readonly svc        = inject(PropuestasService);
  private readonly maestrosSvc = inject(MaestrosService);
  private readonly toast      = inject(ToastService);

  readonly idPropuesta = input.required<number>();
  readonly codigo      = input<string>('');
  /** 'principal' usa los endpoints HU-11. 'opcionales' usa los paralelos de la migración 48. */
  readonly seccion     = input<'principal' | 'opcionales'>('principal');
  readonly cerrar      = output<void>();
  readonly aplicado    = output<DescuentoResultado>();

  readonly tipo         = signal<'porcentaje' | 'monto'>('porcentaje');
  readonly valor        = signal<number>(0);
  readonly idMotivo     = signal<number | null>(null);
  readonly motivos      = signal<MotivoOpcion[]>([]);
  readonly preview      = signal<DescuentoResultado | null>(null);
  readonly cargandoPrev = signal(false);
  readonly aplicando    = signal(false);
  readonly quitando     = signal(false);

  readonly puedeAplicar = computed(() =>
    this.valor() > 0
    && this.idMotivo() !== null
    && !this.aplicando()
    && !this.cargandoPrev()
  );

  readonly tieneDescuentoAplicado = computed(() => {
    const p = this.preview();
    return !!p && p.descuentoActual > 0;
  });

  constructor() {
    // Al cambiar tipo o valor, recalcular preview con debounce ligero.
    let timeoutId: number | null = null;
    effect(() => {
      const t = this.tipo();
      const v = this.valor();
      const m = this.idMotivo();
      if (v <= 0) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => this.recalcular(t, v, m), 350) as unknown as number;
    });
  }

  /** Delegadores: eligen el endpoint principal o el de opcionales según el input [seccion]. */
  private previsualizar(dto: { tipo: 'porcentaje' | 'monto' | 'ninguno'; valor: number; idMotivoDescuento?: number | null }) {
    return this.seccion() === 'opcionales'
      ? this.svc.previsualizarDescuentoOpcionales(this.idPropuesta(), dto)
      : this.svc.previsualizarDescuento(this.idPropuesta(), dto);
  }
  private aplicarApi(dto: { tipo: 'porcentaje' | 'monto'; valor: number; idMotivoDescuento?: number | null }) {
    return this.seccion() === 'opcionales'
      ? this.svc.aplicarDescuentoOpcionales(this.idPropuesta(), dto)
      : this.svc.aplicarDescuento(this.idPropuesta(), dto);
  }
  private quitarApi() {
    return this.seccion() === 'opcionales'
      ? this.svc.quitarDescuentoOpcionales(this.idPropuesta())
      : this.svc.quitarDescuento(this.idPropuesta());
  }

  async ngOnInit(): Promise<void> {
    // Cargar motivos y previsualizar el descuento actual (si lo hay)
    try {
      const [cat, prevActual] = await Promise.all([
        this.maestrosSvc.obtenerCatalogo('MOTIVO_DESCUENTO').catch(() => [] as any[]),
        this.previsualizar({ tipo: 'ninguno', valor: 0 }).catch(() => null),
      ]);
      this.motivos.set(cat.map((c: any) => ({ id: Number(c.id), nombre: c.nombre })));
      if (prevActual) {
        this.preview.set(prevActual);
        if (prevActual.descuentoActual > 0) {
          this.tipo.set(prevActual.porcentajeActual != null ? 'porcentaje' : 'monto');
          this.valor.set(prevActual.porcentajeActual ?? prevActual.descuentoActual);
          this.idMotivo.set(prevActual.idMotivoDescuento ?? null);
        }
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar el descuento.');
    }
  }

  private async recalcular(tipo: 'porcentaje' | 'monto', valor: number, idMotivo: number | null): Promise<void> {
    this.cargandoPrev.set(true);
    try {
      const r = await this.previsualizar({ tipo, valor, idMotivoDescuento: idMotivo });
      this.preview.set(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo previsualizar.');
    } finally {
      this.cargandoPrev.set(false);
    }
  }

  async aplicar(): Promise<void> {
    if (!this.puedeAplicar()) return;
    this.aplicando.set(true);
    try {
      const r = await this.aplicarApi({
        tipo: this.tipo(), valor: this.valor(), idMotivoDescuento: this.idMotivo(),
      });
      this.aplicado.emit(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo aplicar el descuento.');
    } finally {
      this.aplicando.set(false);
    }
  }

  async quitar(): Promise<void> {
    if (this.quitando()) return;
    this.quitando.set(true);
    try {
      const r = await this.quitarApi();
      this.aplicado.emit(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo quitar el descuento.');
    } finally {
      this.quitando.set(false);
    }
  }

  onCerrar(): void { this.cerrar.emit(); }
}
