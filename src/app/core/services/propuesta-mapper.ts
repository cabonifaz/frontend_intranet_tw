// Mapper bidireccional entre:
//   - PropuestaDraft (modelo interno del front, consumido por la UI)
//   - PropuestaDetalleApi / GuardarPropuestaDtoApi (contratos del back)
//
// Nota: El back usa un modelo "aplanado" (lineas Propuesta + Opcionales en un solo
// array Items con discriminador seccion; bloques jerárquicos en Textos con tipo
// 'titulo'/'vineta' ordenados). El front los maneja separados para la UX.

import {
  PropuestaDraft,
  LineaItemPropuesta,
  GrupoBloque,
  CuotaPago,
  EquipoVinculado,
  crearDraftVacio,
} from '../models/propuesta-detalle.model';
import { TipoPropuesta } from '../models/propuestas.model';
import {
  DatosNuevaPropuestaApi,
  GuardarPropuestaDtoApi,
  PropuestaDetalleApi,
  PropuestaEquipoApi,
  PropuestaFormaPagoApi,
  PropuestaItemApi,
  PropuestaTextoApi,
} from './propuestas.service';

// ─── Catálogo de moneda (back usa IdMoneda numérico) ─────────────────────────
const MONEDA_ID_A_CODIGO: Record<number, string> = { 1: 'PEN', 2: 'USD' };
const MONEDA_CODIGO_A_ID: Record<string, number> = { PEN: 1, USD: 2 };

const PLAZO_UNIDAD_API: Record<string, 'habiles' | 'calendario'> = {
  dias_habiles:    'habiles',
  dias_calendario: 'calendario',
};
const PLAZO_UNIDAD_DRAFT: Record<string, string> = {
  habiles:    'dias_habiles',
  calendario: 'dias_calendario',
};

// ────────────────────────────────────────────────────────────────────────────
//  BACK → FRONT
// ────────────────────────────────────────────────────────────────────────────

/** Convierte el detalle del back al draft interno del front. */
export function mapDetalleToDraft(d: PropuestaDetalleApi): PropuestaDraft {
  const base = crearDraftVacio();
  return {
    ...base,

    idPropuesta:         d.idPropuesta,
    codigo:              d.numero,
    version:             d.version > 0 ? `v${d.version}` : 'v1',
    esNuevaVersion:      d.idPropuestaPadre != null,
    idRequerimiento:     d.idRequerimiento,
    codigoRequerimiento: d.numeroRequerimiento,
    idCliente:           d.idCliente,
    razonSocial:         d.razonSocial,
    ruc:                 d.ruc,
    contacto:            d.nombreContacto ?? '',

    estado:              d.estado,
    esEditable:          d.esEditable,

    referencia:          d.referencia ?? '',
    introduccion:        d.introduccion ?? '',
    notasGenerales:      d.notasGenerales ?? '',

    descuentoPct:        d.descuentoPct,
    descuentoMonto:      Number(d.descuentoMonto ?? 0),
    idMotivoDescuento:   d.idMotivoDescuento,
    descuentoOpcionales: Number(d.descuentoOpcionales ?? 0),

    seccionesIncluidas: {
      configuracion:        true,
      propuesta:            d.seccionesActivas.includes('propuesta')             || true,
      opcionales:           d.seccionesActivas.includes('opcionales'),
      detalle:              d.seccionesActivas.includes('detalle'),
      recomendaciones:      d.seccionesActivas.includes('recomendaciones'),
      formaPago:            true,
      suministrosCliente:   d.seccionesActivas.includes('suministros_cliente'),
      condicionesServicio:  d.seccionesActivas.includes('condiciones'),
      listadoEquipos:       true,
    },
    tipoPropuesta:         (d.tipoServicio as TipoPropuesta | '') || '',
    responsableTecnico:    d.nombreResponsable ?? '',
    requiereTercerizacion: d.esTercerizado,
    terceroEmpresa:        d.terceroRazonSocial ?? '',
    terceroRuc:            d.terceroRuc ?? '',
    terceroDireccion:      d.terceroDireccion ?? '',

    lineasPropuesta:  d.items.filter(i => i.seccion === 'principal').map(mapItemApiToLinea),
    lineasOpcionales: d.items.filter(i => i.seccion === 'opcional').map(mapItemApiToLinea),

    bloquesDetalle:            agruparTextos(d.textos, 'detalle'),
    bloquesRecomendaciones:    agruparTextos(d.textos, 'recomendaciones'),
    bloquesSuministrosCliente: agruparTextos(d.textos, 'suministros_cliente'),

    clausulasContrato: d.textos
      .filter(t => t.seccion === 'condiciones' && t.tipo === 'vineta')
      .sort((a, b) => a.orden - b.orden)
      .map(t => ({ id: 'c_' + (t.id ?? Math.random()), texto: t.texto ?? '' })),

    tipoMoneda:         MONEDA_ID_A_CODIGO[d.idMoneda] ?? 'USD',
    tipoCambio:         Number(d.tipoCambio ?? 3.75),
    garantiaEquipos:    d.garantiaMeses ?? 12,
    plazoEntrega:       d.plazoEntregaDias ?? 15,
    plazoEntregaUnidad: PLAZO_UNIDAD_API[d.plazoEntregaUnidad ?? 'dias_habiles'] ?? 'habiles',
    validezOferta:      d.vigenciaDias ?? 30,
    igvDesagregado:     d.aplicaIgv && !d.preciosIncluyenIgv,
    cuotas:             d.formasPago
      .sort((a, b) => a.orden - b.orden)
      .map((f, i) => ({
        id:          'c' + (f.id ?? i),
        porcentaje:  Number(f.porcentaje),
        descripcion: f.condicionLabel ?? f.condicion ?? '',
      })),

    equiposVinculados: d.equipos.map(mapEquipoApiToVinculado),

    ultimaModificacion: new Date().toISOString(),
  };
}

