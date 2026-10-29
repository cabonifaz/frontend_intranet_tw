import { Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SeccionComponent } from '../../../../shared/ui/seccion/seccion.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { ModalRepositorioDocumentosComponent } from '../modal-repositorio-documentos/modal-repositorio-documentos.component';
import { ModalAuditoriaExpedienteComponent } from '../modal-auditoria-expediente/modal-auditoria-expediente.component';
import { ModalReasignarResponsableComponent } from '../modal-reasignar-responsable/modal-reasignar-responsable.component';
import { ExpedientesDigitalesService } from '../../../../core/services/expedientes-digitales.service';
import { ToastService } from '../../../../core/services/toast.service';
import { breadcrumbCrm } from '../../../../core/constants/breadcrumbs';
import { ExpedienteHelpersService } from './expediente-helpers.service';
import { DrillPropuestaComponent } from './drill-downs/drill-propuesta/drill-propuesta.component';
import { DrillVistoBuenoComponent } from './drill-downs/drill-visto-bueno/drill-visto-bueno.component';
import { DrillSsomaComponent } from './drill-downs/drill-ssoma/drill-ssoma.component';
import { DrillProgramacionComponent } from './drill-downs/drill-programacion/drill-programacion.component';
import { DrillEjecucionComponent } from './drill-downs/drill-ejecucion/drill-ejecucion.component';
import { DrillCierreComponent } from './drill-downs/drill-cierre/drill-cierre.component';
import { DrillOrdenServicioComponent } from './drill-downs/drill-orden-servicio/drill-orden-servicio.component';
import { DrillRequerimientoComponent } from './drill-downs/drill-requerimiento/drill-requerimiento.component';
import { DrillOrdenCompraComponent } from './drill-downs/drill-orden-compra/drill-orden-compra.component';
import { DrillSeguimientoComponent } from './drill-downs/drill-seguimiento/drill-seguimiento.component';
import {
  DetalleExpedienteDto,
  EtapaExpedienteDto,
  TabCierreExpedienteDto,
  TabEjecucionExpedienteDto,
  TabOrdenServicioExpedienteDto,
  TabOrdenesCompraExpedienteDto,
  TabProgramacionExpedienteDto,
  TabPropuestasExpedienteDto,
  TabRqExpedienteDto,
  TabSeguimientoExpedienteDto,
  TabSsomaExpedienteDto,
  TabVistoBuenoExpedienteDto,
} from '../../../../core/models/expedientes-digitales.model';

/** Códigos de etapa del back (deben matchear con los que vienen en EtapaExpedienteDto.etapa). */
type CodigoEtapa =
  | 'requerimiento'
  | 'propuesta'
  | 'visto_bueno'
  | 'seguimiento'
  | 'orden_compra'
  | 'orden_servicio'
  | 'programacion'
  | 'ssoma'
  | 'ejecucion'
  | 'cierre';

type TabActivo = 'resumen' | CodigoEtapa;

/** Discriminated union de los distintos tabs que puede devolver el back. */
export type DrillTabDto =
  | { tipo: 'requerimiento';  data: TabRqExpedienteDto }
  | { tipo: 'propuesta';      data: TabPropuestasExpedienteDto }
  | { tipo: 'visto_bueno';    data: TabVistoBuenoExpedienteDto }
  | { tipo: 'seguimiento';    data: TabSeguimientoExpedienteDto }
  | { tipo: 'orden_compra';   data: TabOrdenesCompraExpedienteDto }
  | { tipo: 'orden_servicio'; data: TabOrdenServicioExpedienteDto }
  | { tipo: 'programacion';   data: TabProgramacionExpedienteDto }
  | { tipo: 'ssoma';          data: TabSsomaExpedienteDto }
  | { tipo: 'ejecucion';      data: TabEjecucionExpedienteDto }
  | { tipo: 'cierre';         data: TabCierreExpedienteDto };

/**
 * HU-30 — Ficha Detalle del Expediente Digital.
 * Pipeline con 10 etapas + Resumen. Al clickar una etapa se carga su tab contra el back (lazy).
 */
