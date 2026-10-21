// ═════════════════════════════════════════════════════════════════════════════
// MOCKS — Módulo 6 Órdenes de Compra
// ⚠️ SOLO PARA DESARROLLO LOCAL. NO COMMITEAR CON USAR_MOCK = true EN STAGING.
// ═════════════════════════════════════════════════════════════════════════════

import {
  AnulacionOrdenCompraDto,
  BandejaOrdenesCompraDto,
  ComparacionOrdenCompraDto,
  DetalleOrdenCompraDto,
  ExtraccionOrdenCompraDto,
  OcAutogeneradaDto,
  PreparacionAnulacionOcDto,
  PreparacionEdicionOrdenCompraDto,
  PreparacionOrdenCompraDto,
  PropuestaDisponibleOcDto,
  ResultadoGuardarOrdenCompraDto,
  RevalidacionOrdenCompraDto,
  TimelineOrdenCompraDto,
  ValidacionOrdenCompraDto,
} from '../models/ordenes-compra.model';

const HOY = new Date().toISOString();
const AYER = new Date(Date.now() - 86_400_000).toISOString();
const HACE_3D = new Date(Date.now() - 3 * 86_400_000).toISOString();
const HACE_7D = new Date(Date.now() - 7 * 86_400_000).toISOString();
const HACE_15D = new Date(Date.now() - 15 * 86_400_000).toISOString();

// ─── Catálogos comunes ───────────────────────────────────────────────────────

const MONEDAS = [
  { id: 1, nombre: 'Soles', simbolo: 'S/', codigo: 'PEN' },
  { id: 2, nombre: 'Dólares', simbolo: '$', codigo: 'USD' },
];

const CONDICIONES_PAGO = [
  { id: 1, nombre: 'Contado', codigo: 'CONT' },
  { id: 2, nombre: '15 días', codigo: 'D15' },
  { id: 3, nombre: '30 días', codigo: 'D30' },
  { id: 4, nombre: '45 días', codigo: 'D45' },
  { id: 5, nombre: '60 días', codigo: 'D60' },
];

// ─── BANDEJA ─────────────────────────────────────────────────────────────────

