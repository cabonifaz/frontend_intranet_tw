import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ExpedientesDigitalesService } from '../../../../core/services/expedientes-digitales.service';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import {
  BandejaExpedientesDto,
  FilaExpedienteDto,
  FiltrosBandejaExpedientesDto,
  TarjetasExpedientesDto,
} from '../../../../core/models/expedientes-digitales.model';

const BANDEJA_VACIA: TarjetasExpedientesDto = {
  activos: 0, listosParaAvanzar: 0, bloqueados: 0, conExcepcion: 0, slaVencidos: 0,
};

@Component({
  selector: 'app-lista-expedientes',
  imports: [
    CommonModule, FormsModule,
    HeaderBandejaComponent,
    KpiCardComponent, KpiGridComponent,
    BarraFiltrosBandejaComponent,
    TablaPaginadaComponent,
  ],
  templateUrl: './lista-expedientes.component.html',
  styleUrl: './lista-expedientes.component.scss',
})
export class ListaExpedientesComponent implements OnInit {
  private readonly svc    = inject(ExpedientesDigitalesService);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);

  readonly breadcrumb = breadcrumbCrm('Expedientes Digitales');
  readonly cargando   = signal(true);
  readonly descargando = signal(false);
  readonly bandeja    = signal<BandejaExpedientesDto | null>(null);

  // ── Filtros (modelos directos para ngModel dentro del popover) ──
  busqueda       = '';
  estadoFiltro   = '';
  etapaFiltro    = '';
  clienteFiltro: number | '' = '';
  areaFiltro     = '';
  tipoFiltro     = '';
  slaFiltro      = '';
  desdeFiltro    = '';
  hastaFiltro    = '';

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);

  // ── Derivados ───────────────────────────────────────────────────
  readonly items     = computed(() => this.bandeja()?.filas ?? []);
  readonly tarjetas  = computed(() => this.bandeja()?.tarjetas ?? BANDEJA_VACIA);
  readonly total     = computed(() => this.bandeja()?.total ?? 0);

  readonly estados       = computed(() => this.bandeja()?.estados ?? []);
  readonly etapas        = computed(() => this.bandeja()?.etapas ?? []);
  readonly clientes      = computed(() => this.bandeja()?.clientes ?? []);
  readonly areas         = computed(() => this.bandeja()?.areas ?? []);
  readonly tiposPropuesta = computed(() => this.bandeja()?.tiposPropuesta ?? []);
  readonly estadosSla    = computed(() => this.bandeja()?.estadosSla ?? []);

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.porPagina())));
  readonly rangoDesde   = computed(() => this.total() === 0 ? 0 : (this.pagina() - 1) * this.porPagina() + 1);
  readonly rangoHasta   = computed(() => Math.min(this.pagina() * this.porPagina(), this.total()));

  /** Contador de filtros activos (badge del popover). */
  filtrosActivos(): number {
    let n = 0;
    if (this.estadoFiltro)        n++;
    if (this.etapaFiltro)         n++;
    if (this.clienteFiltro !== '') n++;
    if (this.areaFiltro)          n++;
    if (this.tipoFiltro)          n++;
    if (this.slaFiltro)           n++;
    if (this.desdeFiltro)         n++;
    if (this.hastaFiltro)         n++;
    return n;
  }

  async ngOnInit(): Promise<void> { await this.cargar(); }

  private armarFiltros(): FiltrosBandejaExpedientesDto {
    return {
      pagina:        this.pagina(),
      porPagina:     this.porPagina(),
      busqueda:      this.busqueda.trim() || undefined,
      estado:        this.estadoFiltro  || undefined,
      etapa:         this.etapaFiltro   || undefined,
      idCliente:     this.clienteFiltro === '' ? undefined : this.clienteFiltro,
      area:          this.areaFiltro    || undefined,
      tipoPropuesta: this.tipoFiltro    || undefined,
      sla:           this.slaFiltro     || undefined,
      desde:         this.desdeFiltro   || undefined,
      hasta:         this.hastaFiltro   || undefined,
    };
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.bandeja.set(await this.svc.obtenerBandeja(this.armarFiltros()));
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Error al cargar expedientes.');
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltros(): Promise<void> {
    this.pagina.set(1);
    await this.cargar();
  }

  async limpiarFiltros(): Promise<void> {
    this.busqueda      = '';
    this.estadoFiltro  = '';
    this.etapaFiltro   = '';
    this.clienteFiltro = '';
    this.areaFiltro    = '';
    this.tipoFiltro    = '';
    this.slaFiltro     = '';
    this.desdeFiltro   = '';
    this.hastaFiltro   = '';
    this.pagina.set(1);
    await this.cargar();
  }

  async cambiarPagina(nueva: number): Promise<void> {
    if (nueva < 1 || nueva > this.totalPaginas()) return;
    this.pagina.set(nueva);
    await this.cargar();
  }

  async descargar(): Promise<void> {
    this.descargando.set(true);
    try {
      const blob = await this.svc.descargarBandejaXlsx(this.armarFiltros());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expedientes_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      this.toast.error(await this.mensajeErrorBlob(e, 'No se pudo descargar la bandeja.'));
    } finally {
      this.descargando.set(false);
    }
  }

  /** Extrae el mensaje real del back cuando el request de blob falla. */
  private async mensajeErrorBlob(e: unknown, fallback: string): Promise<string> {
    const err = e as { error?: unknown; status?: number; message?: string };
    const body = err?.error;
    if (body instanceof Blob) {
      try {
        const texto = await body.text();
        try {
          const json = JSON.parse(texto) as { mensaje?: string; message?: string };
          return json.mensaje || json.message || fallback;
        } catch {
          return texto || fallback;
        }
      } catch {
        return fallback;
      }
    }
    if (err?.status === 404) return 'No se encontró el recurso.';
    if (err?.status === 403) return 'No tienes permisos para esta acción.';
    if (err?.status === 401) return 'Sesión expirada. Volvé a iniciar sesión.';
    return err?.message || fallback;
  }

  // ─── Navegación ──────────────────────────────────────────────────────
  irDetalle(exp: FilaExpedienteDto): void {
    void this.router.navigate(['/crm/expedientes-digitales', exp.idExpediente]);
  }

  // ─── Helpers de UI (chips, colores) ──────────────────────────────────

  claseEtapa(etapa: string): string {
    return `chip-etapa chip-etapa--${etapa}`;
  }

  claseTipoPropuesta(tipo: string | null | undefined): string {
    if (!tipo) return 'chip-tipo chip-tipo--neutral';
    return `chip-tipo chip-tipo--${tipo}`;
  }

  claseSla(exp: FilaExpedienteDto): string {
    const estado = exp.sla?.estado ?? '';
    if (estado === 'vencido') return 'sla sla--vencido';
    if (estado === 'en_riesgo' || this.diasRestantes(exp) <= 5) return 'sla sla--urgente';
    return 'sla sla--ok';
  }

  slaVencido(exp: FilaExpedienteDto): boolean {
    return (exp.sla?.estado ?? '') === 'vencido';
  }

  diasRestantes(exp: FilaExpedienteDto): number {
    const minutos = exp.sla?.minutosRestantes;
    if (minutos == null) return 999;
    return Math.max(0, Math.floor(minutos / (60 * 24)));
  }

  /** Número total de OS/OM mostrables (prioriza OS si existe). */
  numeroOsOm(exp: FilaExpedienteDto): string | null {
    return exp.numeroOsOm ?? exp.numerosOs ?? exp.numerosOm ?? null;
  }

  iniciales(nombre?: string | null): string {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }
}
