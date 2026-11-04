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

  /** Observación 22 (31/10): id de la propuesta ya persistida. Si es `null` el
   *  modal opera en **modo local**: el descuento se calcula contra `subtotalLocal`
   *  y se emite al padre para que lo guarde en el draft, sin llamar al back
   *  (se sincroniza al guardar la propuesta por primera vez). */
  readonly idPropuesta = input<number | null>(null);
  readonly codigo      = input<string>('');
  /** Subtotal calculado en memoria por el padre, requerido en modo local. */
  readonly subtotalLocal = input<number>(0);
  /** 'principal' usa los endpoints HU-11. 'opcionales' usa los paralelos de la migración 48. */
  readonly seccion     = input<'principal' | 'opcionales'>('principal');
  readonly cerrar      = output<void>();
  readonly aplicado    = output<DescuentoResultado>();

  /** Si no hay idPropuesta todavía, trabajamos solo con el draft. */
  readonly modoLocal = computed(() => !this.idPropuesta());

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

  /** Delegadores: eligen el endpoint principal o el de opcionales según el input [seccion].
   *  Si el modal está en modo local (sin idPropuesta aún), calculamos todo en memoria. */
  private previsualizar(dto: { tipo: 'porcentaje' | 'monto' | 'ninguno'; valor: number; idMotivoDescuento?: number | null }): Promise<DescuentoResultado> {
    if (this.modoLocal()) return Promise.resolve(this.calcularLocal(dto));
    const id = this.idPropuesta()!;
    return this.seccion() === 'opcionales'
      ? this.svc.previsualizarDescuentoOpcionales(id, dto)
      : this.svc.previsualizarDescuento(id, dto);
  }
  private aplicarApi(dto: { tipo: 'porcentaje' | 'monto'; valor: number; idMotivoDescuento?: number | null }): Promise<DescuentoResultado> {
    if (this.modoLocal()) return Promise.resolve(this.calcularLocal(dto));
    const id = this.idPropuesta()!;
    return this.seccion() === 'opcionales'
      ? this.svc.aplicarDescuentoOpcionales(id, dto)
      : this.svc.aplicarDescuento(id, dto);
  }
  private quitarApi(): Promise<DescuentoResultado> {
    if (this.modoLocal()) return Promise.resolve(this.calcularLocal({ tipo: 'ninguno', valor: 0 }));
    const id = this.idPropuesta()!;
    return this.seccion() === 'opcionales'
      ? this.svc.quitarDescuentoOpcionales(id)
      : this.svc.quitarDescuento(id);
  }

  /** Observación 22 (31/10): cálculo local del resultado cuando la propuesta aún no se guardó. */
  private calcularLocal(dto: { tipo: 'porcentaje' | 'monto' | 'ninguno'; valor: number; idMotivoDescuento?: number | null }): DescuentoResultado {
    const subtotal = this.subtotalLocal() || 0;
    let descuentoNuevo = 0;
    let porcentaje: number | null = null;
    if (dto.tipo === 'porcentaje' && dto.valor > 0) {
      porcentaje = dto.valor;
      descuentoNuevo = subtotal * (dto.valor / 100);
    } else if (dto.tipo === 'monto' && dto.valor > 0) {
      descuentoNuevo = Math.min(dto.valor, subtotal);
      porcentaje = subtotal > 0 ? (descuentoNuevo / subtotal) * 100 : null;
    }
    const igvPct = 18;
    const igvNuevo = (subtotal - descuentoNuevo) * (igvPct / 100);
    return {
      subtotalActual:     subtotal,
      descuentoActual:    0,
      porcentajeActual:   null,
      igvActual:          subtotal * (igvPct / 100),
      totalActual:        subtotal * (1 + igvPct / 100),

      tipo:               dto.tipo === 'ninguno' ? 'ninguno' : dto.tipo,
      porcentaje,
      descuentoNuevo,
      subtotalNuevo:      subtotal - descuentoNuevo,
      igvNuevo,
      totalNuevo:         subtotal - descuentoNuevo + igvNuevo,
      igvPct,

      idMotivoDescuento:  dto.idMotivoDescuento ?? null,
    } as DescuentoResultado;
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