export const MOCK_BANDEJA: BandejaOrdenesCompraDto = {
  tarjetas: {
    total: 24,
    registradasMes: 8,
    validadas: 12,
    validadasParcial: 3,
    observadas: 4,
    parcialUObservadas: 7,
    autogeneradasPendientes: 2,
    sinAsignar: 1,
    anuladas: 2,
  },
  montoValidadoMes: [
    { idMoneda: 1, moneda: 'Soles',   monedaSimbolo: 'S/', monto: 128_450.75 },
    { idMoneda: 2, moneda: 'Dólares', monedaSimbolo: '$',  monto: 42_300.00 },
  ],
  items: [
    {
      idOc: 1001, numeroOc: 'OC-ANT-99201', esAutogenerada: false,
      fechaOc: HACE_3D, fechaRecepcion: HACE_3D, fechaRegistro: HACE_3D,
      idCliente: 10, razonSocial: 'Antamina S.A.C.', ruc: '20100030595',
      idRequerimiento: 101, numeroRq: 'RQ-ANT-00321',
      idPropuesta: 501, numeroPropuesta: 'PROP-000010', versionPropuesta: 1,
      propuestasVinculadas: 1, propuestasAdicionales: 0,
      idMoneda: 1, moneda: 'Soles', monedaSimbolo: 'S/',
      montoOc: 24_500.00, montoAsignado: 24_500.00, saldoOc: 0, asignadoPct: 100,
      estado: 'validada', estadoVisual: 'validada',
      resultadoIa: 'ok', alertasIa: 0,
      idResponsable: 5, responsable: 'Jazir Chambergo',
      tienePdf: true, urlPdf: null, puedeAnular: true,
    },
    {
      idOc: 1002, numeroOc: 'OC-SMC-45122', esAutogenerada: false,
      fechaOc: HACE_7D, fechaRecepcion: HACE_7D, fechaRegistro: HACE_7D,
      idCliente: 11, razonSocial: 'Southern Copper Perú', ruc: '20100147514',
      idRequerimiento: 102, numeroRq: 'RQ-SMC-00218',
      idPropuesta: 502, numeroPropuesta: 'PROP-000011', versionPropuesta: 2,
      propuestasVinculadas: 2, propuestasAdicionales: 1,
      idMoneda: 2, moneda: 'Dólares', monedaSimbolo: '$',
      montoOc: 18_200.00, montoAsignado: 15_800.00, saldoOc: 2_400.00, asignadoPct: 87,
      estado: 'validada_parcial', estadoVisual: 'validada_parcial',
      resultadoIa: 'advertencia', alertasIa: 2,
      idResponsable: 5, responsable: 'Jazir Chambergo',
      tienePdf: true, urlPdf: null, puedeAnular: true,
    },
    {
      idOc: 1003, numeroOc: 'OC-CER-77301', esAutogenerada: false,
      fechaOc: HACE_7D, fechaRecepcion: HACE_7D, fechaRegistro: HACE_7D,
      idCliente: 12, razonSocial: 'Cerro Verde S.A.A.', ruc: '20170030041',
      idRequerimiento: 103, numeroRq: 'RQ-CER-00412',
      idPropuesta: 503, numeroPropuesta: 'PROP-000012', versionPropuesta: 1,
      propuestasVinculadas: 1, propuestasAdicionales: 0,
      idMoneda: 1, moneda: 'Soles', monedaSimbolo: 'S/',
      montoOc: 9_750.00, montoAsignado: 9_750.00, saldoOc: 0, asignadoPct: 100,
      estado: 'observada', estadoVisual: 'observada',
      resultadoIa: 'critico', alertasIa: 3,
      idResponsable: 6, responsable: 'Bryan Córdova',
      tienePdf: true, urlPdf: null, puedeAnular: true,
    },
    {
      idOc: 1004, numeroOc: 'OC-AUTO-000045', esAutogenerada: true,
      fechaOc: AYER, fechaRecepcion: null, fechaRegistro: AYER,
      idCliente: 13, razonSocial: 'Volcan Compañía Minera', ruc: '20383045267',
      idRequerimiento: 104, numeroRq: 'RQ-VOL-00117',
      idPropuesta: 504, numeroPropuesta: 'PROP-000013', versionPropuesta: 1,
      propuestasVinculadas: 1, propuestasAdicionales: 0,
      idMoneda: 1, moneda: 'Soles', monedaSimbolo: 'S/',
      montoOc: 5_200.00, montoAsignado: 5_200.00, saldoOc: 0, asignadoPct: 100,
      estado: 'validada', estadoVisual: 'validada',
      resultadoIa: null, alertasIa: 0,
      idResponsable: 5, responsable: 'Jazir Chambergo',
      tienePdf: true, urlPdf: null, puedeAnular: true,
    },
    {
      idOc: 1005, numeroOc: 'OC-NEX-10550', esAutogenerada: false,
      fechaOc: HACE_15D, fechaRecepcion: HACE_15D, fechaRegistro: HACE_15D,
      idCliente: 14, razonSocial: 'Nexa Resources Perú', ruc: '20100058107',
      idRequerimiento: null, numeroRq: null,
      idPropuesta: 505, numeroPropuesta: 'PROP-000014', versionPropuesta: 1,
      propuestasVinculadas: 1, propuestasAdicionales: 0,
      idMoneda: 2, moneda: 'Dólares', monedaSimbolo: '$',
      montoOc: 32_100.00, montoAsignado: 32_100.00, saldoOc: 0, asignadoPct: 100,
      estado: 'anulada', estadoVisual: 'anulada',
      resultadoIa: null, alertasIa: 0,
      idResponsable: 6, responsable: 'Bryan Córdova',
      tienePdf: true, urlPdf: null, puedeAnular: false,
    },
    {
      idOc: 1006, numeroOc: 'OC-MIN-77214', esAutogenerada: false,
      fechaOc: HACE_3D, fechaRecepcion: HACE_3D, fechaRegistro: HACE_3D,
      idCliente: 15, razonSocial: 'Minera Las Bambas', ruc: '20542187670',
      idRequerimiento: 106, numeroRq: 'RQ-BAM-00099',
      idPropuesta: 506, numeroPropuesta: 'PROP-000015', versionPropuesta: 1,
      propuestasVinculadas: 1, propuestasAdicionales: 0,
      idMoneda: 1, moneda: 'Soles', monedaSimbolo: 'S/',
      montoOc: 12_800.00, montoAsignado: 12_800.00, saldoOc: 0, asignadoPct: 100,
      estado: 'recibida', estadoVisual: 'recibida',
      resultadoIa: null, alertasIa: 0,
      idResponsable: 5, responsable: 'Jazir Chambergo',
      tienePdf: true, urlPdf: null, puedeAnular: true,
    },
  ],
  total: 6,
  pagina: 1,
  porPagina: 10,
  clientes: [
    { id: 10, nombre: 'Antamina S.A.C.' },
    { id: 11, nombre: 'Southern Copper Perú' },
    { id: 12, nombre: 'Cerro Verde S.A.A.' },
    { id: 13, nombre: 'Volcan Compañía Minera' },
    { id: 14, nombre: 'Nexa Resources Perú' },
    { id: 15, nombre: 'Minera Las Bambas' },
  ],
  responsables: [
    { id: 5, nombre: 'Jazir Chambergo' },
    { id: 6, nombre: 'Bryan Córdova' },
  ],
};