/** Rellena el draft con los datos iniciales del RQ (modo nueva). */
export function prellenarDraftDesdeRq(datos: DatosNuevaPropuestaApi): PropuestaDraft {
  const base = crearDraftVacio();
  return {
    ...base,
    idRequerimiento:     datos.idRequerimiento,
    codigoRequerimiento: datos.numeroRequerimiento,
    idCliente:           datos.idCliente,
    razonSocial:         datos.razonSocial,
    ruc:                 datos.ruc,
    contacto:            datos.nombreContacto ?? '',
  };
}

function mapItemApiToLinea(i: PropuestaItemApi): LineaItemPropuesta {
  return {
    idSuministro:    i.idCatalogoItem ?? 0,
    descripcion:     i.descripcion ?? '',
    alcance:         i.alcance ?? '',
    ptosCalibracion: i.puntosCalibracion ?? '',
    cantidad:        Number(i.cantidad),
    frecuencia:      Number(i.frecuencia),
    precioUnitario:  Number(i.precioUnitario),
    descuentoPct:    i.precioUnitario > 0
      ? Math.round((Number(i.descuento) * 100) / (Number(i.cantidad) * Number(i.frecuencia) * Number(i.precioUnitario)))
      : 0,
  };
}

function mapEquipoApiToVinculado(e: PropuestaEquipoApi): EquipoVinculado {
  return {
    idEquipo: e.idEquipo ?? 0,
    numSerie: e.numSerie ?? '',
    codigoTw: e.codigoTw ?? '',
    local:    e.localSede ?? '',
    tipo:     e.tipo ?? '',
    subtipo:  e.subtipo ?? '',
    marca:    e.marca ?? '',
    modelo:   e.modelo ?? '',
  };
}

/** Convierte el array plano de textos del back en bloques jerárquicos. */
function agruparTextos(textos: PropuestaTextoApi[], seccion: PropuestaTextoApi['seccion']): GrupoBloque[] {
  const propios = textos
    .filter(t => t.seccion === seccion)
    .sort((a, b) => a.orden - b.orden);

  const grupos: GrupoBloque[] = [];
  let actual: GrupoBloque | null = null;

  for (const t of propios) {
    if (t.tipo === 'titulo') {
      actual = {
        id:      'g_' + (t.id ?? Math.random()),
        titulo:  t.texto ?? '',
        vinetas: [],
      };
      grupos.push(actual);
    } else {
      // viñeta: si no hay título todavía, crea uno vacío
      if (!actual) {
        actual = { id: 'g_auto_' + Math.random(), titulo: '', vinetas: [] };
        grupos.push(actual);
      }
      actual.vinetas.push({ id: 'v_' + (t.id ?? Math.random()), texto: t.texto ?? '' });
    }
  }
  return grupos;
}

// ────────────────────────────────────────────────────────────────────────────
//  FRONT → BACK
// ────────────────────────────────────────────────────────────────────────────