@Component({
  selector: 'app-detalle-expediente',
  imports: [
    CommonModule,
    ButtonComponent,
    SeccionComponent,
    PageHeaderComponent,
    ModalRepositorioDocumentosComponent,
    ModalAuditoriaExpedienteComponent,
    ModalReasignarResponsableComponent,
    DrillPropuestaComponent,
    DrillVistoBuenoComponent,
    DrillSsomaComponent,
    DrillProgramacionComponent,
    DrillEjecucionComponent,
    DrillCierreComponent,
    DrillOrdenServicioComponent,
    DrillRequerimientoComponent,
    DrillOrdenCompraComponent,
    DrillSeguimientoComponent,
  ],
  templateUrl: './detalle-expediente.component.html',
  styleUrl: './detalle-expediente.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DetalleExpedienteComponent implements OnInit {
  private readonly svc     = inject(ExpedientesDigitalesService);
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly toast   = inject(ToastService);
  protected readonly helpers = inject(ExpedienteHelpersService);

  readonly breadcrumb    = breadcrumbCrm('Expedientes Digitales', 'Detalle');
  readonly idExpediente  = signal<number>(0);
  readonly cargando      = signal(true);
  readonly cargandoEtapa = signal(false);
  readonly detalle       = signal<DetalleExpedienteDto | null>(null);
  readonly tabActivo     = signal<TabActivo>('resumen');
  readonly drillEtapa    = signal<DrillTabDto | null>(null);
  /** Cache de drill-downs ya cargados. */
  private readonly drillCache = new Map<CodigoEtapa, DrillTabDto>();

  // ── Modales ─────────────────────────────────────────────────────
  readonly modalDocumentos = signal(false);
  readonly modalAuditoria  = signal(false);
  readonly modalReasignar  = signal(false);
  readonly exportando      = signal(false);

  // ── Helpers computados que adaptan el nuevo contrato al formato del HTML ───

  /** Chips de la cabecera armados a partir de los campos del nuevo DTO. */
  readonly chipsCabecera = computed(() => {
    const c = this.detalle()?.cabecera;
    if (!c) return [] as { tipo: string; label: string; valor?: string; severidad: string }[];
    const chips: { tipo: string; label: string; valor?: string; severidad: string }[] = [];
    chips.push({
      tipo: 'estado',
      label: c.estado === 'activo' ? 'ACTIVO' : c.estado.toUpperCase(),
      severidad: c.estado === 'activo' ? 'ok' : c.estado === 'bloqueado' ? 'critical' : 'warning',
    });
    chips.push({ tipo: 'info', label: 'Etapa', valor: c.etapaNombre ?? c.etapa, severidad: 'neutral' });
    if (c.responsable) chips.push({ tipo: 'responsable', label: 'Responsable', valor: c.responsable, severidad: 'neutral' });
    if (c.diasTranscurridos) chips.push({ tipo: 'info', label: `${c.diasTranscurridos} días transcurridos`, severidad: 'neutral' });
    if (c.sla?.minutosRestantes != null) {
      const estado = c.sla.estado;
      const sev = estado === 'vencido' ? 'critical' : estado === 'en_riesgo' ? 'warning' : 'ok';
      const dias = Math.max(0, Math.floor(c.sla.minutosRestantes / (60 * 24)));
      chips.push({ tipo: 'sla', label: 'SLA', valor: estado === 'vencido' ? 'vencido' : `${dias} días restantes`, severidad: sev });
    }
    if (c.documentosTotales) chips.push({ tipo: 'info', label: `${c.documentosTotales} documentos`, severidad: 'neutral' });
    if (c.bloqueosActivos) chips.push({ tipo: 'bloqueo', label: `${c.bloqueosActivos} bloqueo${c.bloqueosActivos > 1 ? 's' : ''} activo${c.bloqueosActivos > 1 ? 's' : ''}`, severidad: 'critical' });
    chips.push({ tipo: 'progreso', label: 'Progreso', valor: `${c.progreso}%`, severidad: 'ok' });
    return chips;
  });

  /** Pipeline con icono y cantidad calculados por etapa (para el HTML sin cambios). */
  readonly pipelineVista = computed(() => {
    const etapas = this.detalle()?.etapas ?? [];
    const cab = this.detalle()?.cabecera;
    const resumen = { etapa: 'resumen', nombre: 'Resumen', estado: 'completado', icono: 'bar_chart', cantidad: null, orden: 0 };
    const mapIcono: Record<string, string> = {
      requerimiento: 'description', propuesta: 'request_quote', visto_bueno: 'verified', seguimiento: 'phone_in_talk',
      orden_compra: 'receipt_long', orden_servicio: 'engineering', programacion: 'event_available',
      ssoma: 'health_and_safety', ejecucion: 'play_circle', cierre: 'task_alt',
    };
    const mapCantidad: Record<string, number | null> = {
      propuesta: cab?.cantidadPropuestas ?? null,
      orden_compra: cab?.cantidadOc ?? null,
      visto_bueno: cab?.cantidadVb ?? null,
      orden_servicio: cab?.cantidadOs ?? null,
    };
    const pasos = etapas.map(e => ({
      etapa: e.etapa,
      nombre: e.nombre,
      estado: e.estado,
      icono: mapIcono[e.etapa] ?? 'radio_button_unchecked',
      cantidad: mapCantidad[e.etapa] ?? null,
      orden: e.orden,
    }));
    return [resumen, ...pasos];
  });

  /** Vista panorámica derivada de la cabecera (lo que antes estaba en resumen.vistaPanoramica). */
  readonly vistaPanoramica = computed(() => {
    const c = this.detalle()?.cabecera;
    if (!c) return null;
    return {
      cliente: c.razonSocial ?? '—',
      area: c.areaNombre ?? c.area ?? null,
      fechaEmision: c.fechaCreacion,
      diasTranscurridos: c.diasTranscurridos,
      diasRestantes: c.sla?.minutosRestantes != null ? Math.floor(c.sla.minutosRestantes / (60 * 24)) : null,
      importeTotal: c.montoTotal ?? 0,
      monedaSimbolo: c.simboloMoneda,
      progresoPct: c.progreso,
    };
  });

  /** Próximo hito armado desde la cabecera. */
  readonly proximoHito = computed(() => {
    const c = this.detalle()?.cabecera;
    if (!c?.siguienteEtapa) return null;
    const slaEstado = c.sla?.estado === 'vencido' ? 'critical' : c.sla?.estado === 'en_riesgo' ? 'warning' : 'ok';
    const minutos = c.sla?.minutosRestantes;
    let slaRestante: string | null = null;
    if (minutos != null) {
      if (minutos <= 0) {
        slaRestante = 'Vencido';
      } else {
        const dias = Math.floor(minutos / (60 * 24));
        const horas = Math.floor((minutos % (60 * 24)) / 60);
        slaRestante = dias > 0 ? `${dias} día${dias > 1 ? 's' : ''}` : `${horas} h`;
      }
    }
    return {
      // HITO = acción pendiente ahora (ej. "Validar OC"). Fallback al nombre de la etapa activa.
      titulo: c.proximoPaso ?? c.etapaNombre ?? c.etapa,
      responsable: c.responsableEtapa ?? c.responsable ?? '—',
      slaRestante,
      slaEstado,
      // "Al completarse avanzará a" = próxima etapa del flujo (ej. "Orden de Servicio").
      siguienteEtapa: c.siguienteEtapaNombre ?? c.siguienteEtapa ?? '—',
    };
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.params['idExpediente']);
    this.idExpediente.set(id);
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const r = await this.svc.obtenerDetalle(this.idExpediente());
      this.detalle.set(r);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar el expediente.');
    } finally {
      this.cargando.set(false);
    }
  }

  irAtras(): void { void this.router.navigate(['/crm/expedientes-digitales']); }

  async cambiarTab(paso: EtapaExpedienteDto | { etapa: 'resumen' }): Promise<void> {
    const codigo = paso.etapa as TabActivo;
    this.tabActivo.set(codigo);
    if (codigo === 'resumen') { this.drillEtapa.set(null); return; }

    const etapa = codigo as CodigoEtapa;
    if (this.drillCache.has(etapa)) { this.drillEtapa.set(this.drillCache.get(etapa)!); return; }

    this.cargandoEtapa.set(true);
    try {
      const drill = await this.cargarDrill(etapa);
      this.drillCache.set(etapa, drill);
      this.drillEtapa.set(drill);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la etapa.');
    } finally {
      this.cargandoEtapa.set(false);
    }
  }

  /** Llama al endpoint correcto según la etapa y arma la discriminated union. */
  private async cargarDrill(etapa: CodigoEtapa): Promise<DrillTabDto> {
    const id = this.idExpediente();
    switch (etapa) {
      case 'requerimiento':  return { tipo: 'requerimiento',  data: await this.svc.obtenerTabRq(id) };
      case 'propuesta':      return { tipo: 'propuesta',      data: await this.svc.obtenerTabPropuestas(id) };
      case 'visto_bueno':    return { tipo: 'visto_bueno',    data: await this.svc.obtenerTabVistoBueno(id) };
      case 'seguimiento':    return { tipo: 'seguimiento',    data: await this.svc.obtenerTabSeguimiento(id) };
      case 'orden_compra':   return { tipo: 'orden_compra',   data: await this.svc.obtenerTabOrdenesCompra(id) };
      case 'orden_servicio': return { tipo: 'orden_servicio', data: await this.svc.obtenerTabOrdenServicio(id) };
      case 'programacion':   return { tipo: 'programacion',   data: await this.svc.obtenerTabProgramacion(id) };
      case 'ssoma':          return { tipo: 'ssoma',          data: await this.svc.obtenerTabSsoma(id) };
      case 'ejecucion':      return { tipo: 'ejecucion',      data: await this.svc.obtenerTabEjecucion(id) };
      case 'cierre':         return { tipo: 'cierre',         data: await this.svc.obtenerTabCierre(id) };
    }
  }

  // ─── Helpers UI ────────────────────────────────────────────────

  claseEstadoChip(sev?: string | null): string { return this.helpers.claseEstadoChip(sev); }

  abrirDocumentos(): void { this.modalDocumentos.set(true); }
  abrirAuditoria(): void  { this.modalAuditoria.set(true); }
  abrirReasignar(): void  { this.modalReasignar.set(true); }

  irAlRequerimiento(id: number | null | undefined): void {
    if (id == null) return;
    void this.router.navigate(['/crm/requerimientos', id]);
  }

  irALaPropuesta(id: number | null | undefined): void {
    if (id == null) return;
    void this.router.navigate(['/crm/propuestas', id]);
  }

  /** Extrae el mensaje real del back cuando el request de blob falla (el error body viene como Blob). */
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
    if (err?.status === 404) return 'El archivo no se encontró.';
    if (err?.status === 403) return 'No tienes permisos para abrir este archivo.';
    if (err?.status === 401) return 'Sesión expirada. Volvé a iniciar sesión.';
    return err?.message || fallback;
  }

  async verArchivo(clave: string): Promise<void> {
    try {
      const blob = await this.svc.obtenerArchivoDocumento(this.idExpediente(), clave, false);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e: unknown) {
      this.toast.error(await this.mensajeErrorBlob(e, 'No se pudo abrir el archivo.'));
    }
  }

  async descargarArchivo(clave: string, nombreSugerido?: string | null): Promise<void> {
    try {
      const blob = await this.svc.obtenerArchivoDocumento(this.idExpediente(), clave, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreSugerido || clave;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      this.toast.error(await this.mensajeErrorBlob(e, 'No se pudo descargar el archivo.'));
    }
  }

  severidadGradoNecesidad(grado?: string | null): string { return this.helpers.severidadGradoNecesidad(grado); }
  severidadResultadoInteraccion(resultado?: string | null): string { return this.helpers.severidadResultadoInteraccion(resultado); }
  severidadValidacionOc(resultadoIa?: string | null, validacion?: string | null): string { return this.helpers.severidadValidacionOc(resultadoIa, validacion); }
  severidadEstadoVb(estado?: string | null): string { return this.helpers.severidadEstadoVb(estado); }
  severidadEstadoPropuesta(estado?: string | null): string { return this.helpers.severidadEstadoPropuesta(estado); }

  async exportar(): Promise<void> {
    this.exportando.set(true);
    try {
      const blob = await this.svc.descargarExpedienteZip(this.idExpediente());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expediente_${this.detalle()?.cabecera.numero ?? this.idExpediente()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      this.toast.error(await this.mensajeErrorBlob(e, 'No se pudo exportar el expediente.'));
    } finally {
      this.exportando.set(false);
    }
  }

  async onReasignado(): Promise<void> {
    this.modalReasignar.set(false);
    this.drillCache.clear();
    await this.cargar();
  }

  clasePaso(paso: EtapaExpedienteDto): string {
    const base = 'pipeline-paso';
    const partes = [
      base,
      `${base}--${paso.estado}`,
      paso.etapa === this.tabActivo() ? `${base}--seleccionado` : '',
    ];
    return partes.filter(Boolean).join(' ');
  }

  // ── Helpers de UI del tab Resumen ──────────────────────────────

  /** Entidades sin padre (raíz) para pintar el árbol en 3 niveles. */
  readonly entidadesNivel0 = computed(() => (this.detalle()?.entidades ?? []).filter(e => !e.clavePadre));

  /** Hijos directos de una entidad por su clave. */
  hijosDe(clave: string | null | undefined): import('../../../../core/models/expedientes-digitales.model').EntidadExpedienteDto[] {
    if (!clave) return [];
    return (this.detalle()?.entidades ?? []).filter(e => e.clavePadre === clave);
  }

  iniciales(nombre: string | null | undefined): string { return this.helpers.iniciales(nombre); }
  formatearFechaCorta(fecha?: string | null): string { return this.helpers.formatearFechaCorta(fecha); }
  iconoEventoTimeline(tipo?: string | null, titulo?: string | null): string { return this.helpers.iconoEventoTimeline(tipo, titulo); }
  esCodigoEntidad(valor?: string | null): boolean { return this.helpers.esCodigoEntidad(valor); }
  chipEtapa(etapa?: string | null): string { return this.helpers.chipEtapa(etapa); }
  colorEventoTimeline(tipo?: string | null, titulo?: string | null): string { return this.helpers.colorEventoTimeline(tipo, titulo); }
  propuestasDistintas(
    versiones: import('../../../../core/models/expedientes-digitales.model').VersionPropuestaExpedienteDto[],
  ): string[] {
    return this.helpers.propuestasDistintas(versiones);
  }

  irAlVistoBueno(idVb?: number | null): void {
    if (idVb != null) {
      void this.router.navigate(['/crm/visto-bueno', idVb]);
    } else {
      void this.router.navigate(['/crm/visto-bueno']);
    }
  }

  irAlSeguimiento(): void {
    void this.router.navigate(['/crm/seguimiento']);
  }

  irALaOc(id: number | null | undefined): void {
    if (id == null) return;
    void this.router.navigate(['/crm/ordenes-compra', id]);
  }

  irALaOs(id: number | null | undefined): void {
    if (id == null) return;
    void this.router.navigate(['/operaciones/ordenes-servicio', id]);
  }

  severidadEstadoOs(estado?: string | null): string { return this.helpers.severidadEstadoOs(estado); }

  /** Cambia la OC mostrada en el tab OC. */
  async cambiarOcMostrada(idOc: number): Promise<void> {
    this.cargandoEtapa.set(true);
    try {
      const data = await this.svc.obtenerTabOrdenesCompra(this.idExpediente(), idOc);
      const nuevo: DrillTabDto = { tipo: 'orden_compra', data };
      this.drillCache.set('orden_compra', nuevo);
      this.drillEtapa.set(nuevo);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la OC.');
    } finally {
      this.cargandoEtapa.set(false);
    }
  }

  /** Cambia la propuesta mostrada en el tab Seguimiento. */
  async cambiarPropuestaSeguimiento(numero: string): Promise<void> {
    this.cargandoEtapa.set(true);
    try {
      const data = await this.svc.obtenerTabSeguimiento(this.idExpediente(), numero);
      const nuevo: DrillTabDto = { tipo: 'seguimiento', data };
      this.drillCache.set('seguimiento', nuevo);
      this.drillEtapa.set(nuevo);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la propuesta.');
    } finally {
      this.cargandoEtapa.set(false);
    }
  }

  /** Cambia la propuesta mostrada en el tab VB. El endpoint acepta `numero` como filtro. */
  async cambiarPropuestaVb(numero: string): Promise<void> {
    this.cargandoEtapa.set(true);
    try {
      const data = await this.svc.obtenerTabVistoBueno(this.idExpediente(), numero);
      const nuevo: DrillTabDto = { tipo: 'visto_bueno', data };
      this.drillCache.set('visto_bueno', nuevo);
      this.drillEtapa.set(nuevo);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la propuesta.');
    } finally {
      this.cargandoEtapa.set(false);
    }
  }

  /** Cambia la propuesta/versión mostrada en el tab Propuesta y recarga desde el back. */
  async cambiarPropuestaMostrada(idPropuesta: number): Promise<void> {
    this.cargandoEtapa.set(true);
    try {
      const data = await this.svc.obtenerTabPropuestas(this.idExpediente(), idPropuesta);
      const nuevo: DrillTabDto = { tipo: 'propuesta', data };
      this.drillCache.set('propuesta', nuevo);
      this.drillEtapa.set(nuevo);
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo cargar la propuesta.');
    } finally {
      this.cargandoEtapa.set(false);
    }
  }

  primeraVersionDePropuesta(
    numero: string,
    versiones: import('../../../../core/models/expedientes-digitales.model').VersionPropuestaExpedienteDto[],
  ): number {
    return this.helpers.primeraVersionDePropuesta(numero, versiones);
  }

  iconoSeccionWizard(clave: string): string { return this.helpers.iconoSeccionWizard(clave); }

  configuracionServicio(seccionesJson?: string | null, equiposVinculados = 0, suministrosCliente = 0) {
    return this.helpers.configuracionServicio(seccionesJson, equiposVinculados, suministrosCliente);
  }

  diasHace(fecha?: string | null): string { return this.helpers.diasHace(fecha); }

  // ── Helpers del tab OC ──────────────────────────────────────────

  estadoOcClass(estado?: string | null): string { return this.helpers.estadoOcClass(estado); }

  /** Nº de diferencias detectadas por la IA (suma de advertencias + críticas). */
  difsIa(): number {
    const d = this.detalle();
    if (!d) return 0;
    const drill = this.drillEtapa();
    if (!drill || drill.tipo !== 'orden_compra') return 0;
    return drill.data.campos?.filter(c => (c.severidad ?? '').toLowerCase() !== 'ok' && (c.severidad ?? '').toLowerCase() !== 'sin_dato').length ?? 0;
  }

  /** Resultado global de validación IA (peor severidad entre los campos). */
  resultadoGlobalIa(): 'ok' | 'advertencia' | 'critico' {
    const drill = this.drillEtapa();
    if (!drill || drill.tipo !== 'orden_compra') return 'ok';
    const severidades = drill.data.campos?.map(c => (c.severidad ?? '').toLowerCase()) ?? [];
    if (severidades.some(s => s === 'critico')) return 'critico';
    if (severidades.some(s => s === 'advertencia')) return 'advertencia';
    return 'ok';
  }

  severidadClass(sev?: string | null): string { return this.helpers.severidadClass(sev); }
  iconoSeveridad(sev?: string | null): string { return this.helpers.iconoSeveridad(sev); }
  labelSeveridad(sev?: string | null): string { return this.helpers.labelSeveridad(sev); }
  severidadEstado(estado?: string | null): string { return this.helpers.severidadEstado(estado); }
  tipoCortoEntidad(tipo?: string | null): string { return this.helpers.tipoCortoEntidad(tipo); }
  cssTipoEntidad(tipo?: string | null): string { return this.helpers.cssTipoEntidad(tipo); }
  humanizarEstado(estado?: string | null): string { return this.helpers.humanizarEstado(estado); }
  formatearTelefono(tel?: string | null): string { return this.helpers.formatearTelefono(tel); }
  titleCase(txt?: string | null): string { return this.helpers.titleCase(txt); }

  // ── Helpers de Interacciones del Seguimiento ────────────────────

  iconoInteraccion(tipo?: string | null): string { return this.helpers.iconoInteraccion(tipo); }
  colorInteraccion(tipo?: string | null, resultado?: string | null): string { return this.helpers.colorInteraccion(tipo, resultado); }
  iconoCanal(canal?: string | null): string { return this.helpers.iconoCanal(canal); }
  resultadoClass(resultado?: string | null): string { return this.helpers.resultadoClass(resultado); }
  estadoDecisionClass(estado?: string | null): string { return this.helpers.estadoDecisionClass(estado); }
  iconoDecision(estado?: string | null): string { return this.helpers.iconoDecision(estado); }
  labelDecision(estado?: string | null): string { return this.helpers.labelDecision(estado); }
  iconoArchivo(tipo?: string | null): string { return this.helpers.iconoArchivo(tipo); }
  tamanoLegible(bytes?: number | null): string { return this.helpers.tamanoLegible(bytes); }
  colorResponsable(rol: string): string { return this.helpers.colorResponsable(rol); }
  nombreRol(rol?: string | null): string { return this.helpers.nombreRol(rol); }

  iconoEtapa(): string {
    const map: Record<string, string> = {
      requerimiento: 'description', propuesta: 'request_quote', visto_bueno: 'verified', seguimiento: 'phone_in_talk',
      orden_compra: 'receipt_long', orden_servicio: 'engineering', programacion: 'event_available',
      ssoma: 'health_and_safety', ejecucion: 'play_circle', cierre: 'task_alt',
    };
    return map[this.tabActivo() as string] ?? 'folder_open';
  }

  tituloEtapa(): string {
    const paso = this.pipelineVista().find(p => p.etapa === this.tabActivo());
    return paso?.nombre ?? 'Detalle';
  }

  /** Variante usada en el pipeline fabricado (incluye el nodo "resumen"). */
  clasePasoVista(paso: { etapa: string; estado: string }): string {
    const base = 'pipeline-paso';
    const partes = [
      base,
      `${base}--${paso.estado}`,
      paso.etapa === this.tabActivo() ? `${base}--seleccionado` : '',
    ];
    return partes.filter(Boolean).join(' ');
  }
}