// ─── PROPUESTAS DISPONIBLES ──────────────────────────────────────────────────

export const MOCK_PROPUESTAS_DISPONIBLES: PropuestaDisponibleOcDto[] = [
  {
    idPropuesta: 601, numero: 'PROP-000020', version: 1,
    idCliente: 10, razonSocial: 'Antamina S.A.C.', ruc: '20100030595',
    idRequerimiento: 201, numeroRq: 'RQ-ANT-00500',
    idContacto: 70, contacto: 'Carlos Mendoza',
    total: 15_300.00, saldo: 15_300.00,
    idMoneda: 1, moneda: 'Soles', monedaSimbolo: 'S/',
    fechaAceptacion: HACE_7D, responsable: 'Jazir Chambergo',
    tipoServicio: 'Mantenimiento', tieneOc: false,
  },
  {
    idPropuesta: 602, numero: 'PROP-000021', version: 1,
    idCliente: 10, razonSocial: 'Antamina S.A.C.', ruc: '20100030595',
    idRequerimiento: 202, numeroRq: 'RQ-ANT-00501',
    idContacto: 70, contacto: 'Carlos Mendoza',
    total: 8_900.00, saldo: 8_900.00,
    idMoneda: 1, moneda: 'Soles', monedaSimbolo: 'S/',
    fechaAceptacion: HACE_3D, responsable: 'Jazir Chambergo',
    tipoServicio: 'Calibración', tieneOc: false,
  },
];

// ─── PREPARACIÓN REGISTRO ────────────────────────────────────────────────────

export function mockPreparacionRegistro(idPropuesta: number): PreparacionOrdenCompraDto {
  return {
    propuesta: {
      idPropuesta,
      numero: 'PROP-000010',
      version: 1,
      idCliente: 10,
      razonSocial: 'Antamina S.A.C.',
      ruc: '20100030595',
      idRequerimiento: 101,
      numeroRq: 'RQ-ANT-00321',
      idContacto: 70,
      contacto: 'Carlos Mendoza',
      cargoContacto: 'Jefe de Compras',
      total: 24_500.00,
      saldo: 24_500.00,
      idMoneda: 1,
      moneda: 'Soles',
      monedaSimbolo: 'S/',
      idCondicionPago: 3,
      condicionPago: '30 días',
      aplicaIgv: true,
      igvPct: 18,
      fechaExpiracion: new Date(Date.now() + 15 * 86_400_000).toISOString(),
      fechaAceptacion: HACE_7D,
      idResponsable: 5,
      responsable: 'Jazir Chambergo',
      tipoServicio: 'Mantenimiento',
      items: 4,
      fechaServidor: HOY,
    },
    ocAReemplazar: null,
    otrasPropuestas: [
      {
        idPropuesta: 602, numero: 'PROP-000021', version: 1,
        idCliente: 10, razonSocial: 'Antamina S.A.C.', ruc: '20100030595',
        idRequerimiento: 202, numeroRq: 'RQ-ANT-00501',
        idContacto: 70, contacto: 'Carlos Mendoza',
        total: 8_900.00, saldo: 8_900.00,
        idMoneda: 1, moneda: 'Soles', monedaSimbolo: 'S/',
        fechaAceptacion: HACE_3D, responsable: 'Jazir Chambergo',
        tipoServicio: 'Calibración', tieneOc: false,
      },
    ],
    monedas: MONEDAS,
    condicionesPago: CONDICIONES_PAGO,
    extraccionIaDisponible: true,
  };
}

// ─── PREPARACIÓN EDICIÓN ─────────────────────────────────────────────────────

