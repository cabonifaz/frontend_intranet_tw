import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  ],
  templateUrl: './detalle-expediente.component.html',
  styleUrl: './detalle-expediente.component.scss',
})
export class DetalleExpedienteComponent implements OnInit {
  private readonly svc    = inject(ExpedientesDigitalesService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);

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

  claseEstadoChip(sev?: string | null): string {
    switch (sev) {
      case 'ok':       return 'chip-estado--ok';
      case 'warning':  return 'chip-estado--warning';
      case 'critical': return 'chip-estado--critical';
      default:         return 'chip-estado--neutral';
    }
  }

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

  async verArchivo(clave: string): Promise<void> {
    try {
      const blob = await this.svc.obtenerArchivoDocumento(this.idExpediente(), clave, false);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo abrir el archivo.');
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
      this.toast.error(e instanceof Error ? e.message : 'No se pudo descargar el archivo.');
    }
  }

  /** Severidad semántica del grado de necesidad del RQ (ALTA, MEDIA, BAJA). */
  severidadGradoNecesidad(grado?: string | null): string {
    const g = (grado ?? '').toLowerCase();
    if (g === 'alta' || g === 'urgente' || g === 'critica') return 'critical';
    if (g === 'media' || g === 'normal') return 'warning';
    if (g === 'baja' || g === 'baja_prioridad') return 'ok';
    return 'neutral';
  }

  /** Severidad del resultado de una interacción de seguimiento. */
  severidadResultadoInteraccion(resultado?: string | null): string {
    const r = (resultado ?? '').toLowerCase();
    if (['contactado_exitosamente', 'aceptacion', 'aceptada', 'aceptado', 'cerrado_aceptacion', 'confirmado', 'exitoso', 'exitosa', 'completado'].includes(r)) return 'ok';
    if (['sin_respuesta', 'no_contactado', 'no_disponible', 'pendiente', 'buzon', 'reagendado'].includes(r)) return 'warning';
    if (['rechazo', 'rechazada', 'rechazado', 'cerrado_rechazo', 'cancelado', 'perdido', 'error'].includes(r)) return 'critical';
    return 'neutral';
  }

  /** Severidad para el chip del campo `validacion` corto de una OC vinculada. */
  severidadValidacionOc(resultadoIa?: string | null, validacion?: string | null): string {
    const r = (resultadoIa ?? '').toLowerCase();
    const v = (validacion ?? '').toLowerCase();
    if (r === 'ok' || v === 'ok') return 'ok';
    if (r === 'critico' || v.includes('crítica') || v.includes('critica')) return 'critical';
    if (r === 'advertencia' || v.includes('parcial') || v.includes('observa')) return 'warning';
    if (v === 'pendiente') return 'neutral';
    return 'neutral';
  }

  /** Severidad semántica del estado del Visto Bueno. */
  severidadEstadoVb(estado?: string | null): string {
    const e = (estado ?? '').toLowerCase();
    if (['aprobado', 'aprobada'].includes(e)) return 'ok';
    if (['rechazado', 'rechazada'].includes(e)) return 'critical';
    if (['devuelto', 'devuelta', 'devuelto_para_cambios', 'pendiente'].includes(e)) return 'warning';
    if (['sin_solicitud'].includes(e)) return 'neutral';
    return 'neutral';
  }

  /** Severidad semántica del estado de una propuesta generada. */
  severidadEstadoPropuesta(estado?: string | null): string {
    const e = (estado ?? '').toLowerCase();
    if (['aceptada', 'aceptado', 'aprobada', 'aprobado', 'ganada'].includes(e)) return 'ok';
    if (['rechazada', 'rechazado', 'perdida', 'anulada', 'anulado', 'revocada'].includes(e)) return 'critical';
    if (['enviada', 'enviado', 'en_revision', 'borrador', 'pendiente', 'por_enviar'].includes(e)) return 'warning';
    return 'neutral';
  }

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
      this.toast.error(e instanceof Error ? e.message : 'No se pudo exportar el expediente.');
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

  /** Iniciales a partir de un nombre completo (helper para el avatar). */
  iniciales(nombre: string | null | undefined): string {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }

