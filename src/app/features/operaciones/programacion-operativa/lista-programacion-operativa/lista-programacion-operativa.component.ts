import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProgramacionOperativaService } from '../../../../core/services/programacion-operativa.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  FiltrosProgramacionOperativa,
  ItemProgramacion,
  ListaProgramacion,
  ResumenProgramacion,
  RespuestaClienteRegistrada,
  SubEstadoProgramacion,
  TipoOrden,
} from '../../../../core/models/programacion-operativa.model';
import { HeaderBandejaComponent } from '../../../../shared/ui/header-bandeja/header-bandeja.component';
import { KpiGridComponent } from '../../../../shared/ui/kpi-grid/kpi-grid.component';
import { KpiCardComponent } from '../../../../shared/ui/kpi-card/kpi-card.component';
import { BarraFiltrosBandejaComponent } from '../../../../shared/ui/barra-filtros-bandeja/barra-filtros-bandeja.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TablaPaginadaComponent } from '../../../../shared/ui/tabla-paginada/tabla-paginada.component';
import { ModalDetalleProgramacionComponent } from '../modal-detalle-programacion/modal-detalle-programacion.component';
import { ModalRegistrarRespuestaClienteComponent } from '../modal-registrar-respuesta-cliente/modal-registrar-respuesta-cliente.component';
import { ModalCancelarProgramacionComponent } from '../modal-cancelar-programacion/modal-cancelar-programacion.component';
import { ModalGestionarViaticosComponent } from '../modal-gestionar-viaticos/modal-gestionar-viaticos.component';
import { ModalResolverSolicitudComponent } from '../modal-resolver-solicitud/modal-resolver-solicitud.component';

type Tab = 'vista_principal' | 'pendientes' | 'programados';

const SUB_ESTADOS: { codigo: SubEstadoProgramacion | 'todos'; label: string }[] = [
  { codigo: 'todos',                    label: 'Todos' },
  { codigo: 'pendiente_programar',      label: 'Pendiente por programar' },
  { codigo: 'pendiente_conf_cliente',   label: 'Pendiente confirmación cliente' },
  { codigo: 'pendiente_reprogramacion', label: 'Pendiente reprogramación' },
  { codigo: 'pendiente_ssoma',          label: 'Pendiente SSOMA' },
];

const RANGOS: { codigo: NonNullable<FiltrosProgramacionOperativa['rango']>; label: string }[] = [
  { codigo: 'todos',           label: 'Todos' },
  { codigo: 'hoy',             label: 'Hoy' },
  { codigo: 'esta_semana',     label: 'Esta semana' },
  { codigo: 'proxima_semana',  label: 'Próxima semana' },
  { codigo: 'personalizado',   label: 'Rango personalizado' },
];

