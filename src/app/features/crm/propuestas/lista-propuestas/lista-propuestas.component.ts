import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropuestasService } from '../../../../core/services/propuestas.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  EstadoPropuesta,
  ESTADOS_PROPUESTA_TABS,
  KpisPropuestas,
  PropuestaListaItem,
  TipoPropuesta,
  TIPOS_PROPUESTA,
} from '../../../../core/models/propuestas.model';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/ui/breadcrumb/breadcrumb.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ModalElegirRqComponent } from '../modal-elegir-rq/modal-elegir-rq.component';
import { ModalPropuestaExistenteComponent } from '../modal-propuesta-existente/modal-propuesta-existente.component';
import { ModalCrearNuevaVersionComponent } from '../modal-crear-nueva-version/modal-crear-nueva-version.component';

@Component({
  selector: 'app-lista-propuestas',
  imports: [
    FormsModule, BreadcrumbComponent, KpiCardComponent, ButtonComponent,
    ModalElegirRqComponent, ModalPropuestaExistenteComponent, ModalCrearNuevaVersionComponent,
  ],
  templateUrl: './lista-propuestas.component.html',
  styleUrl: './lista-propuestas.component.scss',
})
export class ListaPropuestasComponent implements OnInit {
  private readonly propuestasSvc = inject(PropuestasService);
  private readonly router        = inject(Router);
  private readonly toastSvc      = inject(ToastService);

  readonly cargando = signal(true);
  readonly error    = signal('');

  readonly kpis  = signal<KpisPropuestas>({
    pendientes: 0, variacionPendientes: 0,
    porVistoBueno: 0, porEnviar: 0, enSeguimiento: 0, slaVencidos: 0,
  });
  readonly items = signal<PropuestaListaItem[]>([]);
  readonly total = signal(0);

  readonly comerciales = signal<string[]>([]);

  readonly estadosTabs = ESTADOS_PROPUESTA_TABS;
  readonly tipos       = TIPOS_PROPUESTA;
  readonly anios       = [2026, 2025, 2024, 2023];

  readonly pagina    = signal(1);
  readonly porPagina = signal(10);

  readonly totalPaginas = computed(() => Math.ceil(this.total() / this.porPagina()) || 1);
  readonly inicio       = computed(() => (this.pagina() - 1) * this.porPagina() + 1);
  readonly fin          = computed(() => Math.min(this.pagina() * this.porPagina(), this.total()));

  readonly estadoActivo    = signal<EstadoPropuesta | 'todas'>('todas');
  readonly modalRqAbierto  = signal(false);

  // Modal "propuesta existente" — se abre al elegir un RQ que ya tiene una propuesta.
  readonly propuestaExistenteCtx = signal<{
    idRequerimiento: number;
    codigoRq:        string;
    codigoPropuesta: string;
    versionActual:   number;
  } | null>(null);

  // Modal "crear nueva versión" — se abre al editar una propuesta ya enviada a VB.
  readonly nuevaVersionCtx = signal<{
    idPropuesta:     number;
    codigoPropuesta: string;
    versionActual:   number;
  } | null>(null);

  // Filtros bindeados a los inputs (no gatillan carga hasta que el usuario busca)
  busqueda      = '';
  anioFiltro: number | '' = new Date().getFullYear();
  comercialFiltro = 'todos';
  tipoFiltro: TipoPropuesta | 'cualquiera' = 'cualquiera';