export function mockPreparacionEdicion(idOc: number): PreparacionEdicionOrdenCompraDto {
  return {
    oc: {
      idOc,
      numeroOc: 'OC-ANT-99201',
      estado: 'validada',
      idCliente: 10,
      razonSocial: 'Antamina S.A.C.',
      ruc: '20100030595',
      idPropuesta: 501,
      datos: {
        numeroOc: 'OC-ANT-99201',
        fechaEmision: HACE_3D.slice(0, 10),
        fechaRecepcion: HACE_3D.slice(0, 10),
        idMoneda: 1,
        montoTotal: 24_500.00,
        idCondicionPago: 3,
        formaPago: null,
        igvIncluido: true,
        igvPct: 18,
        descuento: null,
        ruc: '20100030595',
        razonSocial: 'Antamina S.A.C.',
        numeroPropuesta: 'PROP-000010',
        vigenciaHasta: null,
        referencia: null,
        observaciones: null,
        facturaIgualOc: true,
        conceptos: [
          { descripcion: 'Mantenimiento preventivo balanza A', cantidad: 1, precioUnitario: 8_200, subtotal: 8_200 },
          { descripcion: 'Mantenimiento preventivo balanza B', cantidad: 1, precioUnitario: 8_200, subtotal: 8_200 },
          { descripcion: 'Calibración ISO 10012',               cantidad: 2, precioUnitario: 2_050, subtotal: 4_100 },
          { descripcion: 'Repuestos (lote varios)',             cantidad: 1, precioUnitario: 4_000, subtotal: 4_000 },
        ],
        camposIa: {
          numero_oc: 'OC-ANT-99201',
          fecha_emision: HACE_3D.slice(0, 10),
          id_moneda: '1',
          monto_total: '24500.00',
          id_condicion_pago: '3',
          igv_pct: '18',
        },
        camposManuales: [],
      },
      nombreArchivoPdf: 'OC-ANT-99201.pdf',
      tamanoPdfBytes: 234_567,
      tienePdf: true,
      urlPdf: null,
      pendienteCorreccion: false,
      fechaRegistro: HACE_3D,
    },
    vinculaciones: [
      {
        idPropuesta: 501, numero: 'PROP-000010', version: 1,
        total: 24_500, saldo: 0, idMoneda: 1, montoAsignado: 24_500,
        estadoValidacion: 'validada', tipoObservacion: null, resultadoIa: 'ok',
        idContacto: 70, contacto: 'Carlos Mendoza',
        idRequerimiento: 101, numeroRq: 'RQ-ANT-00321',
        nuevaVersionAceptada: false,
      },
    ],
    otrasPropuestas: [],
    monedas: MONEDAS,
    condicionesPago: CONDICIONES_PAGO,
    extraccionIaDisponible: true,
  };
}

// ─── EXTRACCIÓN IA ───────────────────────────────────────────────────────────

export function mockExtraccion(): ExtraccionOrdenCompraDto {
  return {
    datos: {
      numeroOc: 'OC-ANT-99201',
      fechaEmision: HACE_3D.slice(0, 10),
      fechaRecepcion: HOY.slice(0, 10),
      idMoneda: 1,
      montoTotal: 24_500.00,
      idCondicionPago: 3,
      formaPago: null,
      igvIncluido: true,
      igvPct: 18,
      descuento: null,
      ruc: '20100030595',
      razonSocial: 'Antamina S.A.C.',
      numeroPropuesta: 'PROP-000010',
      vigenciaHasta: null,
      referencia: null,
      observaciones: null,
      facturaIgualOc: true,
      conceptos: [
        { descripcion: 'Mantenimiento preventivo balanza A', cantidad: 1, precioUnitario: 8_200, subtotal: 8_200 },
        { descripcion: 'Mantenimiento preventivo balanza B', cantidad: 1, precioUnitario: 8_200, subtotal: 8_200 },
        { descripcion: 'Calibración ISO 10012',               cantidad: 2, precioUnitario: 2_050, subtotal: 4_100 },
        { descripcion: 'Repuestos (lote varios)',             cantidad: 1, precioUnitario: 4_000, subtotal: 4_000 },
      ],
      camposIa: {
        numero_oc: 'OC-ANT-99201',
        fecha_emision: HACE_3D.slice(0, 10),
        id_moneda: '1',
        monto_total: '24500.00',
        id_condicion_pago: '3',
        igv_pct: '18',
      },
      camposManuales: [],
    },
    monedaLeida: 'PEN',
    confianza: 0.94,
    motor: 'gemini-2.5-flash (MOCK)',
    advertencias: [],
  };
}

// ─── COMPARACIÓN ─────────────────────────────────────────────────────────────

