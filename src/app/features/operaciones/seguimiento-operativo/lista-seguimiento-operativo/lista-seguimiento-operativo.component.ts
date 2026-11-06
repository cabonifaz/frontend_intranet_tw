import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SeguimientoOperativoService } from '../../../../core/services/seguimiento-operativo.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaSeguimientoOperativo, EstadoTecnicoCampo, SeveridadAlerta,
} from '../../../../core/models/seguimiento-operativo.model';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalDetalleServicioComponent } from '../modal-detalle-servicio/modal-detalle-servicio.component';

type Tab = 'vista_principal' | 'servicios' | 'tecnicos' | 'incidencias';

/**
 * HU-51 — Bandeja de Seguimiento Operativo (Módulo 11 Control de Campo).
 * Vista del Asistente de Servicio Técnico. 4 tabs: Vista Principal (mapa + alertas +
 * hitos), Servicios en Campo (tabla), Técnicos Activos (cards), Incidencias del Día.
 * Auto-refresh cada 30s.
 */
@Component({
  selector: 'app-lista-seguimiento-operativo',
  imports: [CommonModule, HeaderBandejaComponent, KpiGridComponent, KpiCardComponent, TablaPaginadaComponent, ButtonComponent, ModalDetalleServicioComponent],
  templateUrl: './lista-seguimiento-operativo.component.html',
  styleUrl: './lista-seguimiento-operativo.component.scss',
})
export class ListaSeguimientoOperativoComponent implements OnInit, OnDestroy {
  private readonly svc   = inject(SeguimientoOperativoService);
  private readonly toast = inject(ToastService);
  readonly router        = inject(Router);

  private intervalRefresh: ReturnType<typeof setInterval> | null = null;

  readonly cargando = signal(true);
  readonly bandeja  = signal<BandejaSeguimientoOperativo | null>(null);
  readonly tab      = signal<Tab>('vista_principal');
  readonly idDetalleAbierto = signal<number | null>(null);

  readonly kpis = computed(() => this.bandeja()?.kpis);
  readonly vistaPrincipal = computed(() => this.bandeja()?.vistaPrincipal);
  readonly servicios      = computed(() => this.bandeja()?.serviciosEnCampo ?? []);
  readonly tecnicos       = computed(() => this.bandeja()?.tecnicosActivos ?? []);
  readonly incidencias    = computed(() => this.bandeja()?.incidenciasDia ?? []);

  async ngOnInit(): Promise<void> {
    await this.cargar();
    // HU-51: auto-refresh cada 30 segundos
    this.intervalRefresh = setInterval(() => this.cargar(true), 30_000);
  }

  ngOnDestroy(): void {
    if (this.intervalRefresh) clearInterval(this.intervalRefresh);
  }

  async cargar(silencioso = false): Promise<void> {
    if (!silencioso) this.cargando.set(true);
    try {
      const r = await this.svc.obtenerBandeja();
      this.bandeja.set(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la bandeja.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarTab(t: Tab): void { this.tab.set(t); }

  verDetalleServicio(idServicio: number): void {
    this.idDetalleAbierto.set(idServicio);
  }

  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  async onDetalleActualizado(): Promise<void> {
    await this.cargar(true);
  }

  verAlerta(idServicio: number): void {
    this.verDetalleServicio(idServicio);
  }

  llamarTecnico(telefono: string, nombre: string): void {
    this.toast.info(`Llamando a ${nombre} (${telefono})…`);
    // En móvil: window.open(`tel:${telefono}`);
  }

  // ─── Helpers de estado ───────────────────────────────────────────────────

  claseEstado(e: EstadoTecnicoCampo): string {
    switch (e) {
      case 'sin_salir':      return 'chip chip--gris';
      case 'en_ruta':        return 'chip chip--azul';
      case 'en_planta':
      case 'en_ejecucion':   return 'chip chip--verde';
      case 'con_demora':     return 'chip chip--ambar';
      case 'con_incidente':  return 'chip chip--rojo';
      case 'finalizado':     return 'chip chip--gris-oscuro';
      default:                return 'chip';
    }
  }

  etiquetaEstado(e: EstadoTecnicoCampo): string {
    switch (e) {
      case 'sin_salir':      return 'Sin salir';
      case 'en_ruta':        return 'En ruta';
      case 'en_planta':      return 'En planta';
      case 'en_ejecucion':   return 'En ejecución';
      case 'con_demora':     return 'Con demora';
      case 'con_incidente':  return 'Incidente crítico';
      case 'finalizado':     return 'Finalizado';
      default:                return e;
    }
  }

  chipSeveridad(s: SeveridadAlerta): string {
    switch (s) {
      case 'critica':      return 'chip chip--rojo';
      case 'advertencia':  return 'chip chip--ambar';
      case 'info':         return 'chip chip--azul';
      default:              return 'chip';
    }
  }

  labelSeveridad(s: SeveridadAlerta): string {
    switch (s) {
      case 'critica':      return 'Crítica';
      case 'advertencia':  return 'Advertencia';
      case 'info':         return 'Info';
      default:              return s;
    }
  }
}
