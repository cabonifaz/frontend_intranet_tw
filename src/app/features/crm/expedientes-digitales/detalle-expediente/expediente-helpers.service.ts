import { Injectable } from '@angular/core';
import { VersionPropuestaExpedienteDto } from '../../../../core/models/expedientes-digitales.model';

/**
 * Helpers stateless usados por el detalle de expediente y sus sub-componentes de drill-down.
 * Se extrajo del componente padre para reducir su tamaño y permitir reutilizarlos desde los
 * sub-componentes (drill-propuesta, drill-visto-bueno, drill-seguimiento, etc.).
 *
 * IMPORTANTE: cualquier método que acceda a `this.detalle()`, `this.router`, `this.svc`, etc.
 * NO debe moverse aquí: ese estado vive en el componente padre.
 */
@Injectable({ providedIn: 'root' })
export class ExpedienteHelpersService {

  // ── Clases de chip de estado ───────────────────────────────────────────────

  claseEstadoChip(sev?: string | null): string {
    switch (sev) {
      case 'ok':       return 'chip-estado--ok';
      case 'warning':  return 'chip-estado--warning';
      case 'critical': return 'chip-estado--critical';
      default:         return 'chip-estado--neutral';
    }
  }

  // ── Severidades semánticas ────────────────────────────────────────────────

  severidadGradoNecesidad(grado?: string | null): string {
    const g = (grado ?? '').toLowerCase();
    if (g === 'alta' || g === 'urgente' || g === 'critica') return 'critical';
    if (g === 'media' || g === 'normal') return 'warning';
    if (g === 'baja' || g === 'baja_prioridad') return 'ok';
    return 'neutral';
  }

  severidadResultadoInteraccion(resultado?: string | null): string {
    const r = (resultado ?? '').toLowerCase();
    if (['contactado_exitosamente', 'aceptacion', 'aceptada', 'aceptado', 'cerrado_aceptacion', 'confirmado', 'exitoso', 'exitosa', 'completado'].includes(r)) return 'ok';
    if (['sin_respuesta', 'no_contactado', 'no_disponible', 'pendiente', 'buzon', 'reagendado'].includes(r)) return 'warning';
    if (['rechazo', 'rechazada', 'rechazado', 'cerrado_rechazo', 'cancelado', 'perdido', 'error'].includes(r)) return 'critical';
    return 'neutral';
  }

  severidadValidacionOc(resultadoIa?: string | null, validacion?: string | null): string {
    const r = (resultadoIa ?? '').toLowerCase();
    const v = (validacion ?? '').toLowerCase();
    if (r === 'ok' || v === 'ok') return 'ok';
    if (r === 'critico' || v.includes('crítica') || v.includes('critica')) return 'critical';
    if (r === 'advertencia' || v.includes('parcial') || v.includes('observa')) return 'warning';
    if (v === 'pendiente') return 'neutral';
    return 'neutral';
  }

  severidadEstadoVb(estado?: string | null): string {
    const e = (estado ?? '').toLowerCase();
    if (['aprobado', 'aprobada'].includes(e)) return 'ok';
    if (['rechazado', 'rechazada'].includes(e)) return 'critical';
    if (['devuelto', 'devuelta', 'devuelto_para_cambios', 'pendiente'].includes(e)) return 'warning';
    if (['sin_solicitud'].includes(e)) return 'neutral';
    return 'neutral';
  }

  severidadEstadoPropuesta(estado?: string | null): string {
    const e = (estado ?? '').toLowerCase();
    if (['aceptada', 'aceptado', 'aprobada', 'aprobado', 'ganada'].includes(e)) return 'ok';
    if (['rechazada', 'rechazado', 'perdida', 'anulada', 'anulado', 'revocada'].includes(e)) return 'critical';
    if (['enviada', 'enviado', 'en_revision', 'borrador', 'pendiente', 'por_enviar'].includes(e)) return 'warning';
    return 'neutral';
  }

  severidadEstadoOs(estado?: string | null): string {
    const e = (estado ?? '').toLowerCase();
    if (['ejecutada', 'completada', 'cerrada', 'conformada'].includes(e)) return 'ok';
    if (['anulada', 'cancelada', 'rechazada'].includes(e)) return 'critical';
    if (['programada', 'confirmada', 'en_ruta', 'en_ejecucion', 'en_curso', 'pendiente_conformidad'].includes(e)) return 'warning';
    return 'neutral';
  }

  severidadClass(sev?: string | null): string {
    const s = (sev ?? '').toLowerCase();
    if (s === 'ok' || s === 'coincide') return 'ok';
    if (s === 'advertencia' || s === 'diferencia') return 'warning';
    if (s === 'critico' || s === 'rechazo') return 'critical';
    return 'neutral';
  }

  severidadEstado(estado?: string | null): string {
    if (!estado) return 'neutral';
    const e = estado.toLowerCase();
    if (['aceptado', 'aceptacion', 'aprobado', 'validada', 'completado', 'activo', 'con_propuesta', 'ejecutado', 'cerrado', 'cerradoaceptacion', 'ok', 'verde', 'programada'].includes(e)) return 'ok';
    if (['pendiente', 'pendiente_reemplazo', 'en_revision', 'observada', 'observado', 'en_curso', 'borrador', 'enviada', 'enviado', 'postergado', 'validacion_parcial', 'autogenerada'].includes(e)) return 'warning';
    if (['anulada', 'anulado', 'rechazado', 'rechazo', 'revocada', 'revocado', 'cerradorechazo', 'bloqueado', 'critico', 'vencido'].includes(e)) return 'critical';
    return 'neutral';
  }