export function mockComparacion(): ComparacionOrdenCompraDto {
  return {
    resumen: {
      resultado: 'advertencia',
      sugerencia: 'La OC coincide en lo esencial con la propuesta. Hay 2 advertencias menores que puedes revisar antes de registrar.',
      criticas: 0,
      advertencias: 2,
      puedeValidar: true,
      puedeObservar: true,
      puedeSolicitarCorreccion: false,
      puedeNuevaVersion: false,
    },
    propuestas: [
      {
        orden: 1, idPropuesta: 501, numero: 'PROP-000010',
        montoAsignado: 24_500,
        resultado: 'advertencia',
        coincidencias: 5, advertencias: 2, criticas: 0, totalCampos: 7,
        sugerencia: 'Coincide en empresa/RUC/moneda/monto. Revisa condición de pago y 1 concepto.',
      },
    ],
    campos: [
      {
        idPropuesta: 501, orden: 1, campo: 'razon_social', etiqueta: 'Razón Social',
        valorOc: 'Antamina S.A.C.', valorPropuesta: 'Antamina S.A.C.',
        severidad: 'ok', mensaje: 'Coincide', accion: null,
      },
      {
        idPropuesta: 501, orden: 2, campo: 'ruc', etiqueta: 'RUC',
        valorOc: '20100030595', valorPropuesta: '20100030595',
        severidad: 'ok', mensaje: 'Coincide', accion: null,
      },
      {
        idPropuesta: 501, orden: 3, campo: 'moneda', etiqueta: 'Moneda',
        valorOc: 'Soles', valorPropuesta: 'Soles',
        severidad: 'ok', mensaje: 'Coincide', accion: null,
      },
      {
        idPropuesta: 501, orden: 4, campo: 'monto_total', etiqueta: 'Monto Total',
        valorOc: 'S/ 24,500.00', valorPropuesta: 'S/ 24,500.00',
        severidad: 'ok', mensaje: 'Coincide', accion: null,
      },
      {
        idPropuesta: 501, orden: 5, campo: 'condicion_pago', etiqueta: 'Condición de Pago',
        valorOc: '30 días', valorPropuesta: '45 días',
        severidad: 'advertencia',
        mensaje: 'La OC indica 30 días; la propuesta tenía 45 días.',
        accion: 'Si el cliente ajustó el plazo, puedes registrar con observación.',
      },
      {
        idPropuesta: 501, orden: 6, campo: 'igv', etiqueta: 'IGV',
        valorOc: '18% (incluido)', valorPropuesta: '18% (incluido)',
        severidad: 'ok', mensaje: 'Coincide', accion: null,
      },
      {
        idPropuesta: 501, orden: 7, campo: 'concepto_repuestos', etiqueta: 'Concepto "Repuestos (lote varios)"',
        valorOc: 'S/ 4,000.00', valorPropuesta: 'S/ 3,800.00',
        severidad: 'advertencia',
        mensaje: 'El monto del lote de repuestos subió S/ 200 respecto a la propuesta.',
        accion: 'Confirma con el cliente si corresponde a repuestos adicionales.',
      },
    ],
    evaluacionesIa: [
      {
        idPropuesta: 501,
        conceptos: [
          { descripcion: 'Mantenimiento preventivo balanza A', montoOc: 8_200, montoPropuesta: 8_200, estado: 'coincide' },
          { descripcion: 'Mantenimiento preventivo balanza B', montoOc: 8_200, montoPropuesta: 8_200, estado: 'coincide' },
          { descripcion: 'Calibración ISO 10012',               montoOc: 4_100, montoPropuesta: 4_100, estado: 'coincide' },
          { descripcion: 'Repuestos (lote varios)',             montoOc: 4_000, montoPropuesta: 3_800, estado: 'monto_distinto' },
        ],
        dictamen: 'La OC es razonable y procedente. Solo hay un ajuste menor en el lote de repuestos y un cambio en condición de pago.',
        insights: [
          {
            campo: 'condicion_pago',
            titulo: 'Cambio en condición de pago',
            explicacion: 'El cliente redujo el plazo de 45 a 30 días. Esto es favorable para TW.',
            accion: 'Puedes registrar con observación — es un cambio a favor.',
            recomendado: true,
          },
          {
            campo: 'concepto_repuestos',
            titulo: 'Ajuste de precio en repuestos',
            explicacion: 'El lote de repuestos subió S/ 200 (+5%). Puede ser un repuesto adicional.',
            accion: 'Confirma el detalle con el cliente antes de validar completo.',
            recomendado: false,
          },
        ],
        confianza: 0.91,
        motor: 'gemini-2.5-flash (MOCK)',
      },
    ],
  };
}

// ─── RESULTADO GUARDAR ───────────────────────────────────────────────────────

export function mockResultadoGuardar(idOcReemplaza?: number | null): ResultadoGuardarOrdenCompraDto {
  return {
    oc: {
      idOc: 1099, numeroOc: 'OC-ANT-99201', estado: 'validada',
      montoTotal: 24_500,
      idOcReemplazada: idOcReemplaza ?? null,
      numeroOcReemplazada: idOcReemplaza ? 'OC-AUTO-000045' : null,
      notificados: 2,
    },
    vinculaciones: [
      {
        idPropuesta: 501, numero: 'PROP-000010', version: 1,
        montoAsignado: 24_500,
        estadoValidacion: 'validada', tipoObservacion: null, resultadoIa: 'ok',
        sugerencia: 'Validación completa. Puede proceder a facturación.',
        coincidencias: 7, advertencias: 0, criticas: 0,
      },
    ],
    nuevasVersiones: [],
    avisoIa: 'OC registrada correctamente. La IA no encontró diferencias críticas.',
  };
}

