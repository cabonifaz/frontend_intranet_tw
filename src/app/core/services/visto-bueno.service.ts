import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  AprobadorOpcion,
  AprobarVbRequest,
  ComercialOpcion,
  CompararVersionesData,
  FiltrosVb,
  KpisVb,
  ReasignarAprobadorRequest,
  RechazarVbRequest,
  SolicitarCorreccionRequest,
  ValidacionesPrevias,
  VbListaItem,
  VbPaginado,
  VersionCompleta,
} from '../models/visto-bueno.model';

/**
 * Servicio de Visto Bueno (HU-13 a HU-16).
 * FLAG MOCK: hoy en true porque los endpoints del back están pendientes de Bryan.
 * Cuando el back esté listo, cambiar a `environment.usarMocks` o `false` directo.
 */
const USAR_MOCK = true;

@Injectable({ providedIn: 'root' })
export class VistoBuenoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm/visto-bueno`;

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-13 — Bandeja
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerBandeja(filtros: FiltrosVb = {}): Promise<VbPaginado> {
    if (USAR_MOCK) return this.mockBandeja(filtros);

    const params: Record<string, string> = {
      pagina:    (filtros.pagina ?? 1).toString(),
      porPagina: (filtros.porPagina ?? 20).toString(),
    };
    if (filtros.idComercial)        params['idComercial'] = filtros.idComercial.toString();
    if (filtros.estado  && filtros.estado  !== 'todos') params['estado']  = filtros.estado;
    if (filtros.moneda  && filtros.moneda  !== 'todas') params['moneda']  = filtros.moneda;
    if (filtros.dias)               params['dias']        = filtros.dias.toString();

    const r = await firstValueFrom(this.http.get<RespuestaApi<VbPaginado>>(this.base, { params }));
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerKpis(): Promise<KpisVb> {
    if (USAR_MOCK) return this.mockKpis();
    const r = await firstValueFrom(this.http.get<RespuestaApi<KpisVb>>(`${this.base}/kpis`));
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerComerciales(): Promise<ComercialOpcion[]> {
    if (USAR_MOCK) return this.mockComerciales();
    const r = await firstValueFrom(this.http.get<RespuestaApi<ComercialOpcion[]>>(`${this.base}/comerciales`));
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-14 — Comparar Versiones + Validaciones Previas
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerCompararVersiones(idPropuesta: number, idBase?: number, idDestino?: number): Promise<CompararVersionesData> {
    if (USAR_MOCK) return this.mockCompararVersiones(idPropuesta, idBase, idDestino);
    const params: Record<string, string> = {};
    if (idBase)    params['base']    = idBase.toString();
    if (idDestino) params['destino'] = idDestino.toString();
    const r = await firstValueFrom(this.http.get<RespuestaApi<CompararVersionesData>>(`${this.base}/propuestas/${idPropuesta}/comparar`, { params }));
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerValidacionesPrevias(idPropuesta: number): Promise<ValidacionesPrevias> {
    if (USAR_MOCK) return this.mockValidacionesPrevias();
    const r = await firstValueFrom(this.http.get<RespuestaApi<ValidacionesPrevias>>(`${this.base}/propuestas/${idPropuesta}/validaciones-previas`));
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-15 — Decisiones (Aprobar / Rechazar / Solicitar Corrección)
  // ═══════════════════════════════════════════════════════════════════════════
  async aprobar(dto: AprobarVbRequest): Promise<void> {
    if (USAR_MOCK) return this.mockAccion('Aprobar');
    const r = await firstValueFrom(this.http.post<RespuestaApi<unknown>>(`${this.base}/${dto.idVb}/aprobar`, dto));
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  async rechazar(dto: RechazarVbRequest): Promise<void> {
    if (USAR_MOCK) return this.mockAccion('Rechazar');
    const r = await firstValueFrom(this.http.post<RespuestaApi<unknown>>(`${this.base}/${dto.idVb}/rechazar`, dto));
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  async solicitarCorreccion(dto: SolicitarCorreccionRequest): Promise<void> {
    if (USAR_MOCK) return this.mockAccion('Solicitar Corrección');
    const r = await firstValueFrom(this.http.post<RespuestaApi<unknown>>(`${this.base}/${dto.idVb}/solicitar-correccion`, dto));
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HU-16 — Reasignar Aprobador
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerAprobadoresDisponibles(idPropuesta: number, busqueda?: string): Promise<AprobadorOpcion[]> {
    if (USAR_MOCK) return this.mockAprobadores(busqueda);
    const params: Record<string, string> = {};
    if (busqueda) params['busqueda'] = busqueda;
    const r = await firstValueFrom(this.http.get<RespuestaApi<AprobadorOpcion[]>>(`${this.base}/propuestas/${idPropuesta}/aprobadores-disponibles`, { params }));
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async reasignar(dto: ReasignarAprobadorRequest): Promise<void> {
    if (USAR_MOCK) return this.mockAccion('Reasignar');
    const r = await firstValueFrom(this.http.post<RespuestaApi<unknown>>(`${this.base}/${dto.idVb}/reasignar`, dto));
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCKS — Datos simulados para desarrollo sin back
  // ═══════════════════════════════════════════════════════════════════════════
  private static mockDataBandeja: VbListaItem[] = [
    { idVb: 1, idPropuesta: 2590, codigoPropuesta: 'PROP-002590', version: 1, codigoRq: 'RQ-2024-002', idCliente: 1, razonSocial: 'Aceros Arequipa', ruc: '20100000001', referencia: 'Mantenimiento Planta', monto: 12800, moneda: 'PEN', monedaSimbolo: 'S/',  descuentoPct: 3,  margenPct: 28, idComercial: 101, nombreComercial: 'Carlos Ruiz', idAprobador: 1, nombreAprobador: 'Judith Ramírez', estado: 'pendiente', slaHoras: 4, slaHorasRestantes: 2.5,  slaVencido: false, fechaSolicitud: '2026-10-09T08:00:00Z' },
    { idVb: 2, idPropuesta: 2604, codigoPropuesta: 'PROP-002604', version: 2, codigoRq: 'RQ-2024-006', idCliente: 2, razonSocial: 'Minera Antamina', ruc: '20100000002', referencia: 'Suministro Celdas',   monto: 28450, moneda: 'PEN', monedaSimbolo: 'S/',  descuentoPct: 10, margenPct: 18, idComercial: 102, nombreComercial: 'Ana Torres',  idAprobador: 1, nombreAprobador: 'Judith Ramírez', estado: 'pendiente', slaHoras: 4, slaHorasRestantes: 1.0,  slaVencido: false, fechaSolicitud: '2026-10-09T09:00:00Z' },
    { idVb: 3, idPropuesta: 2612, codigoPropuesta: 'PROP-002612', version: 1, codigoRq: 'RQ-2024-010', idCliente: 3, razonSocial: 'Southern Copper', ruc: '20100000003', referencia: 'Calibración Balanzas', monto: 18500, moneda: 'USD', monedaSimbolo: 'US$', descuentoPct: 18, margenPct: 12, idComercial: 101, nombreComercial: 'Carlos Ruiz', idAprobador: 1, nombreAprobador: 'Judith Ramírez', estado: 'pendiente', slaHoras: 4, slaHorasRestantes: -0.5, slaVencido: true,  fechaSolicitud: '2026-10-09T06:00:00Z' },
  ];

  private async mockBandeja(f: FiltrosVb): Promise<VbPaginado> {
    await this.delay(200);
    let items = [...VistoBuenoService.mockDataBandeja];
    if (f.idComercial)        items = items.filter(i => i.idComercial === f.idComercial);
    if (f.estado && f.estado !== 'todos') items = items.filter(i => i.estado === f.estado);
    if (f.moneda && f.moneda !== 'todas') items = items.filter(i => i.moneda === f.moneda);

    const porPagina = f.porPagina ?? 20;
    const pagina    = f.pagina    ?? 1;
    const inicio    = (pagina - 1) * porPagina;
    return { items: items.slice(inicio, inicio + porPagina), total: items.length, pagina, porPagina };
  }

  private async mockKpis(): Promise<KpisVb> {
    await this.delay(150);
    return { pendientes: 8, proximosVencer: 3, vencidos: 2, aprobadasHoy: 12, devueltas: 2 };
  }

  private async mockComerciales(): Promise<ComercialOpcion[]> {
    await this.delay(100);
    return [
      { idUsuario: 101, nombreCompleto: 'Carlos Ruiz' },
      { idUsuario: 102, nombreCompleto: 'Ana Torres' },
      { idUsuario: 103, nombreCompleto: 'Jazir Olivera' },
    ];
  }

  private async mockCompararVersiones(idPropuesta: number, idBase?: number, idDestino?: number): Promise<CompararVersionesData> {
    await this.delay(300);
    const v2: VersionCompleta = {
      idPropuesta, version: 2, estado: 'rechazado', fechaEmision: '2024-10-15T00:00:00Z',
      subtotal: 15084.75, igvPct: 18, igvMonto: 2715.25, descuentoMonto: 0, total: 17800.00, monedaSimbolo: 'S/',
      items: [
        { descripcion: 'Mantenimiento Preventivo Balanza 1', cantidad: 1, precioUnitario: 5000, subtotal: 5000 },
        { descripcion: 'Mantenimiento Preventivo Balanza 2', cantidad: 1, precioUnitario: 5000, subtotal: 5000 },
        { descripcion: 'Calibración Celdas 10t',             cantidad: 2, precioUnitario: 2042.37, subtotal: 4084.75 },
        { descripcion: 'Informe Técnico INACAL',             cantidad: 1, precioUnitario: 1000, subtotal: 1000 },
      ],
      condiciones: [
        { tipo: 'Forma de Pago',   valor: 'Contado' },
        { tipo: 'Validez Oferta',  valor: '15 Días calendarios' },
      ],
      equipos: [], textos: [],
    };
    const v3: VersionCompleta = {
      idPropuesta, version: 3, estado: 'borrador', fechaEmision: '2024-10-18T00:00:00Z',
      subtotal: 15635.60, igvPct: 18, igvMonto: 2814.40, descuentoMonto: 0, total: 18450.00, monedaSimbolo: 'S/',
      items: [
        { descripcion: 'Mantenimiento Preventivo Balanza 1', cantidad: 1, precioUnitario: 5000, subtotal: 5000 },
        { descripcion: 'Mantenimiento Preventivo Balanza 2', cantidad: 1, precioUnitario: 5000, subtotal: 5000 },
        { descripcion: 'Calibración Celdas 10t',             cantidad: 2, precioUnitario: 2317.80, subtotal: 4635.60 },
        { descripcion: 'Informe Técnico INACAL',             cantidad: 1, precioUnitario: 1000, subtotal: 1000 },
        { descripcion: 'Visita Técnica Adicional',           cantidad: 1, precioUnitario: 0,    subtotal: 0 },
      ],
      condiciones: [
        { tipo: 'Forma de Pago',   valor: 'Crédito 30 días' },
        { tipo: 'Validez Oferta',  valor: '15 Días calendarios' },
      ],
      equipos: [], textos: [],
    };
    const base    = idBase === 3 ? v3 : v2;
    const destino = idDestino === 2 ? v2 : v3;
    return {
      idPropuesta, codigoPropuesta: 'PROP-002581', referencia: 'Mantenimiento Preventivo de Balanzas Camioneras - Corporativo Gloria',
      versiones: [
        { idPropuesta, version: 2, estado: 'rechazado', fechaEmision: v2.fechaEmision, esActual: false },
        { idPropuesta, version: 3, estado: 'borrador',  fechaEmision: v3.fechaEmision, esActual: true  },
      ],
      base, destino,
      diferencia: {
        diferenciaTotal:    destino.total - base.total,
        diferenciaPct:      Math.round(((destino.total - base.total) / base.total) * 1000) / 10,
        itemsAgregados:     destino.items.length > base.items.length ? destino.items.length - base.items.length : 0,
        itemsModificados:   1,
        itemsEliminados:    0,
        cambiosItems:       `${destino.items.length} vs ${base.items.length}`,
        riesgoFinanciero:   'MODERADO',
      },
    };
  }

  private async mockValidacionesPrevias(): Promise<ValidacionesPrevias> {
    await this.delay(150);
    return {
      limiteCredito: { estado: 'ok',      mensaje: 'Cliente dentro del límite de crédito aprobado.' },
      margen:        { estado: 'warning', mensaje: 'Margen de utilidad cercano al mínimo (12%). Revisar antes de aprobar.' },
      stock:         { estado: 'ok',      mensaje: 'Suministros disponibles en stock.' },
    };
  }

  private async mockAprobadores(busqueda?: string): Promise<AprobadorOpcion[]> {
    await this.delay(150);
    const todos: AprobadorOpcion[] = [
      { idUsuario: 1,  nombreCompleto: 'Judith Ramírez', cargo: 'Gerente Comercial', area: 'comercial',  areaLabel: 'Comercial',  rolSistema: 'administrador', nivel: 1 },
      { idUsuario: 5,  nombreCompleto: 'Marta López',    cargo: 'Jefe Comercial Sur', area: 'comercial', areaLabel: 'Comercial',  rolSistema: 'supervisor',    nivel: 2 },
      { idUsuario: 12, nombreCompleto: 'Luis Vargas',    cargo: 'Jefe de Metrología', area: 'metrologia', areaLabel: 'Metrología', rolSistema: 'supervisor',   nivel: 2 },
    ];
    if (!busqueda) return todos;
    const b = busqueda.toLowerCase();
    return todos.filter(a => a.nombreCompleto.toLowerCase().includes(b) || a.cargo.toLowerCase().includes(b));
  }

  private async mockAccion(nombre: string): Promise<void> {
    await this.delay(400);
    console.log(`[MOCK VB] ${nombre} ejecutado correctamente.`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
