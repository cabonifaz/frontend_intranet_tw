import { Injectable } from '@angular/core';
import {
  EstadoPropuesta,
  FiltrosPropuestas,
  KpisPropuestas,
  PropuestaListaItem,
  PropuestasPaginado,
  TipoPropuesta,
} from '../models/propuestas.model';

const USAR_MOCK = true;

@Injectable({ providedIn: 'root' })
export class PropuestasService {
  // Nota: back aún no existe para HU-07/HU-08. Toda la lógica es mock-first
  //       con persistencia en memoria del service (lifetime = sesión).
  //       Cuando Bryan entregue endpoints, se reemplazan los metodos privados.

  // ─── Lista paginada + KPIs ──────────────────────────────────────────────────
  async obtenerPropuestas(filtros: FiltrosPropuestas): Promise<PropuestasPaginado> {
    if (USAR_MOCK) return this.mockObtener(filtros);
    throw new Error('Backend de propuestas aún no disponible.');
  }

  // ─── Mock internals ─────────────────────────────────────────────────────────

  private async mockObtener(f: FiltrosPropuestas): Promise<PropuestasPaginado> {
    await this.simularLatencia();

    let items = [...PropuestasService.mockData];

    if (f.estado && f.estado !== 'todas') {
      items = items.filter(i => i.estado === f.estado);
    }
    if (f.anio) {
      items = items.filter(i => new Date(i.fechaCreacion).getFullYear() === f.anio);
    }
    if (f.comercial && f.comercial !== 'todos') {
      items = items.filter(i => i.comercial === f.comercial);
    }
    if (f.tipo && f.tipo !== 'cualquiera') {
      items = items.filter(i => i.tipo === f.tipo);
    }
    if (f.busqueda) {
      const q = f.busqueda.toLowerCase().trim();
      items = items.filter(i =>
        i.codigo.toLowerCase().includes(q) ||
        (i.codigoRequerimiento ?? '').toLowerCase().includes(q) ||
        i.razonSocial.toLowerCase().includes(q) ||
        i.ruc.includes(q) ||
        i.referencia.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const start = (f.pagina - 1) * f.porPagina;
    const paginados = items.slice(start, start + f.porPagina);

    return {
      kpis: PropuestasService.mockKpis(),
      items: paginados,
      total,
      pagina: f.pagina,
      porPagina: f.porPagina,
    };
  }

  async obtenerComerciales(): Promise<string[]> {
    await this.simularLatencia(50);
    return Array.from(new Set(PropuestasService.mockData.map(p => p.comercial))).sort();
  }

  private simularLatencia(ms = 180): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── KPIs calculados de los mocks ───────────────────────────────────────────
  private static mockKpis(): KpisPropuestas {
    const porEstado = (e: EstadoPropuesta) => this.mockData.filter(p => p.estado === e).length;
    const vencidos  = this.mockData.filter(p => p.slaDiasRestantes < 0).length;
    return {
      pendientes:          porEstado('pendiente'),
      variacionPendientes: 12,
      porVistoBueno:       porEstado('por_vb'),
      porEnviar:           porEstado('por_enviar'),
      enSeguimiento:       porEstado('en_seguimiento'),
      slaVencidos:         vencidos,
    };
  }

  // ─── Dataset mock reutilizado por HU-07 ────────────────────────────────────
  static readonly mockData: PropuestaListaItem[] = PropuestasService.generarMocks();

  private static generarMocks(): PropuestaListaItem[] {
    const base: Omit<PropuestaListaItem, 'idPropuesta'>[] = [
      {
        codigo: 'PROP-002581', version: 'v3',
        idRequerimiento: 1, codigoRequerimiento: 'RQ-2024-001',
        idCliente: 1, razonSocial: 'Minera Antamina', ruc: '20100036352',
        referencia: 'Calibración anual celdas de carga - Planta Concentradora',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'en_seguimiento', estadoLabel: 'En Seguimiento',
        monto: 18450.00, moneda: 'PEN',
        comercial: 'Ana Torres', avatarComercial: 'AT',
        slaDiasRestantes: 5,
        fechaCreacion: '2024-11-02T10:00:00Z',
        fechaUltimaMod: '2024-11-10T15:30:00Z',
      },
      {
        codigo: 'PROP-002590', version: 'v1',
        idRequerimiento: 2, codigoRequerimiento: 'RQ-2024-002',
        idCliente: 2, razonSocial: 'Aceros Arequipa', ruc: '20170040913',
        referencia: 'Mantenimiento planta Pisco - Básculas camioneras',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'pendiente', estadoLabel: 'Pendiente',
        monto: 12800.00, moneda: 'PEN',
        comercial: 'Carlos Ruiz', avatarComercial: 'CR',
        slaDiasRestantes: 3,
        fechaCreacion: '2024-11-05T09:15:00Z',
        fechaUltimaMod: '2024-11-05T09:15:00Z',
      },
      {
        codigo: 'PROP-002603', version: 'v2',
        idRequerimiento: 3, codigoRequerimiento: 'RQ-2024-003',
        idCliente: 3, razonSocial: 'Cales S.A.', ruc: '20298765443',
        referencia: 'Calibración de plataforma industrial - Operaciones Lima',
        tipo: 'mixta', tipoLabel: 'MIXTA',
        estado: 'por_vb', estadoLabel: 'Por VB',
        monto: 4500.00, moneda: 'USD',
        comercial: 'Ana Torres', avatarComercial: 'AT',
        slaDiasRestantes: 1,
        fechaCreacion: '2024-11-07T11:00:00Z',
        fechaUltimaMod: '2024-11-11T16:00:00Z',
      },
      {
        codigo: 'PROP-002611', version: 'v1',
        idRequerimiento: 4, codigoRequerimiento: 'RQ-2024-004',
        idCliente: 4, razonSocial: 'Southern Copper', ruc: '20100124823',
        referencia: 'Fabricación balanza especial para pesaje de concentrado',
        tipo: 'proyecto', tipoLabel: 'PROYECTO',
        estado: 'por_enviar', estadoLabel: 'Por Enviar',
        monto: 68900.00, moneda: 'PEN',
        comercial: 'Carlos Ruiz', avatarComercial: 'CR',
        slaDiasRestantes: -2,
        fechaCreacion: '2024-10-28T08:00:00Z',
        fechaUltimaMod: '2024-11-09T12:00:00Z',
      },
      {
        codigo: 'PROP-002615', version: 'v1',
        idRequerimiento: 5, codigoRequerimiento: 'RQ-2024-005',
        idCliente: 5, razonSocial: 'Volcan Compañía Minera', ruc: '20383045267',
        referencia: 'Suministro de pesas patrón clase M1 - Lab Metrología',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'pendiente', estadoLabel: 'Pendiente',
        monto: 8900.00, moneda: 'USD',
        comercial: 'Lucía Fernández', avatarComercial: 'LF',
        slaDiasRestantes: 7,
        fechaCreacion: '2024-11-08T14:00:00Z',
        fechaUltimaMod: '2024-11-08T14:00:00Z',
      },
      {
        codigo: 'PROP-002618', version: 'v2',
        idRequerimiento: 6, codigoRequerimiento: 'RQ-2024-006',
        idCliente: 6, razonSocial: 'Yanacocha S.A.', ruc: '20137291313',
        referencia: 'Mantenimiento preventivo semestral balanzas de precisión',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'borrador', estadoLabel: 'Borrador',
        monto: 15600.00, moneda: 'PEN',
        comercial: 'Ana Torres', avatarComercial: 'AT',
        slaDiasRestantes: 12,
        fechaCreacion: '2024-11-10T10:30:00Z',
        fechaUltimaMod: '2024-11-10T10:30:00Z',
      },
      {
        codigo: 'PROP-002620', version: 'v1',
        idRequerimiento: null, codigoRequerimiento: null,
        idCliente: 7, razonSocial: 'Hipermercados Tottus', ruc: '20508565934',
        referencia: 'Calibración masiva balanzas comerciales - Lima Norte',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'aceptada', estadoLabel: 'Aceptada',
        monto: 22400.00, moneda: 'PEN',
        comercial: 'Carlos Ruiz', avatarComercial: 'CR',
        slaDiasRestantes: 0,
        fechaCreacion: '2024-10-20T09:00:00Z',
        fechaUltimaMod: '2024-11-04T18:00:00Z',
      },
      {
        codigo: 'PROP-002625', version: 'v3',
        idRequerimiento: 7, codigoRequerimiento: 'RQ-2024-007',
        idCliente: 8, razonSocial: 'Compañía Minera Milpo', ruc: '20383082700',
        referencia: 'Verificación anual INACAL - Lote 12 instrumentos',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'rechazada', estadoLabel: 'Rechazada',
        monto: 9850.00, moneda: 'USD',
        comercial: 'Lucía Fernández', avatarComercial: 'LF',
        slaDiasRestantes: 0,
        fechaCreacion: '2024-10-25T11:00:00Z',
        fechaUltimaMod: '2024-11-02T10:00:00Z',
      },
      {
        codigo: 'PROP-002630', version: 'v1',
        idRequerimiento: 8, codigoRequerimiento: 'RQ-2024-008',
        idCliente: 9, razonSocial: 'Backus & Johnston', ruc: '20100113610',
        referencia: 'Instalación de celdas de carga en línea de envasado',
        tipo: 'proyecto', tipoLabel: 'PROYECTO',
        estado: 'por_consolidar', estadoLabel: 'Por Consolidar',
        monto: 142300.00, moneda: 'PEN',
        comercial: 'Carlos Ruiz', avatarComercial: 'CR',
        slaDiasRestantes: 15,
        fechaCreacion: '2024-11-01T08:30:00Z',
        fechaUltimaMod: '2024-11-11T09:00:00Z',
      },
      {
        codigo: 'PROP-002634', version: 'v1',
        idRequerimiento: 9, codigoRequerimiento: 'RQ-2024-009',
        idCliente: 10, razonSocial: 'Gloria S.A.', ruc: '20100190797',
        referencia: 'Calibración trimestral balanzas analíticas - Planta Huachipa',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'en_seguimiento', estadoLabel: 'En Seguimiento',
        monto: 6750.00, moneda: 'PEN',
        comercial: 'Ana Torres', avatarComercial: 'AT',
        slaDiasRestantes: -1,
        fechaCreacion: '2024-11-03T16:00:00Z',
        fechaUltimaMod: '2024-11-11T14:00:00Z',
      },
      {
        codigo: 'PROP-002640', version: 'v2',
        idRequerimiento: 10, codigoRequerimiento: 'RQ-2024-010',
        idCliente: 11, razonSocial: 'Alicorp', ruc: '20100055237',
        referencia: 'Mantenimiento correctivo tolva de pesaje industrial',
        tipo: 'servicio', tipoLabel: 'SERVICIO',
        estado: 'pendiente', estadoLabel: 'Pendiente',
        monto: 11200.00, moneda: 'PEN',
        comercial: 'Lucía Fernández', avatarComercial: 'LF',
        slaDiasRestantes: 4,
        fechaCreacion: '2024-11-06T13:00:00Z',
        fechaUltimaMod: '2024-11-09T16:00:00Z',
      },
      {
        codigo: 'PROP-002645', version: 'v1',
        idRequerimiento: 11, codigoRequerimiento: 'RQ-2024-011',
        idCliente: 12, razonSocial: 'Minsur', ruc: '20100136741',
        referencia: 'Fabricación de 2 indicadores digitales de alta resolución',
        tipo: 'proyecto', tipoLabel: 'PROYECTO',
        estado: 'borrador', estadoLabel: 'Borrador',
        monto: 32500.00, moneda: 'USD',
        comercial: 'Carlos Ruiz', avatarComercial: 'CR',
        slaDiasRestantes: 20,
        fechaCreacion: '2024-11-11T10:00:00Z',
        fechaUltimaMod: '2024-11-11T10:00:00Z',
      },
    ];
    return base.map((p, i) => ({ idPropuesta: i + 1, ...p }));
  }
}