// ─── OC AUTOGENERADA ─────────────────────────────────────────────────────────

export function mockOcAutogenerada(): OcAutogeneradaDto {
  return {
    idOc: 1098, numeroOc: 'OC-AUTO-000046', estado: 'validada',
    montoTotal: 24_500, idMoneda: 1,
  };
}

// ─── REVALIDACIÓN ────────────────────────────────────────────────────────────

export function mockRevalidacion(): RevalidacionOrdenCompraDto[] {
  return [
    {
      idValidacion: 9001, idPropuesta: 501, numero: 'PROP-000010',
      corrida: 2, resultado: 'ok',
      coincidencias: 7, advertencias: 0, criticas: 0, totalCampos: 7,
      sugerencia: 'Validación OK en la 2da corrida. Puede proceder.',
      fechaValidacion: HOY,
    },
  ];
}

// ─── DETALLE ─────────────────────────────────────────────────────────────────

export function mockDetalle(idOc: number): DetalleOrdenCompraDto {
  return {
    cabecera: {
      idOc, numeroOc: 'OC-ANT-99201', estado: 'validada', estadoVisual: 'validada',
      esAutogenerada: false, pendienteReemplazo: false,
      idCliente: 10, razonSocial: 'Antamina S.A.C.', ruc: '20100030595',
      fechaRegistro: HACE_3D, registradoPor: 'Jazir Chambergo',
      idResponsable: 5, responsable: 'Jazir Chambergo',
      idMoneda: 1, monedaNombre: 'Soles', monedaSimbolo: 'S/', moneda: 'Soles',
      montoOc: 24_500, propuestasVinculadas: 1,
      montoAsignado: 24_500, saldoOc: 0, asignadoPct: 100,
      resultadoIa: 'ok', alertasIa: 0,
      vinculacionesValidadas: 1, vinculacionesObservadas: 0, pendientesCorreccion: 0,
      rucClienteOc: '20100030595', razonSocialOc: 'Antamina S.A.C.',
      numeroPropuestaRef: 'PROP-000010',
      idCondicionPago: 3, condicionPago: '30 días', formaPago: null,
      igvIncluido: true, igvPct: 18, descuentoMonto: null,
      fechaOc: HACE_3D, fechaRecepcion: HACE_3D, vigenciaHasta: null,
      facturaIgualOc: true, referencia: null, observaciones: null,
      conceptos: [
        { descripcion: 'Mantenimiento preventivo balanza A', cantidad: 1, precioUnitario: 8_200, subtotal: 8_200 },
        { descripcion: 'Mantenimiento preventivo balanza B', cantidad: 1, precioUnitario: 8_200, subtotal: 8_200 },
        { descripcion: 'Calibración ISO 10012',               cantidad: 2, precioUnitario: 2_050, subtotal: 4_100 },
        { descripcion: 'Repuestos (lote varios)',             cantidad: 1, precioUnitario: 4_000, subtotal: 4_000 },
      ],
      camposIa: {
        numero_oc: 'OC-ANT-99201',
        fecha_emision: HACE_3D.slice(0, 10),
        id_moneda: '1',
        monto_total: '24500.00',
      },
      camposManuales: [],
      tienePdf: true, nombreArchivoPdf: 'OC-ANT-99201.pdf', tamanoPdfBytes: 234_567, urlPdf: null,
      idMotivoAnulacion: null, motivoAnulacion: null, justificacionAnulacion: null,
      fechaAnulacion: null, anuladoPor: null,
      idExpediente: null, numeroExpediente: null,
      puedeEditar: true, puedeReemplazarPdf: true, puedeSubirCorregida: false,
      puedeAgregarPropuesta: true, puedeRevalidar: true, puedeAnular: true,
      puedeReemplazarAuto: false,
    },
    propuestas: [
      {
        idPropuesta: 501, numero: 'PROP-000010', version: 1,
        estadoPropuesta: 'aceptado', aceptada: true,
        montoPropuesta: 24_500, montoAsignado: 24_500, pctOc: 100, saldoPropuesta: 0,
        idContacto: 70, contacto: 'Carlos Mendoza', cargoContacto: 'Jefe de Compras',
        idRequerimiento: 101, numeroRq: 'RQ-ANT-00321',
        servicios: 4, serviciosDetalle: 'Mantenimiento + Calibración + Repuestos',
        estadoValidacion: 'validada', tipoObservacion: null, resultadoIa: 'ok',
        fechaDecision: HACE_3D,
        idValidacion: 8001, corrida: 1,
        coincidencias: 7, advertencias: 0, criticas: 0, totalCampos: 7,
        sugerencia: 'Validación completa. Puede proceder.',
        dictamen: 'OC coherente con la propuesta aceptada.',
        fechaValidacion: HACE_3D,
        nuevaVersionAceptada: false, facturacionHabilitada: true,
      },
    ],
    diferencias: [],
  };
}