/** Convierte el draft del front al DTO que espera POST /api/crm/propuestas. */
export function mapDraftToGuardarDto(draft: PropuestaDraft): GuardarPropuestaDtoApi {
  const items: PropuestaItemApi[] = [
    ...draft.lineasPropuesta.map((l, i)  => mapLineaToItemApi(l, 'principal', i + 1)),
    ...draft.lineasOpcionales.map((l, i) => mapLineaToItemApi(l, 'opcional',  i + 1)),
  ];

  const textos: PropuestaTextoApi[] = [
    ...aplanarGrupos(draft.bloquesDetalle,             'detalle'),
    ...aplanarGrupos(draft.bloquesRecomendaciones,     'recomendaciones'),
    ...aplanarGrupos(draft.bloquesSuministrosCliente, 'suministros_cliente'),
    ...draft.clausulasContrato.map((c, i): PropuestaTextoApi => ({
      id:          null,
      seccion:     'condiciones',
      tipo:        'vineta',
      texto:       c.texto,
      idTextoBase: null,
      orden:       i + 1,
    })),
  ];

  const formasPago: PropuestaFormaPagoApi[] = draft.cuotas.map((c, i) => ({
    id:             null,
    porcentaje:     c.porcentaje,
    condicion:      c.descripcion || 'CUOTA_LIBRE',
    condicionLabel: null,
    orden:          i + 1,
  }));

  const equipos: PropuestaEquipoApi[] = draft.equiposVinculados.map((e, i) => ({
    id:            null,
    idEquipo:      e.idEquipo > 0 ? e.idEquipo : null,
    localSede:     e.local,
    tipo:          e.tipo,
    subtipo:       e.subtipo,
    numSerie:      e.numSerie,
    marca:         e.marca,
    modelo:        e.modelo,
    codigoCliente: null,
    codigoTw:      e.codigoTw,
    orden:         i + 1,
  }));

  const seccionesActivas: string[] = [];
  const s = draft.seccionesIncluidas;
  if (s.propuesta)           seccionesActivas.push('propuesta');
  if (s.opcionales)          seccionesActivas.push('opcionales');
  if (s.detalle)             seccionesActivas.push('detalle');
  if (s.recomendaciones)     seccionesActivas.push('recomendaciones');
  if (s.suministrosCliente)  seccionesActivas.push('suministros_cliente');
  if (s.condicionesServicio) seccionesActivas.push('condiciones');

  return {
    idPropuesta:     draft.idPropuesta ?? 0,
    idPropuestaBase: draft.esNuevaVersion && draft.idPropuesta ? draft.idPropuesta : null,
    idRequerimiento: draft.idRequerimiento ?? 0,

    idSede:        null,            // TODO: cuando tengamos selector de sede
    idContacto:    null,            // TODO: cuando tengamos selector de contacto
    idResponsable: null,            // null → back usa el usuario logueado
    tipoServicio:  draft.tipoPropuesta || null,
    seccionesActivas,

    esTercerizado:      draft.requiereTercerizacion,
    terceroRuc:         draft.terceroRuc        || null,
    terceroRazonSocial: draft.terceroEmpresa    || null,
    terceroDireccion:   draft.terceroDireccion  || null,

    referencia:     draft.referencia     || null,
    introduccion:   draft.introduccion   || null,
    notasGenerales: draft.notasGenerales || null,

    idMoneda:              MONEDA_CODIGO_A_ID[draft.tipoMoneda] ?? 2,
    tipoCambio:            draft.tipoCambio,
    garantiaMeses:         draft.garantiaEquipos,
    mostrarGarantia:       true,
    plazoEntregaDias:      draft.plazoEntrega,
    plazoEntregaUnidad:    PLAZO_UNIDAD_DRAFT[draft.plazoEntregaUnidad] ?? 'dias_habiles',
    plazoEntregaCondicion: null,
    vigenciaDias:          draft.validezOferta,
    aplicaIgv:             true,
    preciosIncluyenIgv:    !draft.igvDesagregado,

    descuentoPct:        draft.descuentoPct,
    descuentoMonto:      draft.descuentoMonto,
    idMotivoDescuento:   draft.idMotivoDescuento,
    descuentoOpcionales: draft.descuentoOpcionales,

    items,
    textos,
    formasPago,
    equipos,
  };
}

function mapLineaToItemApi(l: LineaItemPropuesta, seccion: 'principal' | 'opcional', orden: number): PropuestaItemApi {
  const subtotalBruto = l.cantidad * l.frecuencia * l.precioUnitario;
  const descuentoMonto = subtotalBruto * (l.descuentoPct / 100);
  return {
    idItem:            null,
    seccion,
    idCatalogoItem:    l.idSuministro > 0 ? l.idSuministro : null,
    descripcion:       l.descripcion,
    alcance:           l.alcance || null,
    puntosCalibracion: l.ptosCalibracion || null,
    cantidad:          l.cantidad,
    frecuencia:        l.frecuencia,
    precioUnitario:    l.precioUnitario,
    descuento:         descuentoMonto,
    subtotal:          subtotalBruto - descuentoMonto,
    esEspaciado:       false,
    orden,
  };
}

function aplanarGrupos(grupos: GrupoBloque[], seccion: PropuestaTextoApi['seccion']): PropuestaTextoApi[] {
  const out: PropuestaTextoApi[] = [];
  let orden = 1;
  for (const g of grupos) {
    if (g.titulo) {
      out.push({
        id:          null,
        seccion,
        tipo:        'titulo',
        texto:       g.titulo,
        idTextoBase: null,
        orden:       orden++,
      });
    }
    for (const v of g.vinetas) {
      out.push({
        id:          null,
        seccion,
        tipo:        'vineta',
        texto:       v.texto,
        idTextoBase: null,
        orden:       orden++,
      });
    }
  }
  return out;
}

// Suprime warnings de parámetros no usados que aún quedan en el modelo
void (undefined as unknown as CuotaPago);
