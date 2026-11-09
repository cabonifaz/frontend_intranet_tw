import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PrecotizacionesService } from '../../../../core/services/precotizaciones.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaPrecotizacionesApi, EstadoPrecotizacion, FiltrosPrecotizacionesQs,
  ItemBandejaPrecotizacionApi,
} from '../../../../core/models/precotizaciones-api.model';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InicialesPipe } from '../../../../shared/pipes/iniciales.pipe';
import { ModalDetallePrecotizacionComponent } from '../modal-detalle-precotizacion/modal-detalle-precotizacion.component';

/**
 * HU-60 — Tab "Precotizaciones Técnicas" dentro de la Bandeja de Propuestas (CRM).
 * Vista del Ejecutivo Comercial: lista las precotizaciones que llegan desde el supervisor técnico
 * (Mód 12) y permite abrir el detalle o convertir en propuesta derivada.
 */
@Component({
  selector: 'app-tab-precotizaciones',
  imports: [
    CommonModule, FormsModule, KpiGridComponent, KpiCardComponent, BarraFiltrosBandejaComponent,
    TablaPaginadaComponent, ButtonComponent, InicialesPipe, ModalDetallePrecotizacionComponent,
  ],
  templateUrl: './tab-precotizaciones.component.html',
  styleUrl: './tab-precotizaciones.component.scss',
})
export class TabPrecotizacionesComponent implements OnInit {
  private readonly svc    = inject(PrecotizacionesService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal<string | null>(null);
  readonly bandeja   = signal<BandejaPrecotizacionesApi | null>(null);
  readonly idDetalleAbierto = signal<number | null>(null);

  readonly filtros = signal<FiltrosPrecotizacionesQs>({ pagina: 1, porPagina: 10 });

  // Drafts
  busqueda                           = '';
  idSupervisorDraft: number | null   = null;
  estadoDraft: EstadoPrecotizacion | 'todas' | null = 'todas';
  fechaDesdeDraft                    = '';
  fechaHastaDraft                    = '';

  readonly tarjetas     = computed(() => this.bandeja()?.tarjetas);
  readonly items        = computed<ItemBandejaPrecotizacionApi[]>(() => this.bandeja()?.items ?? []);
  readonly total        = computed(() => this.bandeja()?.total ?? 0);
  readonly supervisores = computed(() => this.bandeja()?.supervisores ?? []);

  readonly filtrosActivos = computed<number>(() => {
    let n = 0;
    if (this.idSupervisorDraft != null) n++;
    if (this.estadoDraft && this.estadoDraft !== 'todas') n++;
    if (this.fechaDesdeDraft) n++;
    if (this.fechaHastaDraft) n++;
    return n;
  });

  async ngOnInit(): Promise<void> { await this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.bandeja.set(await this.svc.obtenerBandeja(this.filtros()));
    } catch (e: unknown) {
      const m = e instanceof Error && e.message ? e.message : 'No se pudo cargar la bandeja.';
      if (!this.bandeja()) this.error.set(m); else this.toast.error(m);
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltros(): Promise<void> {
    this.filtros.set({
      estado:       this.estadoDraft === 'todas' ? null : this.estadoDraft,
      busqueda:     this.busqueda.trim() || null,
      idSupervisor: this.idSupervisorDraft,
      fechaDesde:   this.fechaDesdeDraft || null,
      fechaHasta:   this.fechaHastaDraft || null,
      pagina:       1,
      porPagina:    10,
    });
    await this.cargar();
  }

  async limpiarFiltros(): Promise<void> {
    this.busqueda           = '';
    this.idSupervisorDraft  = null;
    this.estadoDraft        = 'todas';
    this.fechaDesdeDraft    = '';
    this.fechaHastaDraft    = '';
    await this.aplicarFiltros();
  }

  async irPagina(n: number): Promise<void> {
    this.filtros.set({ ...this.filtros(), pagina: n });
    await this.cargar();
  }

  verDetalle(idPrecotizacion: number): void {
    this.idDetalleAbierto.set(idPrecotizacion);
  }

  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  onGenerarPropuesta(idPrecotizacion: number): void {
    // Lleva a la ficha nueva propuesta con precarga desde la precotización
    this.router.navigate(['/crm/propuestas/nueva'], {
      queryParams: { origenPrecotizacion: idPrecotizacion },
    });
  }

  async onConvertida(): Promise<void> {
    this.idDetalleAbierto.set(null);
    await this.cargar();
  }

  // ─── Helpers UI ─────────────────────────────────────────────────────────

  claseEstado(grupo: EstadoPrecotizacion | null): string {
    return grupo === 'convertida' ? 'chip chip--verde' : 'chip chip--ambar';
  }
  iconoEstado(grupo: EstadoPrecotizacion | null): string {
    return grupo === 'convertida' ? 'check' : 'schedule';
  }
}
