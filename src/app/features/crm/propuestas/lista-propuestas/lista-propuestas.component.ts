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
import { ModalDetallePropuestaComponent } from '../modal-detalle-propuesta/modal-detalle-propuesta.component';
import { ModalEnviarVbComponent } from '../modal-enviar-vb/modal-enviar-vb.component';
import { ModalAnularPropuestaComponent } from '../modal-anular-propuesta/modal-anular-propuesta.component';
import { ModalPreviewPdfComponent } from '../modal-preview-pdf/modal-preview-pdf.component';
import { FiltrosPopoverComponent } from '../../../../shared/ui/filtros-popover/filtros-popover.component';
import { DetalleRequerimientoComponent } from '../../requerimientos/detalle-requerimiento/detalle-requerimiento.component';

@Component({
  selector: 'app-lista-propuestas',
  imports: [
    FormsModule, BreadcrumbComponent, KpiCardComponent, ButtonComponent,
    ModalElegirRqComponent, ModalPropuestaExistenteComponent, ModalCrearNuevaVersionComponent,
    ModalDetallePropuestaComponent, ModalEnviarVbComponent, ModalAnularPropuestaComponent, ModalPreviewPdfComponent,
    FiltrosPopoverComponent, DetalleRequerimientoComponent,
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

  // IDs activos para cada modal (null = cerrado).
  readonly idDetalleAbierto  = signal<number | null>(null);
  readonly idEnviarVbAbierto = signal<number | null>(null);
  readonly idAnularAbierto   = signal<number | null>(null);
  readonly idPdfAbierto      = signal<number | null>(null);
  readonly codigoPdfAbierto  = signal<string>('');
  /** Al abrir el RQ desde el detalle de propuesta, se oculta el detalle y se abre el del RQ.
   *  Al cerrar el RQ se re-abre el detalle de propuesta con el id guardado. */
  readonly idRqAbierto       = signal<number | null>(null);
  private   idPropuestaPrevia: number | null = null;

  // Filtros bindeados a los inputs (no gatillan carga hasta que el usuario busca)
  busqueda      = '';
  anioFiltro: number | '' = new Date().getFullYear();
  comercialFiltro = 'todos';
  tipoFiltro: TipoPropuesta | 'cualquiera' = 'cualquiera';
  /** Estado activo bindeado al select del modal (sincroniza con el signal). */
  estadoActivoFiltro: EstadoPropuesta | 'todas' = 'todas';

  /** Nº de filtros aplicados (distintos de su valor por defecto) — badge del modal. */
  filtrosActivos(): number {
    let n = 0;
    if (this.estadoActivoFiltro !== 'todas') n++;
    if (this.anioFiltro && this.anioFiltro !== new Date().getFullYear()) n++;
    if (this.comercialFiltro !== 'todos') n++;
    if (this.tipoFiltro !== 'cualquiera')  n++;
    return n;
  }

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
    // Sincroniza signal estadoActivo con la selección del modal
    this.estadoActivo.set(this.estadoActivoFiltro);
    try {
      const res = await this.propuestasSvc.obtenerPropuestas({
        busqueda:  this.busqueda || undefined,
        estado:    this.estadoActivoFiltro,
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
    this.busqueda           = '';
    this.anioFiltro         = new Date().getFullYear();
    this.comercialFiltro    = 'todos';
    this.tipoFiltro         = 'cualquiera';
    this.estadoActivoFiltro = 'todas';
    this.aplicarFiltros();
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
  verDetalle(id: number): void { this.idDetalleAbierto.set(id); }
  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  /** Swap de modales: oculta detalle de propuesta y abre el detalle del RQ. */
  onVerRequerimiento(idRequerimiento: number): void {
    this.idPropuestaPrevia = this.idDetalleAbierto();
    this.idDetalleAbierto.set(null);
    this.idRqAbierto.set(idRequerimiento);
  }

  /** Al cerrar el detalle del RQ, vuelve a mostrarse el detalle de propuesta previo. */
  cerrarRq(): void {
    this.idRqAbierto.set(null);
    if (this.idPropuestaPrevia !== null) {
      this.idDetalleAbierto.set(this.idPropuestaPrevia);
      this.idPropuestaPrevia = null;
    }
  }

  onAccionDetalle(evt: 'enviar_vb' | 'anular' | 'nueva_version' | 'preview_pdf'): void {
    const id = this.idDetalleAbierto();
    if (!id) return;
    this.cerrarDetalle();
    if (evt === 'enviar_vb')    this.idEnviarVbAbierto.set(id);
    else if (evt === 'anular')  this.idAnularAbierto.set(id);
    else if (evt === 'preview_pdf') {
      const item = this.items().find(i => i.idPropuesta === id);
      this.codigoPdfAbierto.set(item ? `${item.codigo} · ${item.version}` : '');
      this.idPdfAbierto.set(id);
    }
    else if (evt === 'nueva_version') {
      const item = this.items().find(i => i.idPropuesta === id);
      if (!item) return;
      this.nuevaVersionCtx.set({
        idPropuesta:     id,
        codigoPropuesta: item.codigo,
        versionActual:   this.parsearVersion(item.version),
      });
    }
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

  /** Modal "crear nueva versión" → llama al back y navega al wizard. */
  readonly creandoVersion = signal(false);
  async onConfirmarNuevaVersion(datos: { motivo: string; descripcion: string; bloquesACopiar: string[] }): Promise<void> {
    const ctx = this.nuevaVersionCtx();
    if (!ctx || this.creandoVersion()) return;
    this.creandoVersion.set(true);
    try {
      const nuevoId = await this.propuestasSvc.crearNuevaVersion(
        ctx.idPropuesta, datos.motivo, datos.descripcion, datos.bloquesACopiar
      );
      this.nuevaVersionCtx.set(null);
      this.router.navigate(['/crm/propuestas', nuevoId, 'editar']);
    } catch (e: unknown) {
      this.toastSvc.error(e instanceof Error ? e.message : 'No se pudo crear la nueva versión.');
    } finally {
      this.creandoVersion.set(false);
    }
  }

  /** Extrae el número de versión de un string tipo "v1", "v2", etc. */
  private parsearVersion(version: string): number {
    const n = parseInt((version ?? '').replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  enviarAVistoBueno(id: number): void { this.idEnviarVbAbierto.set(id); }
  cerrarEnviarVb(): void { this.idEnviarVbAbierto.set(null); }
  onVbEnviado(): void {
    this.cerrarEnviarVb();
    this.toastSvc.exito('Propuesta enviada a Visto Bueno.');
    this.cargar();
  }

  anularPropuesta(id: number): void { this.idAnularAbierto.set(id); }
  cerrarAnular(): void { this.idAnularAbierto.set(null); }
  onAnulada(): void {
    this.cerrarAnular();
    this.toastSvc.exito('Propuesta anulada.');
    this.cargar();
  }

  // ─── Helpers de presentación ──────────────────────────────────────────────
  formatearMonto(monto: number, moneda: string): string {
    const simbolo = moneda === 'USD' ? 'US$' : 'S/';
    const valor   = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monto);
    return `${simbolo} ${valor}`;
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  estadoClase(estado: string): string {
    const mapa: Record<string, string> = {
      borrador:     'badge--gris',
      pendiente_vb: 'badge--naranja',
      enviado:      'badge--azul',
      aprobado:     'badge--verde',
      rechazado:    'badge--rojo',
      anulado:      'badge--rojo',
      vencido:      'badge--rojo',
    };
    return mapa[estado] ?? 'badge--gris';
  }

  slaClase(item: PropuestaListaItem): string {
    const d = item.slaDiasRestantes;
    if (d == null) return 'sla--normal';
    if (d <= 0)    return 'sla--urgente';
    if (d <= 3)    return 'sla--advertencia';
    return 'sla--normal';
  }

  calcularSlaTexto(item: PropuestaListaItem): string {
    const d = item.slaDiasRestantes;
    if (d == null) return '—';
    if (d === 0)   return 'Hoy';
    return `${Math.abs(d)}d`;
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