  /** Color del avatar según el rol del responsable. */
  /** Formato "Hoy dd/MM HH:mm" si es hoy, sino "dd/MM HH:mm". */
  formatearFechaCorta(fecha?: string | null): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    const hoy = new Date();
    const esHoy = d.toDateString() === hoy.toDateString();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${esHoy ? 'Hoy ' : ''}${dd}/${mm} ${hh}:${min}`;
  }

  /** Icono según el tipo + título del evento. */
  iconoEventoTimeline(tipo?: string | null, titulo?: string | null): string {
    const t = ((tipo ?? '') + ' ' + (titulo ?? '')).toLowerCase();
    if (t.includes('autogener')) return 'auto_awesome';
    if (t.includes('valid') && !t.includes('invalid')) return 'verified';
    if (t.includes('observ')) return 'warning';
    if (t.includes('reemplaz')) return 'swap_horiz';
    if (t.includes('convertid') || t.includes('conversion')) return 'swap_horiz';
    if (t.includes('aprob') || t.includes('aceptad') || t.includes('visto bueno')) return 'check';
    if (t.includes('rechaz')) return 'close';
    if (t.includes('anulad')) return 'cancel';
    if (t.includes('documento') || t.includes('adjunt') || t.includes('archivo') || t.includes('attach')) return 'description';
    if (t.includes('enviad')) return 'send';
    if (t.includes('solicit')) return 'help';
    if (t.includes('revoc')) return 'undo';
    if (t.includes('vincul') || t.includes('asign')) return 'link';
    if (t.includes('creado') || t.includes('creacion') || t.includes('creada') || t.includes('registr')) return 'add';
    if (t.includes('edici') || t.includes('modif') || t.includes('edit')) return 'edit';
    return 'bolt';
  }

  /** Color del badge según tipo + título. */
  /** Un valor luce como código real (RQ-xxx, PROP-xxx, OC-xxx, 4500-77002) y no como un tipo snake_case. */
  esCodigoEntidad(valor?: string | null): boolean {
    if (!valor) return false;
    // Códigos tienen guión y al menos un dígito; tipos snake_case son todo minúsculas con underscore.
    return /-/.test(valor) && /\d/.test(valor) && !/^[a-z_]+$/.test(valor);
  }

  /** Color del chip de etapa en la actividad reciente / timeline. */
  chipEtapa(etapa?: string | null): string {
    const e = (etapa ?? '').toLowerCase();
    if (e.includes('rq') || e.includes('requer')) return 'azul';
    if (e.includes('propuest')) return 'violeta';
    if (e.includes('vb') || e.includes('visto')) return 'violeta';
    if (e.includes('seg')) return 'cian';
    if (e.includes('oc') || e.includes('compra')) return 'ambar';
    if (e.includes('os') || e.includes('servicio') || e.includes('ejec')) return 'verde';
    if (e.includes('ssoma')) return 'rojo';
    if (e.includes('prog')) return 'cian';
    if (e.includes('cierre')) return 'neutro';
    return 'neutro';
  }

  colorEventoTimeline(tipo?: string | null, titulo?: string | null): string {
    const t = ((tipo ?? '') + ' ' + (titulo ?? '')).toLowerCase();
    if (t.includes('aprob') || t.includes('aceptad') || t.includes('convertid') || (t.includes('valid') && !t.includes('invalid'))) return 'verde';
    if (t.includes('rechaz') || t.includes('anulad') || t.includes('error') || t.includes('critic')) return 'rojo';
    if (t.includes('revoc') || t.includes('solicit') || t.includes('observ') || t.includes('reemplaz') || t.includes('autogener')) return 'ambar';
    return 'azul';
  }

  /** Devuelve los números de propuesta distintos entre todas las versiones (ej. ['PROP-000001', 'PROP-000002']). */
  propuestasDistintas(
    versiones: import('../../../../core/models/expedientes-digitales.model').VersionPropuestaExpedienteDto[],
  ): string[] {
    return [...new Set(versiones.map(v => v.numero))];
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

  /** Severidad del estado de una OS. */
  severidadEstadoOs(estado?: string | null): string {
    const e = (estado ?? '').toLowerCase();
    if (['ejecutada', 'completada', 'cerrada', 'conformada'].includes(e)) return 'ok';
    if (['anulada', 'cancelada', 'rechazada'].includes(e)) return 'critical';
    if (['programada', 'confirmada', 'en_ruta', 'en_ejecucion', 'en_curso', 'pendiente_conformidad'].includes(e)) return 'warning';
    return 'neutral';
  }

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

  /** idPropuesta de la primera versión visible del grupo (para pills "Ver propuestas"). */
  primeraVersionDePropuesta(
    numero: string,
    versiones: import('../../../../core/models/expedientes-digitales.model').VersionPropuestaExpedienteDto[],
  ): number {
    const match = versiones.find(v => v.numero === numero);
    return match?.idPropuesta ?? 0;
  }

  /**
   * Las 9 secciones del wizard. El back devuelve el array `seccionesActivas` con las keys activas.
   * Lo que viene en el array = activa. Lo que no → no activa.
   */
  /** Icono Material Symbols para cada sección del wizard de propuestas. */
  iconoSeccionWizard(clave: string): string {
    const mapa: Record<string, string> = {
      configuracion:       'tune',
      propuesta:           'request_quote',
      opcionales:          'add_circle',
      detalle:             'description',
      recomendaciones:     'lightbulb',
      forma_pago:          'payments',
      suministros_cliente: 'inventory_2',
      condiciones:         'gavel',
      listado_equipos:     'precision_manufacturing',
    };
    return mapa[clave] ?? 'check_box';
  }

  configuracionServicio(seccionesJson?: string | null, equiposVinculados = 0, suministrosCliente = 0): {
    incluidas: number;
    total: number;
    items: { clave: string; nombre: string; numero: number; incluido: boolean; obligatoria: boolean; detalle?: string }[];
  } | null {
    const definicion = [
      { clave: 'configuracion',       numero: 1, nombre: 'Configuración',         obligatoria: true  },
      { clave: 'propuesta',           numero: 2, nombre: 'Propuesta',             obligatoria: true  },
      { clave: 'opcionales',          numero: 3, nombre: 'Opcionales',            obligatoria: false },
      { clave: 'detalle',             numero: 4, nombre: 'Detalle (Textos Base)', obligatoria: false },
      { clave: 'recomendaciones',     numero: 5, nombre: 'Recomendaciones',       obligatoria: false },
      { clave: 'forma_pago',          numero: 6, nombre: 'Forma de Pago',         obligatoria: true  },
      { clave: 'suministros_cliente', numero: 7, nombre: 'Suministros Cliente',   obligatoria: false },
      { clave: 'condiciones',         numero: 8, nombre: 'Condiciones',           obligatoria: false },
      { clave: 'listado_equipos',     numero: 9, nombre: 'Listado de Equipos',    obligatoria: true  },
    ];

    const activas = new Set<string>();
    try {
      const parsed = seccionesJson ? JSON.parse(seccionesJson) : [];
      if (Array.isArray(parsed)) parsed.forEach(k => activas.add(String(k)));
    } catch { /* ignore */ }

    const items = definicion.map(d => {
      let detalle: string | undefined;
      if (d.clave === 'listado_equipos' && equiposVinculados > 0) {
        detalle = `${equiposVinculados} equipo${equiposVinculados > 1 ? 's' : ''}`;
      } else if (d.clave === 'suministros_cliente' && suministrosCliente > 0) {
        detalle = `${suministrosCliente} suministro${suministrosCliente > 1 ? 's' : ''}`;
      }
      return { ...d, incluido: activas.has(d.clave), detalle };
    });

    return {
      incluidas: items.filter(i => i.incluido).length,
      total: items.length,
      items,
    };
  }

  /** Devuelve "hace N días" o "hoy" según la fecha. */
  diasHace(fecha?: string | null): string {
    if (!fecha) return '';
    const dias = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24)));
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'hace 1 día';
    return `hace ${dias} días`;
  }

  // ── Helpers del tab OC ──────────────────────────────────────────

  /** Clase CSS pastel para el estado de la OC. */
  estadoOcClass(estado?: string | null): string {
    const t = (estado ?? '').toLowerCase();
    if (t.includes('validada')) return 'ok';
    if (t.includes('observada') || t.includes('parcial')) return 'warning';
    if (t.includes('anulada') || t.includes('rechaz')) return 'critical';
    if (t.includes('autogenerada') || t.includes('pendiente')) return 'neutral';
    return 'neutral';
  }

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

  severidadClass(sev?: string | null): string {
    const s = (sev ?? '').toLowerCase();
    if (s === 'ok' || s === 'coincide') return 'ok';
    if (s === 'advertencia' || s === 'diferencia') return 'warning';
    if (s === 'critico' || s === 'rechazo') return 'critical';
    return 'neutral';
  }

  iconoSeveridad(sev?: string | null): string {
    const s = (sev ?? '').toLowerCase();
    if (s === 'ok' || s === 'coincide') return 'check_circle';
    if (s === 'critico') return 'error';
    if (s === 'advertencia' || s === 'diferencia') return 'warning';
    return 'help';
  }

  labelSeveridad(sev?: string | null): string {
    const s = (sev ?? '').toLowerCase();
    if (s === 'ok' || s === 'coincide') return 'Coincide';
    if (s === 'critico') return 'Crítico';
    if (s === 'advertencia' || s === 'diferencia') return 'Diferencia';
    if (s === 'sin_dato') return 'Sin dato';
    return sev ?? '—';
  }

  /** Humaniza un estado tipo "CERRADO_ACEPTACION" → "Cerrado · Aceptación". */
  /** Severidad semántica a partir del estado para pintar el chip con color pastel. */
  severidadEstado(estado?: string | null): string {
    if (!estado) return 'neutral';
    const e = estado.toLowerCase();
    if (['aceptado', 'aceptacion', 'aprobado', 'validada', 'completado', 'activo', 'con_propuesta', 'ejecutado', 'cerrado', 'cerradoaceptacion', 'ok', 'verde', 'programada'].includes(e)) return 'ok';
    if (['pendiente', 'pendiente_reemplazo', 'en_revision', 'observada', 'observado', 'en_curso', 'borrador', 'enviada', 'enviado', 'postergado', 'validacion_parcial', 'autogenerada'].includes(e)) return 'warning';
    if (['anulada', 'anulado', 'rechazado', 'rechazo', 'revocada', 'revocado', 'cerradorechazo', 'bloqueado', 'critico', 'vencido'].includes(e)) return 'critical';
    return 'neutral';
  }

  /** Nombre corto para la píldora de tipo de entidad (RQ, PROP, OC, OS, OM). */
  tipoCortoEntidad(tipo?: string | null): string {
    const t = (tipo || '').toLowerCase();
    if (t === 'requerimiento' || t === 'rq') return 'RQ';
    if (t === 'propuesta') return 'PROP';
    if (t === 'orden_compra' || t === 'oc') return 'OC';
    if (t === 'orden_servicio' || t === 'os') return 'OS';
    if (t === 'orden_metrologia' || t === 'om') return 'OM';
    return (tipo ?? '—').toUpperCase().replace(/_/g, ' ');
  }

  /** Modifier CSS para la píldora de tipo (rq, propuesta, oc, os, om). */
  cssTipoEntidad(tipo?: string | null): string {
    const t = (tipo || '').toLowerCase();
    if (t === 'requerimiento' || t === 'rq') return 'rq';
    if (t === 'propuesta') return 'propuesta';
    if (t === 'orden_compra' || t === 'oc') return 'oc';
    if (t === 'orden_servicio' || t === 'os') return 'os';
    if (t === 'orden_metrologia' || t === 'om') return 'om';
    return 'neutro';
  }

  humanizarEstado(estado?: string | null): string {
    if (!estado) return '—';
    const tildes: Record<string, string> = {
      aceptacion: 'Aceptación',
      rechazo: 'Rechazo',
      cerrado: 'Cerrado',
      cerradoaceptacion: 'Cerrado · Aceptación',
      cerradorechazo: 'Cerrado · Rechazo',
      activo: 'Activo',
      sinseguimiento: 'Sin seguimiento',
      postergado: 'Postergado',
    };
    const normalizado = estado.toLowerCase().replace(/[_\s]/g, '');
    return tildes[normalizado] ?? estado
      .toLowerCase()
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' · ');
  }

  /** Formatea un teléfono peruano típico (9 dígitos) a "+51 999 999 999". */
  formatearTelefono(tel?: string | null): string {
    if (!tel) return '—';
    const limpio = tel.replace(/\s|-|\+/g, '');
    if (limpio.length === 9) return `+51 ${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
    if (limpio.length === 11 && limpio.startsWith('51')) {
      const sinCod = limpio.slice(2);
      return `+51 ${sinCod.slice(0, 3)} ${sinCod.slice(3, 6)} ${sinCod.slice(6)}`;
    }
    return tel;
  }