  readonly breadcrumb: BreadcrumbItem[] = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'CRM' },
    { label: 'Propuestas' },
  ];

  async ngOnInit(): Promise<void> {
    await this.cargar();
    try {
      this.comerciales.set(await this.propuestasSvc.obtenerComerciales());
    } catch { /* silencioso */ }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const res = await this.propuestasSvc.obtenerPropuestas({
        busqueda:  this.busqueda || undefined,
        estado:    this.estadoActivo(),
        anio:      this.anioFiltro === '' ? undefined : this.anioFiltro,
        comercial: this.comercialFiltro,
        tipo:      this.tipoFiltro,
        pagina:    this.pagina(),
        porPagina: this.porPagina(),
      });
      this.kpis.set(res.kpis);
      this.items.set(res.items);
      this.total.set(res.total);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Error al cargar propuestas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async aplicarFiltros(): Promise<void> {
    this.pagina.set(1);
    await this.cargar();
  }

  limpiarFiltros(): void {
    this.busqueda        = '';
    this.anioFiltro      = 2024;
    this.comercialFiltro = 'todos';
    this.tipoFiltro      = 'cualquiera';
    this.aplicarFiltros();
  }

  async cambiarTab(estado: EstadoPropuesta | 'todas'): Promise<void> {
    this.estadoActivo.set(estado);
    this.pagina.set(1);
    await this.cargar();
  }

  async irPagina(n: number): Promise<void> {
    if (n < 1 || n > this.totalPaginas()) return;
    this.pagina.set(n);
    await this.cargar();
  }

  irANuevo(): void {
    this.modalRqAbierto.set(true);
  }

  async onRqSeleccionado(idRequerimiento: number): Promise<void> {
    this.modalRqAbierto.set(false);
    try {
      // Antes de ir al wizard, verificamos si el RQ ya tiene una propuesta.
      // Si la tiene, abrimos el modal "Propuesta existente detectada".
      const datos = await this.propuestasSvc.obtenerDatosNueva(idRequerimiento);
      if (datos.propuestaExistente) {
        this.propuestaExistenteCtx.set({
          idRequerimiento,
          codigoRq:        datos.numeroRequerimiento ?? `RQ ${idRequerimiento}`,
          codigoPropuesta: datos.propuestaExistente.numero,
          versionActual:   datos.propuestaExistente.version,
        });
        return;
      }
      // RQ sin propuesta → al wizard directo.
      this.router.navigate(['/crm/propuestas/nueva'], {
        queryParams: { idRequerimiento },
      });
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'Error al verificar el requerimiento.');
    }
  }

  /** Modal "propuesta existente" → crear v2 ligada a la anterior. */
  onElegirNuevaVersion(): void {
    const ctx = this.propuestaExistenteCtx();
    if (!ctx) return;
    this.propuestaExistenteCtx.set(null);
    this.router.navigate(['/crm/propuestas/nueva'], {
      queryParams: { idRequerimiento: ctx.idRequerimiento, versionDe: ctx.codigoPropuesta },
    });
  }

  /** Modal "propuesta existente" → crear propuesta independiente desde cero. */
  onElegirIndependiente(): void {
    const ctx = this.propuestaExistenteCtx();
    if (!ctx) return;
    this.propuestaExistenteCtx.set(null);
    this.router.navigate(['/crm/propuestas/nueva'], {
      queryParams: { idRequerimiento: ctx.idRequerimiento, independiente: 1 },
    });
  }

  irAEditar(id: number): void {
    this.router.navigate(['/crm/propuestas', id, 'editar']);
  }

  // ─── Acciones por fila ────────────────────────────────────────────────────
  verDetalle(_id: number): void {
    // Pendiente: HU futura "Ver detalle de propuesta" (vista read-only con todas las secciones).
    this.toastSvc.info('Ver detalle — pendiente, otra HU.');
  }

  editarPropuesta(item: PropuestaListaItem): void {
    if (item.estado === 'borrador') {
      // Borrador → se puede editar la misma versión directamente.
      this.router.navigate(['/crm/propuestas', item.idPropuesta, 'editar']);
    } else {
      // Ya fue enviada a VB o más allá → abre modal "Crear nueva versión".
      this.nuevaVersionCtx.set({
        idPropuesta:     item.idPropuesta,
        codigoPropuesta: item.codigo,
        versionActual:   this.parsearVersion(item.version),
      });
    }
  }

  /** Modal "crear nueva versión" → confirma y navega al wizard como versión nueva. */
  onConfirmarNuevaVersion(): void {
    const ctx = this.nuevaVersionCtx();
    if (!ctx) return;
    this.nuevaVersionCtx.set(null);
    this.router.navigate(['/crm/propuestas/nueva'], {
      queryParams: { versionDe: ctx.codigoPropuesta },
    });
  }

  /** Extrae el número de versión de un string tipo "v1", "v2", etc. */
  private parsearVersion(version: string): number {
    const n = parseInt((version ?? '').replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  enviarAVistoBueno(_id: number): void {
    // Pendiente: HU futura "Modal Enviar a Visto Bueno".
    this.toastSvc.info('Modal "Enviar a Visto Bueno" — pendiente, otra HU.');
  }

  // ─── Helpers de presentación ──────────────────────────────────────────────
  tipoClase(tipo: string): string {
    const mapa: Record<string, string> = {
      servicio: 'badge-tipo--servicio',
      mixta:    'badge-tipo--mixta',
      proyecto: 'badge-tipo--proyecto',
    };
    return mapa[tipo] ?? '';
  }

  formatearMonto(monto: number, moneda: string): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: moneda === 'USD' ? 'USD' : 'PEN',
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
    }).format(monto).replace(/^(PEN|USD)\s*/, '');
  }

  get paginas(): number[] {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const rango: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin    = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) rango.push(i);
    return rango;
  }
}