// ─── VALIDACIÓN IA ───────────────────────────────────────────────────────────

export function mockValidacion(idOc: number): ValidacionOrdenCompraDto {
  return {
    cabecera: {
      idOc, numeroOc: 'OC-ANT-99201',
      fechaOc: HACE_3D, razonSocial: 'Antamina S.A.C.', ruc: '20100030595',
      nombreArchivoPdf: 'OC-ANT-99201.pdf', tamanoPdfBytes: 234_567, tienePdf: true,
      idPropuesta: 501, numeroPropuesta: 'PROP-000010', versionPropuesta: 1,
      estadoPropuesta: 'aceptado', fechaAceptacion: HACE_7D, numeroExpediente: null,
      estadoValidacion: 'validada', tipoObservacion: null,
      idValidacion: 8001, corrida: 1, origen: 'automatica',
      resultado: 'ok',
      coincidencias: 7, advertencias: 0, criticas: 0, totalCampos: 7,
      validacionesCorridas: 1,
      dictamen: 'OC coherente con la propuesta aceptada.',
      confianza: 0.94, motor: 'gemini-2.5-flash (MOCK)',
      sugerencia: 'Validación completa. Puede proceder a facturación.',
      fechaValidacion: HACE_3D,
    },
    campos: [
      { idPropuesta: 501, orden: 1, campo: 'razon_social', etiqueta: 'Razón Social', valorOc: 'Antamina S.A.C.', valorPropuesta: 'Antamina S.A.C.', severidad: 'ok', mensaje: 'Coincide' },
      { idPropuesta: 501, orden: 2, campo: 'ruc', etiqueta: 'RUC', valorOc: '20100030595', valorPropuesta: '20100030595', severidad: 'ok', mensaje: 'Coincide' },
      { idPropuesta: 501, orden: 3, campo: 'moneda', etiqueta: 'Moneda', valorOc: 'Soles', valorPropuesta: 'Soles', severidad: 'ok', mensaje: 'Coincide' },
      { idPropuesta: 501, orden: 4, campo: 'monto_total', etiqueta: 'Monto Total', valorOc: 'S/ 24,500.00', valorPropuesta: 'S/ 24,500.00', severidad: 'ok', mensaje: 'Coincide' },
      { idPropuesta: 501, orden: 5, campo: 'condicion_pago', etiqueta: 'Condición de Pago', valorOc: '30 días', valorPropuesta: '30 días', severidad: 'ok', mensaje: 'Coincide' },
      { idPropuesta: 501, orden: 6, campo: 'igv', etiqueta: 'IGV', valorOc: '18% (incluido)', valorPropuesta: '18% (incluido)', severidad: 'ok', mensaje: 'Coincide' },
      { idPropuesta: 501, orden: 7, campo: 'conceptos', etiqueta: 'Conceptos', valorOc: '4 ítems', valorPropuesta: '4 ítems', severidad: 'ok', mensaje: 'Coincide' },
    ],
    conceptos: [
      { descripcion: 'Mantenimiento preventivo balanza A', montoOc: 8_200, montoPropuesta: 8_200, estado: 'coincide' },
      { descripcion: 'Mantenimiento preventivo balanza B', montoOc: 8_200, montoPropuesta: 8_200, estado: 'coincide' },
      { descripcion: 'Calibración ISO 10012',               montoOc: 4_100, montoPropuesta: 4_100, estado: 'coincide' },
      { descripcion: 'Repuestos (lote varios)',             montoOc: 4_000, montoPropuesta: 4_000, estado: 'coincide' },
    ],
    insights: [
      {
        campo: null,
        titulo: 'Validación completa',
        explicacion: 'La OC coincide 100% con la propuesta aceptada. No hay diferencias.',
        accion: 'Puedes proceder con la facturación.',
        recomendado: true,
      },
    ],
    historial: [
      {
        fecha: HACE_3D, tipo: 'validacion_automatica',
        titulo: 'Validación automática al registrar',
        descripcion: 'IA detectó 7 coincidencias, 0 advertencias, 0 críticas.',
        resultado: 'ok', coincidencias: 7, advertencias: 0, criticas: 0,
        usuario: 'Sistema IA',
      },
    ],
    propuestas: [
      {
        idPropuesta: 501, numero: 'PROP-000010', version: 1,
        resultadoIa: 'ok', estadoValidacion: 'validada', seleccionada: true,
      },
    ],
  };
}

