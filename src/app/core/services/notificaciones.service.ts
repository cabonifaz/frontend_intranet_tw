import { Injectable, signal } from '@angular/core';
import {
  BandejaNotificaciones, FiltrosBandejaNotif, GrupoNotificaciones,
  LinkDestinoNotif, NotificacionBandeja,
} from '../models/notificaciones.model';

/**
 * HU-90 — Centro de Notificaciones (Módulo 16).
 *
 * MODO ACTUAL: mock local — el back aún no tiene los endpoints de bandeja/leer/archivar.
 * Contrato pedido en `mensaje-back-modulo-16-notificaciones.md`. Al estar listo, cablar
 * los métodos `obtenerBandeja / marcarLeida / marcarVariasLeidas / archivar / desarchivar`
 * contra el HTTP real y conectar el hub SignalR `/hubs/notificaciones`.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  // State compartido — el topbar y la bandeja leen el mismo signal para mantener el badge
  // y la lista en sync cuando el usuario lee o archiva algo (en la bandeja → afecta el bell).
  readonly estado = signal<BandejaNotificaciones>({ total: 0, noLeidas: 0, items: [] });

  constructor() { this.cargarMock(); }

  // ─── Lectura ───────────────────────────────────────────────────────────

  async obtenerBandeja(filtros: FiltrosBandejaNotif = {}): Promise<BandejaNotificaciones> {
    await this.delay(150);
    const items = this.aplicarFiltros(this.estado().items, filtros);
    const noLeidas = this.estado().items.filter(n => !n.leida && !n.archivada).length;
    return { total: items.length, noLeidas, items };
  }

  /**
   * Devuelve las 5 notificaciones más recientes no archivadas (leídas o no).
   * El popover funciona como un "feed": una leída sigue visible hasta que llega
   * otra más nueva que la desplaza.
   */
  async obtenerPopover(): Promise<NotificacionBandeja[]> {
    await this.delay(80);
    return this.estado().items
      .filter(n => !n.archivada)
      .slice()
      .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
      .slice(0, 5);
  }

  async marcarLeida(id: number): Promise<number> {
    await this.delay(80);
    this.actualizarItems(items => items.map(n => n.idNotificacion === id ? { ...n, leida: true } : n));
    return this.contarNoLeidas();
  }

  async marcarVariasLeidas(ids: number[]): Promise<number> {
    await this.delay(80);
    const setIds = new Set(ids);
    this.actualizarItems(items => items.map(n => setIds.has(n.idNotificacion) ? { ...n, leida: true } : n));
    return this.contarNoLeidas();
  }

  async marcarTodasLeidas(): Promise<number> {
    await this.delay(100);
    this.actualizarItems(items => items.map(n => n.archivada ? n : { ...n, leida: true }));
    return 0;
  }

  async archivar(id: number): Promise<number> {
    await this.delay(80);
    this.actualizarItems(items => items.map(n => n.idNotificacion === id ? { ...n, archivada: true, leida: true } : n));
    return this.contarNoLeidas();
  }

  async desarchivar(id: number): Promise<number> {
    await this.delay(80);
    this.actualizarItems(items => items.map(n => n.idNotificacion === id ? { ...n, archivada: false } : n));
    return this.contarNoLeidas();
  }

  // ─── Agrupación visual Hoy / Ayer / Esta semana / Más antiguas ──────────

  agrupar(items: NotificacionBandeja[]): GrupoNotificaciones[] {
    const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const haceSemana = new Date(hoy); haceSemana.setDate(haceSemana.getDate() - 7);

    const g: Record<GrupoNotificaciones['clave'], NotificacionBandeja[]> = {
      hoy: [], ayer: [], esta_semana: [], mas_antiguas: [],
    };
    for (const n of items) {
      const f = new Date(n.creadoEn);
      if (f >= hoy)            g.hoy.push(n);
      else if (f >= ayer)      g.ayer.push(n);
      else if (f >= haceSemana) g.esta_semana.push(n);
      else                     g.mas_antiguas.push(n);
    }
    const r: GrupoNotificaciones[] = [];
    if (g.hoy.length)          r.push({ clave: 'hoy',          label: 'Hoy',           items: g.hoy });
    if (g.ayer.length)         r.push({ clave: 'ayer',         label: 'Ayer',          items: g.ayer });
    if (g.esta_semana.length)  r.push({ clave: 'esta_semana',  label: 'Esta semana',   items: g.esta_semana });
    if (g.mas_antiguas.length) r.push({ clave: 'mas_antiguas', label: 'Más antiguas',  items: g.mas_antiguas });
    return r;
  }

  /** Mapea una notif a la ruta destino para el botón "Ir al elemento origen". */
  resolverDestino(n: NotificacionBandeja): LinkDestinoNotif | null {
    if (!n.entidadTipo || n.entidadId == null) return null;
    const base: LinkDestinoNotif = {
      entidadTipo: n.entidadTipo, entidadId: n.entidadId,
      rutaDestino: [], queryParams: {},
    };
    switch (n.entidadTipo) {
      case 'os':             return { ...base, rutaDestino: ['/operaciones/ordenes-servicio'],      queryParams: { idOs: n.entidadId } };
      case 'propuesta':      return { ...base, rutaDestino: ['/crm/propuestas'],                    queryParams: { idPropuesta: n.entidadId } };
      case 'oc':             return { ...base, rutaDestino: ['/crm/ordenes-compra'],                queryParams: { idOc: n.entidadId } };
      case 'precotizacion':  return { ...base, rutaDestino: ['/crm/propuestas'],                    queryParams: { tab: 'precotizaciones', idPrecot: n.entidadId } };
      case 'informe':        return { ...base, rutaDestino: ['/servicio-tecnico/revision-informes'], queryParams: { idInforme: n.entidadId } };
      case 'expediente':     return { ...base, rutaDestino: ['/crm/expedientes-digitales'],         queryParams: { idExp: n.entidadId } };
      case 'seguimiento':    return { ...base, rutaDestino: ['/operaciones/seguimiento-operativo'], queryParams: { idServicio: n.entidadId } };
      default:               return null;
    }
  }

  // ─── Helpers privados ──────────────────────────────────────────────────

  private contarNoLeidas(): number {
    return this.estado().items.filter(n => !n.leida && !n.archivada).length;
  }

  /**
   * Centraliza el update del signal: aplica la mutación sobre items y mantiene el
   * campo `noLeidas` del estado en sync — el topbar lo observa vía computed.
   */
  private actualizarItems(mut: (items: NotificacionBandeja[]) => NotificacionBandeja[]): void {
    this.estado.update(s => {
      const items = mut(s.items);
      const noLeidas = items.filter(n => !n.leida && !n.archivada).length;
      return { ...s, items, noLeidas };
    });
  }

  private aplicarFiltros(items: NotificacionBandeja[], f: FiltrosBandejaNotif): NotificacionBandeja[] {
    let r = items;
    const estado = f.estado ?? 'no_leidas';
    if (estado === 'no_leidas')  r = r.filter(n => !n.leida && !n.archivada);
    if (estado === 'leidas')     r = r.filter(n => n.leida && !n.archivada);
    if (estado === 'archivadas') r = r.filter(n => n.archivada);
    if (estado === 'todas')      r = r.filter(n => !n.archivada);  // "todas" excluye archivadas por defecto
    if (f.modulo?.length) r = r.filter(n => f.modulo!.includes(n.moduloCodigo));
    if (f.tipo?.length)   r = r.filter(n => f.tipo!.includes(n.tipo));
    if (f.idRemitente != null) r = r.filter(n => n.idRemitente === f.idRemitente || (f.idRemitente === 0 && n.idRemitente === null));
    if (f.busqueda) {
      const q = f.busqueda.toLowerCase();
      r = r.filter(n =>
        n.titulo.toLowerCase().includes(q) ||
        n.cuerpo.toLowerCase().includes(q) ||
        (n.entidadCodigo?.toLowerCase().includes(q) ?? false),
      );
    }
    if (f.fechaDesde) r = r.filter(n => new Date(n.creadoEn) >= new Date(f.fechaDesde!));
    if (f.fechaHasta) r = r.filter(n => new Date(n.creadoEn) <= new Date(f.fechaHasta! + 'T23:59:59'));
    if (f.rango === 'hoy') {
      const h = new Date(); h.setHours(0, 0, 0, 0);
      r = r.filter(n => new Date(n.creadoEn) >= h);
    } else if (f.rango === 'esta_semana') {
      const s = new Date(); s.setDate(s.getDate() - 7);
      r = r.filter(n => new Date(n.creadoEn) >= s);
    } else if (f.rango === 'este_mes') {
      const m = new Date(); m.setDate(m.getDate() - 30);
      r = r.filter(n => new Date(n.creadoEn) >= m);
    }
    return r.slice().sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── MOCK DATA ─────────────────────────────────────────────────────────

  private cargarMock(): void {
    const now  = new Date();
    const hace = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();

    const items: NotificacionBandeja[] = [
      {
        idNotificacion: 1, tipo: 'cambio_estado', tipoLabel: 'Cambio de estado',
        moduloCodigo: 'expedientes', moduloLabel: 'Expedientes Digitales',
        titulo: 'OS-000793 esperando emisión',
        cuerpo: 'La OS está lista para emitirse al cliente — módulo Expedientes Digitales. Requiere validación de firma y fecha técnica.',
        tipoDot: '#1D4ED8', tiempo: 'Hace 15m', creadoEn: hace(15),
        leida: false, archivada: false, esAlertaOperativa: false,
        idRemitente: null, remitente: 'Sistema TotalWeight',
        entidadTipo: 'os', entidadId: 793, entidadCodigo: 'OS-000793',
      },
      {
        idNotificacion: 2, tipo: 'cambio_estado', tipoLabel: 'Nueva precotización',
        moduloCodigo: 'propuestas', moduloLabel: 'Propuestas',
        titulo: 'Nueva precotización técnica recibida',
        cuerpo: 'Carlos Vega generó precotización en RQ-000479 (Las Bambas Mining) con 3 ítems y nota del supervisor.',
        tipoDot: '#166534', tiempo: 'Hace 1h', creadoEn: hace(60),
        leida: false, archivada: false, esAlertaOperativa: false,
        idRemitente: 12, remitente: 'Carlos Vega',
        entidadTipo: 'precotizacion', entidadId: 2, entidadCodigo: 'PCT-000002',
      },
      {
        idNotificacion: 3, tipo: 'alerta_operativa', tipoLabel: 'Alerta operativa',
        moduloCodigo: 'control_campo', moduloLabel: 'Control de Campo',
        titulo: 'Técnico Luis Herrera · sin movimiento',
        cuerpo: 'Sin movimiento en los últimos 12 min — Mina Chalcobamba. Verificar cobertura satelital o reporte de campo.',
        tipoDot: '#B91C1C', tiempo: 'Hace 2h', creadoEn: hace(135),
        leida: false, archivada: false, esAlertaOperativa: true,
        idRemitente: null, remitente: 'Sistema TotalWeight',
        entidadTipo: 'seguimiento', entidadId: 48, entidadCodigo: 'OS-000748',
      },
      {
        idNotificacion: 4, tipo: 'aprobacion_pendiente', tipoLabel: 'Aprobación pendiente',
        moduloCodigo: 'propuestas', moduloLabel: 'Propuestas',
        titulo: 'Propuesta aceptada por Cerámica Lima',
        cuerpo: 'PROP-000312 aceptada por USD 1,450. Requiere generación de orden de compra en Expediente CL-2026-012.',
        tipoDot: '#166534', tiempo: 'Hace 3h', creadoEn: hace(180),
        leida: false, archivada: false, esAlertaOperativa: false,
        idRemitente: null, remitente: 'Sistema TotalWeight',
        entidadTipo: 'propuesta', entidadId: 312, entidadCodigo: 'PROP-000312',
      },
      {
        idNotificacion: 5, tipo: 'cambio_estado', tipoLabel: 'Reasignación',
        moduloCodigo: 'expedientes', moduloLabel: 'Expedientes Digitales',
        titulo: 'Expediente EXP-2026-05 reasignado a ti',
        cuerpo: 'Luis Yamada aprobó la reasignación comercial por solicitud de Ana Torres.',
        tipoDot: '#1D4ED8', tiempo: 'Ayer 16:40', creadoEn: hace(24 * 60 + 60),
        leida: false, archivada: false, esAlertaOperativa: false,
        idRemitente: 5, remitente: 'Luis Yamada',
        entidadTipo: 'expediente', entidadId: 205, entidadCodigo: 'EXP-2026-05',
      },
      {
        idNotificacion: 6, tipo: 'aprobacion_pendiente', tipoLabel: 'Propuesta aceptada',
        moduloCodigo: 'propuestas', moduloLabel: 'Propuestas',
        titulo: 'Propuesta PROP-000198 aceptada',
        cuerpo: 'Antamina aceptó por USD 14,580 — pasa a emisión de Orden de Compra.',
        tipoDot: '#166534', tiempo: 'Ayer 11:20', creadoEn: hace(24 * 60 + 180),
        leida: true, archivada: false, esAlertaOperativa: false,
        idRemitente: null, remitente: 'Sistema TotalWeight',
        entidadTipo: 'propuesta', entidadId: 198, entidadCodigo: 'PROP-000198',
      },
      {
        idNotificacion: 7, tipo: 'ssoma', tipoLabel: 'SSOMA',
        moduloCodigo: 'ssoma', moduloLabel: 'SSOMA',
        titulo: 'Documento SSOMA SCTR por vencer',
        cuerpo: 'Tu SCTR vence en 7 días — Técnico Luis Herrera no podrá ingresar a mina si no se renueva.',
        tipoDot: '#92400E', tiempo: 'Ayer 09:10', creadoEn: hace(24 * 60 + 360),
        leida: false, archivada: false, esAlertaOperativa: false,
        idRemitente: null, remitente: 'Sistema TotalWeight',
        entidadTipo: null, entidadId: null, entidadCodigo: null,
      },
      {
        idNotificacion: 8, tipo: 'cambio_estado', tipoLabel: 'Visto Bueno',
        moduloCodigo: 'vb', moduloLabel: 'Visto Bueno',
        titulo: 'Propuesta PROP-000176 requiere tu VB',
        cuerpo: 'Jazir Olivera envió la propuesta a Visto Bueno. Prioridad normal.',
        tipoDot: '#1D4ED8', tiempo: 'Hace 4d', creadoEn: hace(4 * 24 * 60),
        leida: true, archivada: false, esAlertaOperativa: false,
        idRemitente: 1, remitente: 'Jazir Olivera',
        entidadTipo: 'propuesta', entidadId: 176, entidadCodigo: 'PROP-000176',
      },
      {
        idNotificacion: 9, tipo: 'cambio_estado', tipoLabel: 'Revisión',
        moduloCodigo: 'revision_tecnica', moduloLabel: 'Revisión Técnica',
        titulo: 'Informe INF-DEMO-003 revisado',
        cuerpo: 'Manuel Rojas marcó el informe como revisado con precotización generada.',
        tipoDot: '#166534', tiempo: 'Hace 5d', creadoEn: hace(5 * 24 * 60),
        leida: true, archivada: false, esAlertaOperativa: false,
        idRemitente: 8, remitente: 'Manuel Rojas',
        entidadTipo: 'informe', entidadId: 3, entidadCodigo: 'INF-DEMO-003',
      },
    ];

    const noLeidas = items.filter(n => !n.leida && !n.archivada).length;
    this.estado.set({ total: items.length, noLeidas, items });
  }
}