  /** TitleCase simple: "ADMIN" → "Admin", "SUPERINTENDENTE DE PLANTA" → "Superintendente De Planta". */
  titleCase(txt?: string | null): string {
    if (!txt) return '—';
    // Palabras de 2-3 letras que se mantienen en mayúsculas (siglas comunes).
    const siglas = new Set(['TI', 'HR', 'QA', 'IT', 'OC', 'OS', 'RQ', 'VB', 'IA', 'PE', 'RRHH', 'TIC', 'SST', 'SSO', 'SSOMA', 'GTH', 'GAF', 'CEO', 'CFO', 'CTO', 'COO', 'ERP', 'CRM']);
    return txt
      .split(/\s+/)
      .map(w => {
        const up = w.toUpperCase();
        if (siglas.has(up)) return up;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
  }

  // ── Helpers de Interacciones del Seguimiento ────────────────────

  /** Icono según el tipo de interacción. */
  iconoInteraccion(tipo?: string | null): string {
    const t = (tipo ?? '').toLowerCase();
    if (t.includes('llamada'))  return 'call';
    if (t.includes('correo'))   return 'mail';
    if (t.includes('visita'))   return 'storefront';
    if (t.includes('reunion'))  return 'groups';
    if (t.includes('propuesta') || t.includes('envi')) return 'send';
    if (t.includes('acept'))    return 'check_circle';
    if (t.includes('rechaz'))   return 'cancel';
    return 'chat';
  }

  /** Color del badge/card de la interacción según tipo + resultado. */
  colorInteraccion(tipo?: string | null, resultado?: string | null): string {
    const r = (resultado ?? '').toLowerCase();
    if (r.includes('acept')) return 'verde';
    if (r.includes('rechaz')) return 'rojo';
    const t = (tipo ?? '').toLowerCase();
    if (t.includes('llamada'))  return 'ambar';
    if (t.includes('visita') || t.includes('reunion')) return 'morado';
    return 'azul';
  }

  /** Icono según el canal de comunicación. */
  iconoCanal(canal?: string | null): string {
    const c = (canal ?? '').toLowerCase();
    if (c.includes('correo') || c.includes('mail')) return 'mail';
    if (c.includes('telef') || c.includes('llamad')) return 'call';
    if (c.includes('whats')) return 'chat';
    if (c.includes('visita') || c.includes('presencial')) return 'location_on';
    return 'send';
  }

  /** Clase para el resultado del seguimiento. */
  resultadoClass(resultado?: string | null): string {
    const r = (resultado ?? '').toLowerCase();
    if (r.includes('acept')) return 'ok';
    if (r.includes('rechaz')) return 'critical';
    if (r.includes('posterg')) return 'warning';
    return 'neutral';
  }

  /** Clase CSS para el card de decisión según el estado del VB. */
  estadoDecisionClass(estado?: string | null): string {
    const t = (estado ?? '').toLowerCase();
    if (t.includes('aprob'))  return 'ok';
    if (t.includes('rechaz')) return 'critical';
    if (t.includes('devuel') || t.includes('observ')) return 'warning';
    return 'neutral';
  }

  /** Icono Material Symbols para el estado de una decisión de VB. */
  iconoDecision(estado?: string | null): string {
    const t = (estado ?? '').toLowerCase();
    if (t.includes('aprob'))  return 'check';
    if (t.includes('rechaz')) return 'close';
    if (t.includes('devuel') || t.includes('observ')) return 'undo';
    return 'help';
  }

  /** Etiqueta legible para el estado de una decisión de VB (corta). */
  labelDecision(estado?: string | null): string {
    const t = (estado ?? '').toLowerCase();
    if (t.includes('aprob'))  return 'Aprobada';
    if (t.includes('rechaz')) return 'Rechazada';
    if (t.includes('devuel') || t.includes('observ')) return 'Devuelta para ajustes';
    return estado ?? '';
  }

  iconoArchivo(tipo?: string | null): string {
    const t = (tipo ?? '').toLowerCase();
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('xls') || t.includes('excel') || t.includes('sheet')) return 'table_chart';
    if (t.includes('doc') || t.includes('word')) return 'description';
    if (t.includes('eml') || t.includes('mail')) return 'mail';
    if (t.includes('jpg') || t.includes('png') || t.includes('image')) return 'image';
    return 'draft';
  }

  tamanoLegible(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  colorResponsable(rol: string): string {
    switch (rol) {
      case 'comercial':    return 'azul';
      case 'operaciones':  return 'verde';
      case 'ssoma':        return 'rojo';
      case 'tecnico':      return 'morado';
      default:             return 'gris';
    }
  }

  nombreRol(rol?: string | null): string {
    const r = (rol ?? '').toLowerCase();
    if (r === 'comercial')   return 'COMERCIAL';
    if (r === 'operaciones') return 'OPERACIONES';
    if (r === 'ssoma')       return 'SSOMA';
    if (r === 'tecnico')     return 'TÉCNICO';
    return (rol ?? '').toUpperCase();
  }

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