// ─── TIMELINE ────────────────────────────────────────────────────────────────

export function mockTimeline(idOc: number): TimelineOrdenCompraDto {
  return {
    cabecera: {
      idOc, numeroOc: 'OC-ANT-99201',
      estado: 'validada', estadoVisual: 'validada',
      esAutogenerada: false,
      idCliente: 10, razonSocial: 'Antamina S.A.C.', ruc: '20100030595',
      idPropuesta: 501, numeroPropuesta: 'PROP-000010', versionPropuesta: 1,
      generadoEn: HOY, generadoPor: 'Jazir Chambergo',
    },
    eventos: [
      {
        idEvento: 1, fecha: HACE_3D,
        accion: 'registrar_oc',
        titulo: 'OC registrada',
        descripcion: 'Comercial subió el PDF y registró la OC con la propuesta vinculada.',
        categoria: 'comercial', nivel: 'info',
        estadoAnterior: null, estadoNuevo: 'recibida',
        idUsuario: 5, usuario: 'Jazir Chambergo', area: 'Comercial', rol: 'Comercial',
        automaticoIa: false,
      },
      {
        idEvento: 2, fecha: HACE_3D,
        accion: 'extraccion_ia',
        titulo: 'IA extrajo datos del PDF',
        descripcion: 'Gemini leyó el PDF con 94% de confianza. 6 campos clave extraídos.',
        categoria: 'documental', nivel: 'info',
        idUsuario: null, usuario: 'Sistema IA', area: 'Sistema', rol: 'IA',
        automaticoIa: true,
      },
      {
        idEvento: 3, fecha: HACE_3D,
        accion: 'validacion_automatica',
        titulo: 'Validación automática ejecutada',
        descripcion: '7 coincidencias, 0 advertencias, 0 críticas. Resultado: OK.',
        categoria: 'validacion_ia', nivel: 'exito',
        estadoAnterior: 'recibida', estadoNuevo: 'validada',
        idUsuario: null, usuario: 'Sistema IA', area: 'Sistema', rol: 'IA',
        automaticoIa: true,
      },
      {
        idEvento: 4, fecha: HACE_3D,
        accion: 'notificar_responsables',
        titulo: 'Notificación enviada',
        descripcion: '2 responsables notificados por correo del registro de la OC.',
        categoria: 'comercial', nivel: 'neutro',
        idUsuario: null, usuario: 'Sistema', area: 'Sistema', rol: 'Sistema',
        automaticoIa: false,
      },
      {
        idEvento: 5, fecha: AYER,
        accion: 'revalidar',
        titulo: 'Re-validación manual',
        descripcion: 'El comercial solicitó una nueva corrida de validación IA.',
        categoria: 'validacion_ia', nivel: 'info',
        idUsuario: 5, usuario: 'Jazir Chambergo', area: 'Comercial', rol: 'Comercial',
        automaticoIa: false,
      },
    ],
  };
}

// ─── PREPARACIÓN ANULACIÓN ───────────────────────────────────────────────────

export function mockPreparacionAnulacion(idOc: number): PreparacionAnulacionOcDto {
  return {
    impacto: {
      idOc, numeroOc: 'OC-ANT-99201', esAutogenerada: false,
      razonSocial: 'Antamina S.A.C.',
      idMoneda: 1, monedaSimbolo: 'S/',
      montoOc: 24_500, montoAsignado: 24_500,
      propuestasVinculadas: 1, osEnEjecucion: 0,
      impactoCritico: false, fechaServidor: HOY,
    },
    propuestas: [
      {
        idPropuesta: 501, numero: 'PROP-000010', version: 1,
        montoAsignado: 24_500, estadoValidacion: 'validada',
        saldoActual: 0, saldoDespues: 24_500,
      },
    ],
    ordenesServicio: [],
    motivos: [
      { id: 1, nombre: 'Cliente canceló la OC' },
      { id: 2, nombre: 'Error en el documento' },
      { id: 3, nombre: 'OC duplicada' },
      { id: 4, nombre: 'OC reemplazada por nueva versión' },
      { id: 5, nombre: 'Otro' },
    ],
  };
}

// ─── ANULACIÓN ───────────────────────────────────────────────────────────────

export function mockAnulacion(idOc: number): AnulacionOrdenCompraDto {
  return {
    idOc, numeroOc: 'OC-ANT-99201', estado: 'anulada',
    fechaAnulacion: HOY,
    motivo: 'Cliente canceló la OC',
    justificacion: 'El cliente solicitó anulación por cambio en el alcance del trabajo.',
    propuestas: [
      {
        idPropuesta: 501, numero: 'PROP-000010', version: 1,
        montoAsignado: 24_500, saldo: 24_500,
      },
    ],
  };
}
