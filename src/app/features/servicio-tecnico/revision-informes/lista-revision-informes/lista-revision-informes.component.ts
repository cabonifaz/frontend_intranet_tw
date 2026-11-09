import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RevisionInformesService } from '../../../../core/services/revision-informes.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  BandejaInformesApi, EstadoInformeApi, FiltrosBandejaInformesQs, GrupoBandejaInformes,
  ItemBandejaInformeApi,
} from '../../../../core/models/revision-informes-api.model';
import { BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { InicialesPipe } from '../../../../shared/pipes/iniciales.pipe';
import { ModalDetalleInformeComponent } from '../modal-detalle-informe/modal-detalle-informe.component';
import { ModalRegistrarRevisionComponent } from '../modal-registrar-revision/modal-registrar-revision.component';

/**
 * HU-56 — Bandeja de Revisión de Informes Técnicos (Módulo 12).
 * Vista del Supervisor / Jefe de Servicio Técnico: lista los informes que sus técnicos generaron desde la
 * app móvil, con 4 tarjetas resumen, grupos (Todos / Pendientes / Revisados), filtros y buscador.
 * Datos reales del backend: GET /api/servicio-tecnico/informes.
 */
@Component({
  selector: 'app-lista-revision-informes',
  imports: [
    CommonModule, FormsModule, HeaderBandejaComponent, KpiGridComponent, KpiCardComponent,
    BarraFiltrosBandejaComponent, TablaPaginadaComponent, ButtonComponent, InicialesPipe,
    ModalDetalleInformeComponent, ModalRegistrarRevisionComponent,
  ],
  templateUrl: './lista-revision-informes.component.html',
  styleUrl: './lista-revision-informes.component.scss',
})
export class ListaRevisionInformesComponent implements OnInit {
  private readonly svc    = inject(RevisionInformesService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  readonly cargando  = signal(true);
  readonly error     = signal<string | null>(null);
  readonly bandeja   = signal<BandejaInformesApi | null>(null);
  readonly idDetalleAbierto    = signal<number | null>(null);
  readonly idRevisionAbierto   = signal<number | null>(null);

  readonly breadcrumb: BreadcrumbItem[] = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'Servicio Técnico' },
    { label: 'Revisión de Informes' },
  ];

  // ─── Estado aplicado (lo que fue al back) ───────────────────────────────
  readonly grupo = signal<GrupoBandejaInformes>('todos');
  readonly filtros = signal<FiltrosBandejaInformesQs>({ grupo: 'todos', pagina: 1, porPagina: 10 });

  // ─── Drafts bindeados al popover + búsqueda ─────────────────────────────
  busqueda                        = '';
  idTecnicoDraft:   number | null = null;
  idClienteDraft:   number | null = null;
  conObservacionesDraft: 'todos' | 'con' | 'sin' = 'todos';
  slaVencidoDraft                 = false;
  fechaDesdeDraft: string         = '';
  fechaHastaDraft: string         = '';

  // ─── Derivados ──────────────────────────────────────────────────────────
  readonly tarjetas = computed(() => this.bandeja()?.tarjetas);
  readonly items    = computed<ItemBandejaInformeApi[]>(() => this.bandeja()?.items ?? []);
  readonly total    = computed(() => this.bandeja()?.total ?? 0);
  readonly tecnicos = computed(() => this.bandeja()?.tecnicos ?? []);
  readonly clientes = computed(() => this.bandeja()?.clientes ?? []);

  readonly filtrosActivos = computed<number>(() => {
    let n = 0;
    if (this.idTecnicoDraft != null) n++;
    if (this.idClienteDraft != null) n++;
    if (this.conObservacionesDraft !== 'todos') n++;
    if (this.slaVencidoDraft) n++;
    if (this.fechaDesdeDraft) n++;
    if (this.fechaHastaDraft) n++;
    return n;
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

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
      grupo:            this.grupo(),
      busqueda:         this.busqueda.trim() || null,
      idTecnico:        this.idTecnicoDraft,
      idCliente:        this.idClienteDraft,
      conObservaciones: this.conObservacionesDraft === 'todos' ? null : this.conObservacionesDraft === 'con',
      slaVencido:       this.slaVencidoDraft,
      fechaDesde:       this.fechaDesdeDraft || null,
      fechaHasta:       this.fechaHastaDraft || null,
      pagina:           1,
      porPagina:        10,
    });
    await this.cargar();
  }

  async limpiarFiltros(): Promise<void> {
    this.busqueda             = '';
    this.idTecnicoDraft       = null;
    this.idClienteDraft       = null;
    this.conObservacionesDraft = 'todos';
    this.slaVencidoDraft      = false;
    this.fechaDesdeDraft      = '';
    this.fechaHastaDraft      = '';
    await this.aplicarFiltros();
  }

  /** Clic en los chips Todos / Pendientes / Revisados — cambia grupo y recarga. */
  async cambiarGrupo(g: GrupoBandejaInformes): Promise<void> {
    if (this.grupo() === g) return;
    this.grupo.set(g);
    await this.aplicarFiltros();
  }

  async irPagina(n: number): Promise<void> {
    this.filtros.set({ ...this.filtros(), pagina: n });
    await this.cargar();
  }

  async exportarCsv(): Promise<void> {
    try {
      const blob = await this.svc.exportarCsv(this.filtros());
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `informes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo exportar el CSV.');
    }
  }

  verDetalle(idInforme: number): void {
    this.idDetalleAbierto.set(idInforme);
  }

  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  onEditarInforme(idInforme: number): void {
    this.router.navigate(['/servicio-tecnico/revision-informes', idInforme, 'editar']);
  }

  onPrecotizar(idInforme: number): void {
    // Lleva a la ficha de edición directamente en el paso 4 (Hallazgos y Precotización)
    this.router.navigate(['/servicio-tecnico/revision-informes', idInforme, 'editar'], {
      queryParams: { paso: 4 },
    });
  }

  onRegistrarRevision(idInforme: number): void {
    // Cierra el modal de detalle y abre el de Registrar Revisión (HU-59)
    this.idDetalleAbierto.set(null);
    this.idRevisionAbierto.set(idInforme);
  }

  cerrarModalRevision(): void { this.idRevisionAbierto.set(null); }

  async onRevisionConfirmada(_idInforme: number): Promise<void> {
    this.idRevisionAbierto.set(null);
    await this.cargar();
  }

  // ─── Helpers de UI ──────────────────────────────────────────────────────

  claseEstado(grupoEstado: string | null, estado: EstadoInformeApi | null): string {
    if (estado === 'revisado') {
      return grupoEstado === 'revisado_con_precot' ? 'chip chip--verde' : 'chip chip--gris-oscuro';
    }
    return grupoEstado === 'pendiente_precotizacion' ? 'chip chip--rojo' : 'chip chip--ambar';
  }

  claseObservaciones(con: boolean): string {
    return con ? 'chip chip--rojo' : 'chip chip--verde';
  }
}