  // ── Formatos ───────────────────────────────────────────────────────────────

  iniciales(nombre: string | null | undefined): string {
    if (!nombre) return '?';
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }

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

  titleCase(txt?: string | null): string {
    if (!txt) return '—';
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

  // ── Iconos y colores ──────────────────────────────────────────────────────

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

  colorEventoTimeline(tipo?: string | null, titulo?: string | null): string {
    const t = ((tipo ?? '') + ' ' + (titulo ?? '')).toLowerCase();
    if (t.includes('aprob') || t.includes('aceptad') || t.includes('convertid') || (t.includes('valid') && !t.includes('invalid'))) return 'verde';
    if (t.includes('rechaz') || t.includes('anulad') || t.includes('error') || t.includes('critic')) return 'rojo';
    if (t.includes('revoc') || t.includes('solicit') || t.includes('observ') || t.includes('reemplaz') || t.includes('autogener')) return 'ambar';
    return 'azul';
  }

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

  colorInteraccion(tipo?: string | null, resultado?: string | null): string {
    const r = (resultado ?? '').toLowerCase();
    if (r.includes('acept')) return 'verde';
    if (r.includes('rechaz')) return 'rojo';
    const t = (tipo ?? '').toLowerCase();
    if (t.includes('llamada'))  return 'ambar';
    if (t.includes('visita') || t.includes('reunion')) return 'morado';
    return 'azul';
  }

  iconoCanal(canal?: string | null): string {
    const c = (canal ?? '').toLowerCase();
    if (c.includes('correo') || c.includes('mail')) return 'mail';
    if (c.includes('telef') || c.includes('llamad')) return 'call';
    if (c.includes('whats')) return 'chat';
    if (c.includes('visita') || c.includes('presencial')) return 'location_on';
    return 'send';
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

  iconoDecision(estado?: string | null): string {
    const t = (estado ?? '').toLowerCase();
    if (t.includes('aprob'))  return 'check';
    if (t.includes('rechaz')) return 'close';
    if (t.includes('devuel') || t.includes('observ')) return 'undo';
    return 'help';
  }

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

  // ── Entidades y chips de etapa ────────────────────────────────────────────

  esCodigoEntidad(valor?: string | null): boolean {
    if (!valor) return false;
    return /-/.test(valor) && /\d/.test(valor) && !/^[a-z_]+$/.test(valor);
  }

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

  tipoCortoEntidad(tipo?: string | null): string {
    const t = (tipo || '').toLowerCase();
    if (t === 'requerimiento' || t === 'rq') return 'RQ';
    if (t === 'propuesta') return 'PROP';
    if (t === 'orden_compra' || t === 'oc') return 'OC';
    if (t === 'orden_servicio' || t === 'os') return 'OS';
    if (t === 'orden_metrologia' || t === 'om') return 'OM';
    return (tipo ?? '—').toUpperCase().replace(/_/g, ' ');
  }

  cssTipoEntidad(tipo?: string | null): string {
    const t = (tipo || '').toLowerCase();
    if (t === 'requerimiento' || t === 'rq') return 'rq';
    if (t === 'propuesta') return 'propuesta';
    if (t === 'orden_compra' || t === 'oc') return 'oc';
    if (t === 'orden_servicio' || t === 'os') return 'os';
    if (t === 'orden_metrologia' || t === 'om') return 'om';
    return 'neutro';
  }

  // ── Humanización de estados y roles ───────────────────────────────────────

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

  nombreRol(rol?: string | null): string {
    const r = (rol ?? '').toLowerCase();
    if (r === 'comercial')   return 'COMERCIAL';
    if (r === 'operaciones') return 'OPERACIONES';
    if (r === 'ssoma')       return 'SSOMA';
    if (r === 'tecnico')     return 'TÉCNICO';
    return (rol ?? '').toUpperCase();
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

  // ── Propuestas / versiones ────────────────────────────────────────────────

  propuestasDistintas(versiones: VersionPropuestaExpedienteDto[]): string[] {
    return [...new Set(versiones.map(v => v.numero))];
  }

  primeraVersionDePropuesta(numero: string, versiones: VersionPropuestaExpedienteDto[]): number {
    const match = versiones.find(v => v.numero === numero);
    return match?.idPropuesta ?? 0;
  }

  // ── Otros ─────────────────────────────────────────────────────────────────

  diasHace(fecha?: string | null): string {
    if (!fecha) return '';
    const dias = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24)));
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'hace 1 día';
    return `hace ${dias} días`;
  }

  tamanoLegible(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  estadoOcClass(estado?: string | null): string {
    const t = (estado ?? '').toLowerCase();
    if (t.includes('validada')) return 'ok';
    if (t.includes('observada') || t.includes('parcial')) return 'warning';
    if (t.includes('anulada') || t.includes('rechaz')) return 'critical';
    if (t.includes('autogenerada') || t.includes('pendiente')) return 'neutral';
    return 'neutral';
  }

  resultadoClass(resultado?: string | null): string {
    const r = (resultado ?? '').toLowerCase();
    if (r.includes('acept')) return 'ok';
    if (r.includes('rechaz')) return 'critical';
    if (r.includes('posterg')) return 'warning';
    return 'neutral';
  }

  estadoDecisionClass(estado?: string | null): string {
    const t = (estado ?? '').toLowerCase();
    if (t.includes('aprob'))  return 'ok';
    if (t.includes('rechaz')) return 'critical';
    if (t.includes('devuel') || t.includes('observ')) return 'warning';
    return 'neutral';
  }

  // ── Configuración del servicio (wizard de propuestas) ─────────────────────

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
}
