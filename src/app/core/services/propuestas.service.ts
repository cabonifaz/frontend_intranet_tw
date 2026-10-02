import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  EstadoPropuesta,
  FiltrosPropuestas,
  KpisPropuestas,
  PropuestaListaItem,
  PropuestasPaginado,
  TipoPropuesta,
} from '../models/propuestas.model';

// ─── DTOs del back (shape literal del server) ────────────────────────────────
interface PropuestaResumenDtoApi {
  idPropuesta:          number;
  numero:               string;
  version:              number;
  idRequerimiento:      number;
  numeroRequerimiento:  string;
  idCliente:            number;
  razonSocial:          string;
  referencia:           string | null;
  moneda:               string | null;
  total:                number;
  totalOpcionales:      number;
  estado:               string;
  fechaCreacion:        string | null;
  responsable:          string | null;
}

interface PropuestasPaginadoDtoApi {
  items:     PropuestaResumenDtoApi[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

/** GET /api/crm/propuestas/nueva?idRequerimiento=X */
export interface DatosNuevaPropuestaApi {
  idRequerimiento:     number;
  numeroRequerimiento: string;
  estadoRequerimiento: string;
  idCliente:           number;
  razonSocial:         string;
  ruc:                 string;
  idSede:              number | null;
  nombreSede:          string | null;
  idContacto:          number | null;
  nombreContacto:      string | null;
  cargoContacto:       string | null;
  idArea:              number | null;
  areaLabel:           string | null;
  idPrioridad:         number | null;
  prioridadLabel:      string | null;
  descripcion:         string;
  propuestaExistente:  { idPropuesta: number; numero: string; version: number; estado: string } | null;
}

export interface GuardarPropuestaResultadoApi {
  idPropuesta:         number;
  numero:              string;
  version:             number;
  estado:              string;
  subtotal:            number;
  descuentoMonto:      number;
  igvMonto:            number;
  total:               number;
  subtotalOpcionales:  number;
  descuentoOpcionales: number;
  totalOpcionales:     number;
}

export interface PropuestaItemApi {
  idItem:            number | null;
  seccion:           'principal' | 'opcional';
  idCatalogoItem:    number | null;
  descripcion:       string | null;
  alcance:           string | null;
  puntosCalibracion: string | null;
  cantidad:          number;
  frecuencia:        number;
  precioUnitario:    number;
  descuento:         number;
  subtotal:          number;
  esEspaciado:       boolean;
  orden:             number;
}

export interface PropuestaTextoApi {
  id:          number | null;
  seccion:     'detalle' | 'recomendaciones' | 'suministros_cliente' | 'condiciones';
  tipo:        'titulo' | 'vineta';
  texto:       string | null;
  idTextoBase: number | null;
  orden:       number;
}

export interface PropuestaFormaPagoApi {
  id:             number | null;
  porcentaje:     number;
  condicion:      string | null;
  condicionLabel: string | null;
  orden:          number;
}

export interface PropuestaEquipoApi {
  id:            number | null;
  idEquipo:      number | null;
  localSede:     string | null;
  tipo:          string | null;
  subtipo:       string | null;
  numSerie:      string | null;
  marca:         string | null;
  modelo:        string | null;
  codigoCliente: string | null;
  codigoTw:      string | null;
  orden:         number;
}

export interface PropuestaDetalleApi {
  idPropuesta:         number;
  numero:              string;
  version:             number;
  estado:              string;
  idPropuestaPadre:    number | null;
  esEditable:          boolean;

  idRequerimiento:     number;
  numeroRequerimiento: string;
  idCliente:           number;
  razonSocial:         string;
  ruc:                 string;
  idSede:              number | null;
  nombreSede:          string | null;
  idContacto:          number | null;
  nombreContacto:      string | null;
  cargoContacto:       string | null;
  idResponsable:       number | null;
  nombreResponsable:   string | null;

  tipoServicio:        string | null;
  referencia:          string | null;
  introduccion:        string | null;
  notasGenerales:      string | null;
  seccionesActivas:    string[];

  esTercerizado:       boolean;
  terceroRuc:          string | null;
  terceroRazonSocial:  string | null;
  terceroDireccion:    string | null;

  idMoneda:              number;
  moneda:                string | null;
  monedaSimbolo:         string | null;
  tipoCambio:            number | null;
  garantiaMeses:         number | null;
  mostrarGarantia:       boolean;
  plazoEntregaDias:      number | null;
  plazoEntregaUnidad:    string | null;
  plazoEntregaCondicion: string | null;
  vigenciaDias:          number | null;
  aplicaIgv:             boolean;
  preciosIncluyenIgv:    boolean;
  igvPct:                number;

  subtotal:              number;
  descuentoPct:          number | null;
  descuentoMonto:        number;
  idMotivoDescuento:     number | null;
  igvMonto:              number;
  total:                 number;
  subtotalOpcionales:    number;
  descuentoOpcionales:   number;
  totalOpcionales:       number;

  nombreCreador:         string | null;
  fechaCreacion:         string | null;
  fechaEnvio:            string | null;
  fechaExpiracion:       string | null;

  items:      PropuestaItemApi[];
  textos:     PropuestaTextoApi[];
  formasPago: PropuestaFormaPagoApi[];
  equipos:    PropuestaEquipoApi[];
}

/** Body de POST /api/crm/propuestas */
export interface GuardarPropuestaDtoApi {
  idPropuesta:        number;
  idPropuestaBase:    number | null;
  idRequerimiento:    number;

  idSede:             number | null;
  idContacto:         number | null;
  idResponsable:      number | null;
  tipoServicio:       string | null;
  seccionesActivas:   string[] | null;

  esTercerizado:      boolean;
  terceroRuc:         string | null;
  terceroRazonSocial: string | null;
  terceroDireccion:   string | null;

  referencia:         string | null;
  introduccion:       string | null;
  notasGenerales:     string | null;

  idMoneda:              number;
  tipoCambio:            number | null;
  garantiaMeses:         number | null;
  mostrarGarantia:       boolean;
  plazoEntregaDias:      number | null;
  plazoEntregaUnidad:    string | null;
  plazoEntregaCondicion: string | null;
  vigenciaDias:          number | null;
  aplicaIgv:             boolean;
  preciosIncluyenIgv:    boolean;

  descuentoPct:         number | null;
  descuentoMonto:       number | null;
  idMotivoDescuento:    number | null;
  descuentoOpcionales:  number | null;

  items:      PropuestaItemApi[];
  textos:     PropuestaTextoApi[];
  formasPago: PropuestaFormaPagoApi[];
  equipos:    PropuestaEquipoApi[];
}

/** Mapea labels human-readable para los estados que trae el back. */
const ESTADO_LABEL: Record<string, string> = {
  borrador:       'Borrador',
  pendiente:      'Pendiente',
  por_vb:         'Por VB',
  por_enviar:     'Por Enviar',
  en_seguimiento: 'En Seguimiento',
  aceptada:       'Aceptada',
  rechazada:      'Rechazada',
  por_consolidar: 'Por Consolidar',
};

@Injectable({ providedIn: 'root' })
export class PropuestasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/crm/propuestas`;

  // ─── Lista paginada + KPIs ──────────────────────────────────────────────────
  async obtenerPropuestas(filtros: FiltrosPropuestas): Promise<PropuestasPaginado> {
    // 1. Lista paginada que mostrará la tabla
    const items = await this.obtenerPaginaInterna(filtros);

    // 2. KPIs: una pasada adicional sin filtros ni paginación (porPagina alto).
    //    TODO: cuando el back exponga /kpis dedicado, reemplazar esto por un GET
    //    aparte más barato.
    const kpis = await this.calcularKpis();

    return { ...items, kpis };
  }

  async obtenerComerciales(): Promise<string[]> {
    const todas = await this.obtenerTodasParaStats();
    return Array.from(new Set(todas.map(p => p.responsable).filter((r): r is string => !!r))).sort();
  }

  // ─── GET /api/crm/propuestas/nueva?idRequerimiento=X ───────────────────────
  async obtenerDatosNueva(idRequerimiento: number): Promise<DatosNuevaPropuestaApi> {
    const params = new HttpParams().set('idRequerimiento', idRequerimiento);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<DatosNuevaPropuestaApi>>(`${this.base}/nueva`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje || 'No se pudo cargar el requerimiento.');
    return r.datos;
  }

  // ─── GET /api/crm/propuestas/{id} ─────────────────────────────────────────
  async obtenerPropuestaPorId(idPropuesta: number): Promise<PropuestaDetalleApi> {
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PropuestaDetalleApi>>(`${this.base}/${idPropuesta}`)
    );
    if (!r.datos) throw new Error(r.mensaje || 'Propuesta no encontrada.');
    return r.datos;
  }

  // ─── POST /api/crm/propuestas ─────────────────────────────────────────────
  async guardarPropuesta(dto: GuardarPropuestaDtoApi): Promise<GuardarPropuestaResultadoApi> {
    const r = await firstValueFrom(
      this.http.post<RespuestaApi<GuardarPropuestaResultadoApi>>(this.base, dto)
    );
    if (r.idTipoMensaje !== 2 || !r.datos) throw new Error(r.mensaje || 'Error al guardar.');
    return r.datos;
  }

  // ─── HTTP real ──────────────────────────────────────────────────────────────
  private async obtenerPaginaInterna(f: FiltrosPropuestas): Promise<PropuestasPaginado> {
    let params = new HttpParams()
      .set('pagina',    f.pagina)
      .set('porPagina', f.porPagina);

    if (f.busqueda) params = params.set('busqueda', f.busqueda);
    if (f.estado && f.estado !== 'todas') params = params.set('estado', f.estado);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PropuestasPaginadoDtoApi>>(this.base, { params })
    );
    if (!r.datos) throw new Error(r.mensaje || 'Error al cargar propuestas.');

    // Año, comercial y tipo no son filtros nativos del back todavía — los
    // aplicamos en cliente sobre los resultados paginados para que la UI
    // responda a los selects. Cuando el back los soporte, se pasan como query.
    let items = r.datos.items.map(mapResumenToListaItem);
    if (f.anio) items = items.filter(i => new Date(i.fechaCreacion).getFullYear() === f.anio);
    if (f.comercial && f.comercial !== 'todos') items = items.filter(i => i.comercial === f.comercial);
    // (f.tipo queda sin efecto hasta que el back exponga el campo).

    return {
      kpis:      { pendientes: 0, variacionPendientes: 0, porVistoBueno: 0, porEnviar: 0, enSeguimiento: 0, slaVencidos: 0 },
      items,
      total:     r.datos.total,
      pagina:    r.datos.pagina,
      porPagina: r.datos.porPagina,
    };
  }

  private async obtenerTodasParaStats(): Promise<PropuestaResumenDtoApi[]> {
    const params = new HttpParams().set('pagina', 1).set('porPagina', 1000);
    const r = await firstValueFrom(
      this.http.get<RespuestaApi<PropuestasPaginadoDtoApi>>(this.base, { params })
    );
    return r.datos?.items ?? [];
  }

  private async calcularKpis(): Promise<KpisPropuestas> {
    try {
      const todas = await this.obtenerTodasParaStats();
      const porEstado = (e: string) => todas.filter(p => p.estado === e).length;
      return {
        pendientes:          porEstado('pendiente'),
        variacionPendientes: 0,
        porVistoBueno:       porEstado('por_vb'),
        porEnviar:           porEstado('por_enviar'),
        enSeguimiento:       porEstado('en_seguimiento'),
        slaVencidos:         0,
      };
    } catch {
      return { pendientes: 0, variacionPendientes: 0, porVistoBueno: 0, porEnviar: 0, enSeguimiento: 0, slaVencidos: 0 };
    }
  }
}

// ─── Mapeos ──────────────────────────────────────────────────────────────────
function mapResumenToListaItem(r: PropuestaResumenDtoApi): PropuestaListaItem {
  const responsable = r.responsable ?? '—';
  return {
    idPropuesta:          r.idPropuesta,
    codigo:               r.numero,
    version:              r.version > 0 ? `v${r.version}` : 'v1',
    idRequerimiento:      r.idRequerimiento || null,
    codigoRequerimiento:  r.numeroRequerimiento || null,
    idCliente:            r.idCliente,
    razonSocial:          r.razonSocial,
    ruc:                  '',
    referencia:           r.referencia ?? '',
    tipo:                 'servicio' as TipoPropuesta,
    tipoLabel:            'SERVICIO',
    estado:               (r.estado as EstadoPropuesta) ?? 'borrador',
    estadoLabel:          ESTADO_LABEL[r.estado] ?? r.estado,
    monto:                Number(r.total || 0),
    moneda:               r.moneda ?? 'USD',
    comercial:            responsable,
    avatarComercial:      iniciales(responsable),
    slaDiasRestantes:     0,
    fechaCreacion:        r.fechaCreacion ?? '',
    fechaUltimaMod:       '',
  };
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '—';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}