@Component({
  selector: 'app-lista-programacion-operativa',
  imports: [
    CommonModule, FormsModule,
    HeaderBandejaComponent, KpiGridComponent, KpiCardComponent,
    BarraFiltrosBandejaComponent, ButtonComponent, TablaPaginadaComponent,
    ModalDetalleProgramacionComponent,
    ModalRegistrarRespuestaClienteComponent,
    ModalCancelarProgramacionComponent,
    ModalGestionarViaticosComponent,
    ModalResolverSolicitudComponent,
  ],
  templateUrl: './lista-programacion-operativa.component.html',
  styleUrl: './lista-programacion-operativa.component.scss',
})
export class ListaProgramacionOperativaComponent implements OnInit {
  private readonly svc    = inject(ProgramacionOperativaService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  readonly breadcrumb = [
    { label: 'Inicio', ruta: '/dashboard' },
    { label: 'Operaciones' },
    { label: 'Programación Operativa' },
  ];

  readonly SUB_ESTADOS = SUB_ESTADOS;
  readonly RANGOS      = RANGOS;

  // ─── State ───────────────────────────────────────────────────────────────
  readonly tab = signal<Tab>('pendientes');

  // Resumen (HU-35 Vista Principal con KPIs + calendario + matriz de carga + alertas).
  readonly resumen   = signal<ResumenProgramacion | null>(null);
  readonly cargandoResumen = signal(false);
  /** Semana actualmente mostrada (yyyy-MM-dd de cualquier día dentro). null = semana de hoy. */
  readonly semanaActual = signal<string | null>(null);

  // Lista por tab
  readonly lista     = signal<ListaProgramacion | null>(null);
  readonly cargando  = signal(false);

  // Filtros
  readonly filtros = signal<FiltrosProgramacionOperativa>({
    subEstado: 'todos',
    rango:     'esta_semana',
    tipo:      'todos',
    pagina:    1,
    porPagina: 10,
  });

  readonly busqueda = signal<string>('');

  // Derived
  readonly items     = computed<ItemProgramacion[]>(() => this.lista()?.items ?? []);
  readonly total     = computed(() => this.lista()?.total ?? 0);
  readonly tarjetas  = computed(() => this.resumen()?.tarjetas);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.cargarResumen(), this.cargarTab()]);
  }

  // ─── Carga ───────────────────────────────────────────────────────────────

  async cargarResumen(): Promise<void> {
    this.cargandoResumen.set(true);
    try {
      const r = await this.svc.obtenerResumen(this.semanaActual());
      this.resumen.set(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el resumen.');
    } finally {
      this.cargandoResumen.set(false);
    }
  }

  cambiarSemana(delta: number): void {
    const base = this.semanaActual() ?? this.resumen()?.inicioSemana ?? this.hoyIso();
    const nueva = this.sumarDias(base, delta * 7);
    this.semanaActual.set(nueva);
    void this.cargarResumen();
  }

  semanaHoy(): void {
    this.semanaActual.set(null);
    void this.cargarResumen();
  }

  private hoyIso(): string {
    return new Date().toISOString().substring(0, 10);
  }
  private sumarDias(f: string, dias: number): string {
    const dt = new Date(`${f}T00:00:00`);
    dt.setDate(dt.getDate() + dias);
    return dt.toISOString().substring(0, 10);
  }

  async cargarTab(): Promise<void> {
    if (this.tab() === 'vista_principal') return;
    this.cargando.set(true);
    try {
      const f = { ...this.filtros(), busqueda: this.busqueda() || null };
      const r = this.tab() === 'pendientes'
        ? await this.svc.obtenerPendientes(f)
        : await this.svc.obtenerProgramados(f);
      this.lista.set(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la lista.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Handlers UI ─────────────────────────────────────────────────────────

  cambiarTab(t: Tab): void {
    this.tab.set(t);
    this.filtros.update(f => ({ ...f, pagina: 1 }));
    void this.cargarTab();
  }

  cambiarSubEstado(se: SubEstadoProgramacion | 'todos'): void {
    this.filtros.update(f => ({ ...f, subEstado: se, pagina: 1 }));
    void this.cargarTab();
  }

  cambiarRango(r: NonNullable<FiltrosProgramacionOperativa['rango']>): void {
    this.filtros.update(f => ({ ...f, rango: r, pagina: 1 }));
    void this.cargarTab();
  }

  cambiarTipo(t: TipoOrden | 'todos'): void {
    this.filtros.update(f => ({ ...f, tipo: t, pagina: 1 }));
    void this.cargarTab();
  }

  buscar(): void {
    this.filtros.update(f => ({ ...f, pagina: 1 }));
    void this.cargarTab();
  }

  onPaginaChange(p: number): void {
    this.filtros.update(f => ({ ...f, pagina: p }));
    void this.cargarTab();
  }

  async descargar(): Promise<void> {
    try {
      const f = { ...this.filtros(), busqueda: this.busqueda() || null };
      const blob = this.tab() === 'pendientes'
        ? await this.svc.exportarPendientes(f)
        : await this.svc.exportarProgramados(f);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `programaciones-${this.tab()}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo exportar la lista.');
    }
  }

  // ─── Acciones por fila ───────────────────────────────────────────────────

  programarOs(item: ItemProgramacion): void {
    this.router.navigate(['/operaciones/programacion/ordenes', item.idOs, 'programar']);
  }

  // ─── Orquestación de modales (HU-37 + HU-38) ────────────────────────────
  // Solo uno visible a la vez. Si un sub-flujo se abre desde el Detalle,
  // guardamos el id para poder "volver" al Detalle al cerrar el sub-modal.
  readonly idDetalleAbierto    = signal<number | null>(null);
  readonly idRespuestaAbierto  = signal<number | null>(null);
  readonly idCancelarAbierto   = signal<number | null>(null);
  readonly idViaticosAbierto   = signal<number | null>(null);
  readonly idSolicitudAbierta  = signal<number | null>(null);
  /** Id guardado para reabrir Detalle al Volver desde un sub-modal. */
  private volverADetalleCon: number | null = null;

  verDetalle(item: ItemProgramacion): void {
    if (!item.idProgramacion) {
      this.toast.info('Esta orden todavía no tiene programación activa.');
      return;
    }
    this.idDetalleAbierto.set(item.idProgramacion);
  }

  cerrarDetalle(): void { this.idDetalleAbierto.set(null); }

  // Pedidos del Detalle → cierra Detalle y abre el sub-modal correspondiente
  onPedirRegistrarRespuesta(id: number): void {
    this.idDetalleAbierto.set(null);
    this.volverADetalleCon = id;
    this.idRespuestaAbierto.set(id);
  }
  onPedirCancelar(id: number): void {
    this.idDetalleAbierto.set(null);
    this.volverADetalleCon = id;
    this.idCancelarAbierto.set(id);
  }
  onPedirReprogramar(id: number): void {
    // Reprogramar abre la FICHA (no un modal). Cerramos el detalle y navegamos.
    this.idDetalleAbierto.set(null);
    this.volverADetalleCon = null;
    this.router.navigate(['/operaciones/programacion', id, 'reprogramar']);
  }
  onPedirGestionarViaticos(id: number): void {
    this.idDetalleAbierto.set(null);
    this.volverADetalleCon = id;
    this.idViaticosAbierto.set(id);
  }
  onPedirResolverSolicitud(idSolicitud: number): void {
    const idProg = this.idDetalleAbierto();
    this.idDetalleAbierto.set(null);
    this.volverADetalleCon = idProg;
    this.idSolicitudAbierta.set(idSolicitud);
  }
  async onPedirRetirarSolicitud(idSolicitud: number): Promise<void> {
    try {
      await this.svc.retirarSolicitud(idSolicitud);
      this.toast.exito('Solicitud retirada.');
      await Promise.all([this.cargarResumen(), this.cargarTab()]);
      // Forzar recarga del modal detalle: cerrar y reabrir en el siguiente tick
      // para que Angular monte de nuevo el componente y dispare ngOnInit.
      const idProg = this.idDetalleAbierto();
      if (idProg) {
        this.idDetalleAbierto.set(null);
        setTimeout(() => this.idDetalleAbierto.set(idProg), 0);
      }
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo retirar la solicitud.');
    }
  }
  cerrarSolicitud(): void {
    const id = this.volverADetalleCon;
    this.idSolicitudAbierta.set(null);
    if (id) this.idDetalleAbierto.set(id);
  }
  async onSolicitudResuelta(): Promise<void> {
    this.idSolicitudAbierta.set(null);
    this.volverADetalleCon = null;
    await Promise.all([this.cargarResumen(), this.cargarTab()]);
  }

  // Sub-modales: volver reabre Detalle; completado recarga bandeja
  cerrarRespuesta(): void {
    const id = this.volverADetalleCon;
    this.idRespuestaAbierto.set(null);
    if (id) this.idDetalleAbierto.set(id);
  }
  cerrarCancelar(): void {
    const id = this.volverADetalleCon;
    this.idCancelarAbierto.set(null);
    if (id) this.idDetalleAbierto.set(id);
  }
  cerrarViaticos(): void {
    const id = this.volverADetalleCon;
    this.idViaticosAbierto.set(null);
    if (id) this.idDetalleAbierto.set(id);
  }
  async onViaticosActualizado(): Promise<void> {
    // Al cambiar algo en viáticos, recargamos resumen y tab pero mantenemos el modal
    await Promise.all([this.cargarResumen(), this.cargarTab()]);
  }


  async onRespuestaRegistrada(payload: RespuestaClienteRegistrada): Promise<void> {
    this.idRespuestaAbierto.set(null);
    this.volverADetalleCon = null;

    // Según el resultado, saltamos al tab correspondiente para que el usuario
    // vea la programación en su nueva ubicación:
    //  · acepto             → tab Programados
    //  · pidio_reprogramar  → tab Pendientes (sub-estado: pendiente_reprogramacion)
    //  · cancelo            → la programación desaparece de la bandeja (CANCELADA)
    if (payload.resultado === 'acepto') {
      this.tab.set('programados');
    } else if (payload.resultado === 'pidio_reprogramar') {
      this.tab.set('pendientes');
    }
    await Promise.all([this.cargarResumen(), this.cargarTab()]);
  }
  async onCancelado(): Promise<void> {
    this.idCancelarAbierto.set(null);
    this.volverADetalleCon = null;
    // Al cancelar, la programación ya no existe como activa → cerramos todo
    await Promise.all([this.cargarResumen(), this.cargarTab()]);
  }

  async onDetalleActualizado(): Promise<void> {
    await Promise.all([this.cargarResumen(), this.cargarTab()]);
  }

  reprogramar(item: ItemProgramacion): void {
    if (!item.idProgramacion) {
      this.toast.info('Esta orden todavía no tiene programación activa.');
      return;
    }
    // Ambos roles navegan a la ficha. El back aplica directo (ver pedido back).
    this.router.navigate(['/operaciones/programacion', item.idProgramacion, 'reprogramar']);
  }

  cancelarProgramacion(item: ItemProgramacion): void {
    if (!item.idProgramacion) {
      this.toast.info('Esta orden todavía no tiene programación activa.');
      return;
    }
    this.idCancelarAbierto.set(item.idProgramacion);
  }

  /** Formato de fecha dd-MM-yyyy. Acepta strings `yyyy-MM-dd` o ISO completos. */
  formatearFecha(f?: string | null): string {
    if (!f) return '—';
    const soloFecha = f.length >= 10 ? f.substring(0, 10) : f;
    const partes = soloFecha.split('-');
    if (partes.length !== 3) return f;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  /** Mapeo del sub-estado → etiqueta corta que preferimos mostrar en la tabla. */
  etiquetaSubEstado(se: string): string {
    switch (se) {
      case 'pendiente_programar':      return 'Por programar';
      case 'pendiente_conf_cliente':   return 'Por confirmar cliente';
      case 'pendiente_reprogramacion': return 'Por reprogramar';
      case 'pendiente_ssoma':          return 'Por SSOMA';
      case 'programado':               return 'Programado';
      default:                          return se;
    }
  }

  // ─── Estilos de chips ────────────────────────────────────────────────────

  claseSubEstado(se: string): string {
    switch (se) {
      case 'pendiente_programar':      return 'chip chip--gris';
      case 'pendiente_conf_cliente':   return 'chip chip--ambar';
      case 'pendiente_reprogramacion': return 'chip chip--morado';
      case 'pendiente_ssoma':          return 'chip chip--rojo';
      case 'programado':               return 'chip chip--verde';
      default:                          return 'chip';
    }
  }

  // ─── Vista Principal ──────────────────────────────────────────────────

  claseNivelCarga(nivel: string): string {
    switch (nivel) {
      case 'libre':      return 'chip--gris';
      case 'baja':       return 'chip--azul';
      case 'optimo':     return 'chip--verde';
      case 'alta':       return 'chip--ambar';
      case 'sobrecarga': return 'chip--rojo';
      default:            return 'chip--gris';
    }
  }

  etiquetaNivelCarga(nivel: string): string {
    switch (nivel) {
      case 'libre':      return 'Libre';
      case 'baja':       return 'Baja';
      case 'optimo':     return 'Óptimo';
      case 'alta':       return 'Alta';
      case 'sobrecarga': return 'Sobrecarga';
      default:            return nivel;
    }
  }

  /** Formato HH:MM — recorta segundos si vienen. */
  horaCorta(h?: string | null): string {
    if (!h) return '';
    return h.length >= 5 ? h.substring(0, 5) : h;
  }

  /** Filtra los domingos (no se hacen visitas). */
  diasLaborales<T extends { fecha: string }>(dias: T[]): T[] {
    return dias.filter(d => {
      const dt = new Date(`${d.fecha}T00:00:00`);
      return !isNaN(dt.getTime()) && dt.getDay() !== 0;  // 0 = domingo
    });
  }

  iniciales(nombre: string): string {
    const parts = nombre.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  /** Servicios programados para un técnico en una fecha específica. */
  serviciosDia(idTecnico: number, fecha: string): import('../../../../core/models/programacion-operativa.model').ServicioCalendario[] {
    const cal = this.resumen()?.calendario ?? [];
    return cal.filter(s => s.idTecnico === idTecnico && s.fecha === fecha);
  }

  /** Abre el detalle de la programación desde la tarjeta del calendario.
   *  El back ya expone `idProgramacion` en `ServicioCalendarioDto` (pedido #2
   *  cerrado por Bryan 2026-11-05), así que se usa directo sin workaround. */
  abrirDetalleDesdeCalendario(s: import('../../../../core/models/programacion-operativa.model').ServicioCalendario): void {
    if (!s.idProgramacion) {
      this.toast.info('No se pudo abrir el detalle de este servicio.');
      return;
    }
    this.idDetalleAbierto.set(s.idProgramacion);
  }

  fechaCorta(f: string): string {
    if (!f) return '';
    const p = f.split('-');
    if (p.length !== 3) return f;
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const dt = new Date(`${f}T00:00:00`);
    const dn = isNaN(dt.getTime()) ? '' : dias[dt.getDay()];
    return `${dn} ${p[2]}/${p[1]}`;
  }

  claseViatico(v: ItemProgramacion['viaticoEstado']): string {
    switch (v) {
      case 'sin_asignar':         return 'chip chip--gris';
      case 'pendiente_deposito':  return 'chip chip--ambar';
      case 'depositado':          return 'chip chip--verde';
      default:                     return 'chip';
    }
  }
}
