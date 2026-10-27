import {
  BandejaOrdenesServicio,
  ContactoClienteOs,
  DetalleOrdenServicio,
  FiltrosBandejaOrdenesServicio,
  ItemBandejaOrdenServicio,
  OpcionFiltro,
  PreparacionNuevaOs,
  PropuestaDisponibleOs,
  ResultadoGuardarOrdenServicio,
  TarjetasOrdenesServicio,
} from '../models/ordenes-servicio.model';

// ─── Mock de propuestas aceptadas disponibles para generar OS/OM ───────────
export const MOCK_PROPUESTAS_DISPONIBLES_OS: PropuestaDisponibleOs[] = [
  {
    idPropuesta: 45, numero: 'PRO-0045-2026', version: 3,
    razonSocial: 'Agroindustrial del Norte S.A.C.', ruc: '20100005512',
    idRequerimiento: 190, numeroRequerimiento: 'RQ-2026-0190',
    tipoServicio: 'Metrología & Pesaje', tipoOrden: 'OM',
    fechaAceptacion: '2026-09-13', comercial: 'Diego Gastelo',
    cantidadEquipos: 19, cantidadConceptos: 2,
  },
  {
    idPropuesta: 692, numero: 'PRO-0692-2026', version: 2,
    razonSocial: 'Compañía Minera Antamina S.A.', ruc: '20338262428',
    idRequerimiento: 6367, numeroRequerimiento: 'RQ-6367-2026',
    tipoServicio: 'Calibración', tipoOrden: 'OS',
    fechaAceptacion: '2026-10-01', comercial: 'María Vargas',
    cantidadEquipos: 7, cantidadConceptos: 2,
  },
  {
    idPropuesta: 878, numero: 'PRO-0878-2026', version: 1,
    razonSocial: 'Corporación Minera MLPO', ruc: '20100099999',
    idRequerimiento: 720, numeroRequerimiento: 'RQ-2026-0720',
    tipoServicio: 'Mantenimiento preventivo', tipoOrden: 'OS',
    fechaAceptacion: '2026-10-03', comercial: 'Diego Gastelo',
    cantidadEquipos: 15, cantidadConceptos: 3,
  },
  {
    idPropuesta: 620, numero: 'PRO-0620-2026', version: 1,
    razonSocial: 'Hudbay Perú S.A.C.', ruc: '20100088888',
    idRequerimiento: 510, numeroRequerimiento: 'RQ-2026-0510',
    tipoServicio: 'Verificación metrológica', tipoOrden: 'OM',
    fechaAceptacion: '2026-10-02', comercial: 'Ana Torres',
    cantidadEquipos: 6, cantidadConceptos: 1,
    intentosPrevios: 1,
  },
];

/**
 * Mocks del detalle de OS/OM mientras el endpoint real del back no exista.
 * Cuando se implemente `GET /api/crm/ordenes-servicio/{id}`, borrar este archivo.
 */

// OS-000791 — EN EJECUCIÓN (coincide con el prototipo del cliente)
const OS_000791: DetalleOrdenServicio = {
  idOs:                   791,
  tipo:                   'OS',
  numero:                 'OS-000791',
  estado:                 'en_ejecucion',
  estadoGrupo:            'en_ejecucion',
  estadoLabel:            'En Ejecución',
  idExpediente:           301,
  responsable:            'María Vargas',
  idResponsable:          11,
  puedeSolicitarEdicion:  false,
  puedeResolverSolicitud: false,
  puedeEditar:            false,
  puedeAnular:            false,
  solicitudPendiente:     null,

  datosGenerales: {
    numero:                'OS-000791',
    tipo:                  'OS',
    tipoLabel:             'OS (Orden de Servicio)',
    fechaEmision:          '2026-10-12',
    fechaProgramadaDesde:  '2026-05-24',
    fechaProgramadaHasta:  '2026-05-26',
    diasHabilesEstimados:  3,
    razonSocial:           'Compañía Minera Antamina S.A.',
    ruc:                   '20338262428',
    direccionOperaciones:  'Av. Mariscal La Mar 1234, Lima',
    contactoPlanta:        'Ing. Roberto Carlos Mendoza',
    comercialResponsable:  'María Vargas',
    numeroRequerimiento:   'RQ-6367-2026',
    idRequerimiento:       6367,
  },

  avancePorEquipos: {
    totalEquipos:     7,
    ejecutados:       1,
    porcentaje:       14,
    actualizadoDesde: 'Módulo 11 Ejecución',
    descripcion:      'Progreso en tiempo real de calibración e inspección técnica en terreno',
    equipos: [
      {
        idEquipo:        9001,
        codigoTw:        'GAL-ECJ5-LB-006',
        descripcion:     'GAL-ECJ5-LB-006 · LOMA LCW-6000',
        estado:          'ejecutado',
        estadoLabel:     'Ejecutado',
        fechaEjecucion:  '2026-05-24T09:15',
      },
      { idEquipo: 9002, codigoTw: 'GAL-ELAB-LB-008', descripcion: 'GAL-ELAB-LB-008 · OHAUS PR4202/E', estado: 'en_proceso', estadoLabel: 'En Proceso', fechaEjecucion: null },
      { idEquipo: 9003, codigoTw: 'INS-POS1-LB-006', descripcion: 'INS-POS1-LB-006 · METTLER TOLEDO ME802', estado: 'pendiente', estadoLabel: 'Pendiente', fechaEjecucion: null },
      { idEquipo: 9004, codigoTw: 'INS-CALI-LB-003', descripcion: 'INS-CALI-LB-003 · METTLER TOLEDO HE73/01', estado: 'pendiente', estadoLabel: 'Pendiente', fechaEjecucion: null },
      { idEquipo: 9005, codigoTw: 'GAL-INS-LB-003',  descripcion: 'GAL-INS-LB-003 · Sartorius MA35M-000230V1', estado: 'pendiente', estadoLabel: 'Pendiente', fechaEjecucion: null },
      { idEquipo: 9006, codigoTw: 'GAL-ECJ2-LB-002', descripcion: 'GAL-ECJ2-LB-002 · ISHIDA DACS-G-S150-48', estado: 'pendiente', estadoLabel: 'Pendiente', fechaEjecucion: null },
      { idEquipo: 9007, codigoTw: 'GAL-BAL-004',     descripcion: 'GAL-BAL-004 · Precisa XB220A',          estado: 'observado',  estadoLabel: 'Observado',  fechaEjecucion: null },
    ],
  },

  propuestaOrigen: {
    idPropuesta:              692,
    codigo:                   'PRO-0692-2026',
    version:                  2,
    estado:                   'aceptada',
    estadoLabel:              'Aceptada',
    tipoServicio:             'Metrología & Pesaje',
    fechaAceptacion:          '2026-09-13',
    comercial:                'María Vargas',
    aprobadorVb:              'Carlos Chávez',
    montoTotal:               12450.00,
    moneda:                   'PEN',
    cantidadEquiposCotizados:   7,
    cantidadConceptosCotizados: 2,
    condicionPago:            'Crédito 30 días',
  },

  equipos: [
    {
      item: 1, idEquipo: 9001, clasificacion: 'equipo', clasificacionLabel: 'Equipo',
      marca: 'LOMA', modelo: 'LCW-6000', numSerie: 'LCW-6000-19908',
      codigoTw: 'GAL-ECJ5-LB-006', alcance: '20 000 g', ubicacion: 'Bañado de galleta',
      conceptosAplicados: ['SRV-CAL-001'],
      d: '0,1 g', e: '1 g', clase: 'III',
    },
    {
      item: 2, idEquipo: 9002, clasificacion: 'equipo', clasificacionLabel: 'Equipo',
      marca: 'OHAUS', modelo: 'PR4202/E', numSerie: 'C447117584',
      codigoTw: 'GAL-ELAB-LB-008', alcance: '4 200 g', ubicacion: 'Elaboración — Horno',
      conceptosAplicados: ['SRV-CAL-001'],
      d: '0,01 g', e: '0,1 g', clase: 'II',
    },
    {
      item: 3, idEquipo: 9003, clasificacion: 'equipo', clasificacionLabel: 'Equipo',
      marca: 'METTLER TOLEDO', modelo: 'ME802', numSerie: 'B743854235',
      codigoTw: 'INS-POS1-LB-006', alcance: '820 g', ubicacion: 'Envasado P1',
      conceptosAplicados: ['SRV-CAL-001', 'SRV-CAL-002'],
      d: '0,01 g', e: '0,1 g', clase: 'II',
    },
    {
      item: 4, idEquipo: 9004, clasificacion: 'instrumento', clasificacionLabel: 'Instrumento',
      marca: 'METTLER TOLEDO', modelo: 'HE73/01', numSerie: 'C116563346',
      codigoTw: 'INS-CALI-LB-003', alcance: '71 g', ubicacion: 'Laboratorio',
      conceptosAplicados: ['SRV-CAL-002'],
      escala: '95 °C y 105 °C', puntosCalibracion: '2 puntos',
    },
    {
      item: 5, idEquipo: 9005, clasificacion: 'instrumento', clasificacionLabel: 'Instrumento',
      marca: 'Sartorius', modelo: 'MA35M-000230V1', numSerie: '24284414',
      codigoTw: 'GAL-INS-LB-003', alcance: '35 g', ubicacion: 'Lab instantáneo',
      conceptosAplicados: ['SRV-CAL-002'],
      escala: '50 °C — 120 °C', puntosCalibracion: '3 puntos',
    },
    {
      item: 6, idEquipo: 9006, clasificacion: 'equipo', clasificacionLabel: 'Equipo',
      marca: 'ISHIDA', modelo: 'DACS-G-S150-48', numSerie: '881343',
      codigoTw: 'GAL-ECJ2-LB-002', alcance: '15 000 g', ubicacion: 'Línea 2 encajado',
      conceptosAplicados: ['SRV-CAL-001'],
      d: '0,1 g', e: '1 g', clase: 'III',
    },
    {
      item: 7, idEquipo: 9007, clasificacion: 'equipo', clasificacionLabel: 'Equipo',
      marca: 'Precisa', modelo: 'XB220A', numSerie: 'XB220A-9031',
      codigoTw: 'GAL-BAL-004', alcance: '220 g', ubicacion: 'Bodega secundaria',
      conceptosAplicados: [],
      d: '0,0001 g', e: '0,001 g', clase: 'I',
    },
  ],

  conceptos: [
    {
      idConcepto: 1, codigo: 'SRV-CAL-001',
      descripcion: 'Servicio de Calibración de Balanzas y Sistemas de Pesaje',
      clasificacion: 'Calibración',
      equiposAplicados: ['GAL-ECJ5-LB-006', 'INS-POS1-LB-006', 'GAL-ELAB-LB-008', 'GAL-ECJ2-LB-002'],
    },
    {
      idConcepto: 2, codigo: 'SRV-CAL-002',
      descripcion: 'Servicio de Calibración de Determinadoras de Humedad',
      clasificacion: 'Calibración',
      equiposAplicados: ['INS-POS1-LB-006', 'INS-CALI-LB-003', 'GAL-INS-LB-003'],
    },
  ],

  observaciones: 'Metróloga deberá coordinarse con el jefe de planta antes de iniciar la calibración. Los equipos deben estar vacíos y limpios al momento de la intervención.',

  programacion: {
    tieneProgramacion:  true,
    idProgramacion:     401,
    tecnicoAsignado:    'Luis Martínez',
    fechaReal:          '2026-05-24',
    horaInicio:         '08:00',
    horaFin:            '12:00',
    estadoPreparacion:  'Listo',
    viaticosAsignados:  350.00,
    moneda:             'PEN',
  },

  ultimaActualizacion:        '2026-05-24T13:08',
  usuarioUltimaActualizacion: 'Sistema',
  fuenteUltimaActualizacion:  'Sistema (ejecución)',
};

// OS-000792 — EMITIDA (recién creada, sin avance aún)
const OS_000792: DetalleOrdenServicio = {
  ...OS_000791,
  idOs:        792,
  numero:      'OS-000792',
  estado:      'emitida',
  estadoGrupo: 'emitida',
  estadoLabel: 'Emitida',
  puedeSolicitarEdicion: true,
  puedeAnular:           true,
  datosGenerales: {
    ...OS_000791.datosGenerales,
    numero:               'OS-000792',
    razonSocial:          'Agroindustria del Norte SAC',
    ruc:                  '20100005512',
    direccionOperaciones: 'Av. Argentina 4793, Callao',
    contactoPlanta:       'Ing. Juan Pérez (Gerente de Logística)',
    comercialResponsable: 'Diego Gastelo',
    numeroRequerimiento:  'RQ-2026-0190',
    idRequerimiento:      190,
    fechaEmision:         '2026-10-17',
  },
  avancePorEquipos: {
    ...OS_000791.avancePorEquipos,
    totalEquipos: 19,
    ejecutados:   0,
    porcentaje:   0,
    equipos:      OS_000791.avancePorEquipos.equipos.map(e => ({ ...e, estado: 'pendiente', estadoLabel: 'Pendiente', fechaEjecucion: null })),
  },
  programacion: {
    tieneProgramacion: false,
  },
  ultimaActualizacion:        '2026-10-17T15:40',
  usuarioUltimaActualizacion: 'Diego Gastelo',
  fuenteUltimaActualizacion:  'Comercial',
};

// OM-001882 — PROGRAMADA
const OM_001882: DetalleOrdenServicio = {
  ...OS_000791,
  idOs:        1882,
  numero:      'OM-001882',
  tipo:        'OM',
  estado:      'programada',
  estadoGrupo: 'programada',
  estadoLabel: 'Programada',
  puedeSolicitarEdicion: false,
  puedeAnular:           false,
  datosGenerales: {
    ...OS_000791.datosGenerales,
    numero:                'OM-001882',
    tipo:                  'OM',
    tipoLabel:             'OM (Orden de Metrología)',
    fechaProgramadaDesde:  null,
    fechaProgramadaHasta:  null,
    diasHabilesEstimados:  null,
    razonSocial:           'Alicorp S.A.A.',
    ruc:                   '20100055237',
    comercialResponsable:  'Diego Gastelo',
    numeroRequerimiento:   'RQ-2026-1302',
    idRequerimiento:       1302,
  },
  datosCertificado: {
    esTercerizado: false,
    razonSocial:   'Alicorp S.A.A.',
    ruc:           '20100055237',
    direccion:     'Av. Argentina 4793, Callao',
    contacto:      'Ing. Juan Pérez',
  },
};

export const MOCK_DETALLES_OS: Record<number, DetalleOrdenServicio> = {
  0:    OS_000791,
  791:  OS_000791,
  792:  OS_000792,
  1882: OM_001882,
};

// ─── Mock de preparación para "Nueva OS/OM" (HU-40) ────────────────────────
const CONTACTOS_AGROIND: ContactoClienteOs[] = [
  { idContacto: 1, nombre: 'Juan Pérez',   cargo: 'Gerente de Logística',   esPrincipal: true  },
  { idContacto: 2, nombre: 'María López',  cargo: 'Jefa de Operaciones',    esPrincipal: false },
  { idContacto: 3, nombre: 'Luis Chávez',  cargo: 'Encargado de Compras',   esPrincipal: false },
];

const CONTACTOS_ANTAMINA: ContactoClienteOs[] = [
  { idContacto: 11, nombre: 'Roberto Mendoza', cargo: 'Jefe de Planta',   esPrincipal: true  },
  { idContacto: 12, nombre: 'Carla Vásquez',   cargo: 'Metróloga Senior', esPrincipal: false },
];

export const MOCK_PREPARACIONES_NUEVA_OS: Record<number, PreparacionNuevaOs> = {
  // Propuesta 45 → AGROINDUSTRIAL DEL NORTE (OM)
  45: {
    numeroSugerido:        'OM-00000793 (sugerido)',
    tipo:                  'OM',
    tipoLabel:             'OM (Orden de Metrología)',
    fechaEmision:          new Date().toISOString().slice(0, 10),
    idCliente:             1,
    razonSocial:           'Agroindustrial del Norte S.A.C.',
    ruc:                   '20100005512',
    direccionOperaciones:  'Av. Argentina 4793, Callao',
    contactos:             CONTACTOS_AGROIND,
    idContactoDefault:     1,
    idResponsable:         10,
    nombreResponsable:     'Diego Gastelo',
    propuestaOrigen: {
      idPropuesta:              45, codigo: 'PRO-0045-2026', version: 3,
      estado: 'aceptada', estadoLabel: 'Aceptada',
      tipoServicio: 'Metrología & Pesaje',
      fechaAceptacion: '2026-09-13',
      comercial: 'Diego Gastelo', aprobadorVb: 'Carlos Chávez',
      montoTotal: 12450.00, moneda: 'PEN',
      cantidadEquiposCotizados: 19, cantidadConceptosCotizados: 2,
      condicionPago: 'Crédito 30 días',
    },
    idRequerimiento:       190,
    numeroRequerimiento:   'RQ-2026-0190',
    rqEsTercerizado:       false,
    datosCertificadoDefault: {
      esTercerizado: false,
      razonSocial:   'Agroindustrial del Norte S.A.C.',
      ruc:           '20100005512',
      direccion:     'Av. Argentina 4793, Callao',
      contacto:      'Juan Pérez',
    },
    conceptosSugeridos:    [],
    equiposSugeridos:      [],
  },

  // Propuesta 692 → ANTAMINA (OS)
  692: {
    numeroSugerido:        'OS-00000793 (sugerido)',
    tipo:                  'OS',
    tipoLabel:             'OS (Orden de Servicio)',
    fechaEmision:          new Date().toISOString().slice(0, 10),
    idCliente:             3,
    razonSocial:           'Compañía Minera Antamina S.A.',
    ruc:                   '20338262428',
    direccionOperaciones:  'Av. Mariscal La Mar 1234, Lima',
    contactos:             CONTACTOS_ANTAMINA,
    idContactoDefault:     11,
    idResponsable:         11,
    nombreResponsable:     'María Vargas',
    propuestaOrigen: {
      idPropuesta:              692, codigo: 'PRO-0692-2026', version: 2,
      estado: 'aceptada', estadoLabel: 'Aceptada',
      tipoServicio: 'Calibración',
      fechaAceptacion: '2026-10-01',
      comercial: 'María Vargas', aprobadorVb: 'Carlos Chávez',
      montoTotal: 8900.00, moneda: 'USD',
      cantidadEquiposCotizados: 7, cantidadConceptosCotizados: 2,
      condicionPago: 'Contado',
    },
    idRequerimiento:       6367,
    numeroRequerimiento:   'RQ-6367-2026',
    conceptosSugeridos:    [],
    equiposSugeridos:      [],
  },
};

export const MOCK_RESULTADO_GUARDAR_OS: ResultadoGuardarOrdenServicio = {
  idOs:    792,
  numero:  'OS-000792',
  estado:  'borrador',
  emitida: false,
};

// ─── HU-40 Fase C mocks ────────────────────────────────────────────────────
export const MOCK_MOTIVOS_EDICION_OS = [
  { idMotivo: 1, codigo: 'equipos',       label: 'Agregar o quitar equipos' },
  { idMotivo: 2, codigo: 'conceptos',     label: 'Modificar conceptos del servicio' },
  { idMotivo: 3, codigo: 'fechas',        label: 'Cambiar fecha programada' },
  { idMotivo: 4, codigo: 'contacto',      label: 'Cambiar contacto del cliente' },
  { idMotivo: 5, codigo: 'observaciones', label: 'Actualizar observaciones' },
  { idMotivo: 9, codigo: 'otro',          label: 'Otro motivo' },
];

export const MOCK_JEFE_COMERCIAL_OS = {
  idUsuario:  101,
  nombre:     'Carlos Chávez',
  cargo:      'Jefe Comercial',
  sede:       'Sede Lima',
  iniciales:  'CC',
  disponible: true,
};

export const MOCK_MOTIVOS_ANULACION_OS = [
  { idMotivo: 1, codigo: 'disponibilidad_equipos', label: 'Disponibilidad de equipos del cliente' },
];

export function mockImpactoAnulacion(idOs: number) {
  // Para OS-000791 (en ejecución / programada), devuelve impacto. Para el resto, sin programación.
  if (idOs === 791 || idOs === 1882) {
    return {
      tieneProgramacion:  true,
      tecnicoAsignado:    'Luis Martínez',
      fechaLiberacion:    '2026-05-24',
      fechaReservada:     '2026-05-24',
      horaInicio:         '08:00',
      horaFin:            '12:00',
      viaticosLiberados:  350,
      monedaViaticos:     'PEN',
    };
  }
  return { tieneProgramacion: false };
}

// ─── HU-43 mocks: Conceptos del catálogo maestros ──────────────────────────
export const MOCK_CONCEPTOS_CATALOGO = [
  { idSuministro: 1, codigo: 'SRV-CAL-001', descripcion: 'Servicio de Calibración de Balanzas y Sistemas de Pesaje', clasificacion: 'servicio', tipo: 'Mantenimiento y Calibración', subtipo: 'De Plataforma', aplicableA: 'Equipos de pesaje' },
  { idSuministro: 2, codigo: 'SRV-CAL-002', descripcion: 'Servicio de Calibración de Determinadoras de Humedad',       clasificacion: 'servicio', tipo: 'Mantenimiento y Calibración', subtipo: 'Estufa',          aplicableA: 'Instrumentos' },
  { idSuministro: 3, codigo: 'SRV-MANT-001',descripcion: 'Servicio de Mantenimiento Preventivo de Balanzas',           clasificacion: 'servicio', tipo: 'Mantenimiento y Calibración', subtipo: 'Preventivo',       aplicableA: 'Equipos de pesaje' },
  { idSuministro: 4, codigo: 'SRV-MANT-002',descripcion: 'Servicio de Mantenimiento y Ajuste a Sistemas de Pesaje',    clasificacion: 'servicio', tipo: 'Mantenimiento y Calibración', subtipo: 'Ajuste',           aplicableA: 'Equipos de pesaje' },
  { idSuministro: 5, codigo: 'SRV-INS-001', descripcion: 'Servicio de Inspección Técnica de Equipos',                   clasificacion: 'servicio', tipo: 'Inspección Técnica',         subtipo: 'General',          aplicableA: 'Equipos / Instrumentos' },
  { idSuministro: 6, codigo: 'SRV-CAL-003', descripcion: 'Servicio de Calibración de Termómetros',                      clasificacion: 'servicio', tipo: 'Mantenimiento y Calibración', subtipo: 'Termómetros',      aplicableA: 'Instrumentos' },
  { idSuministro: 7, codigo: 'SRV-MANT-003',descripcion: 'Servicio de Mantenimiento Correctivo de Equipos de Pesaje',  clasificacion: 'servicio', tipo: 'Mantenimiento y Calibración', subtipo: 'Correctivo',       aplicableA: 'Equipos de pesaje' },
];

/** Conceptos "de la propuesta origen" (precargados cuando se abre Nueva OS/OM). Son los que vienen cotizados. */
export const MOCK_CONCEPTOS_DE_PROPUESTA: Record<number, number[]> = {
  // idPropuesta → ids de suministros que vienen de la propuesta
  45:  [1, 2],       // Agroindustrial — SRV-CAL-001 + SRV-CAL-002
  692: [1, 3],       // Antamina       — SRV-CAL-001 + SRV-MANT-001
};

/** Equipos "de la propuesta origen" (precargados cuando se abre Nueva OS/OM). */
export const MOCK_EQUIPOS_DE_PROPUESTA: Record<number, number[]> = {
  45:  [1001, 1002, 1004],  // Agroindustrial
  692: [1001, 1004, 1005],  // Antamina
};

// ═══════════════════════════════════════════════════════════════════════════
// HU-41 — Bandeja (mock completo para demo)
// ═══════════════════════════════════════════════════════════════════════════

function mkItemBandeja(
  idOs: number, tipo: 'OS' | 'OM', numero: string,
  estado: 'borrador' | 'emitida' | 'programada' | 'en_ejecucion' | 'finalizada' | 'anulada',
  estadoLabel: string,
  fechaEmision: string | null, emitida: boolean,
  idCliente: number, razonSocial: string, ruc: string,
  idPropuesta: number, numeroPropuesta: string, versionPropuesta: number,
  idRequerimiento: number, numeroRequerimiento: string,
  idResponsable: number, responsable: string,
  numeroEquipos: number, numeroConceptos: number,
  solicitudPendiente = false, edicionAprobada = false,
): ItemBandejaOrdenServicio {
  return {
    idOs, tipo, numero,
    estado, estadoGrupo: estado, estadoLabel,
    fechaEmision, emitida,
    idCliente, razonSocial, ruc,
    idPropuesta, numeroPropuesta, versionPropuesta,
    idExpediente: idOs + 1000,
    idResponsable, responsable,
    numeroEquipos, numeroConceptos,
    solicitudPendiente, idSolicitudPendiente: solicitudPendiente ? idOs * 100 : null,
    edicionAprobada,
    puedeEditar:            estado === 'borrador',
    puedeSolicitarEdicion:  estado === 'emitida' && !solicitudPendiente,
    puedeResolverSolicitud: solicitudPendiente,
    puedeAnular:            estado === 'borrador' || estado === 'emitida',
  };
}

export const MOCK_BANDEJA_ITEMS: ItemBandejaOrdenServicio[] = [
  mkItemBandeja(792,  'OS', 'OS-000792',   'emitida',      'Emitida',       '2026-10-17', true,  1,  'Agroindustrial del Norte S.A.C.',    '20100005512',   45, 'PRO-0045-2026', 3,  190,  'RQ-2026-0190', 10, 'Diego Gastelo', 19, 2, true),
  mkItemBandeja(791,  'OS', 'OS-000791',   'en_ejecucion', 'En Ejecución',  '2026-10-12', true,  3,  'Compañía Minera Antamina S.A.',       '20338262428',  692, 'PRO-0692-2026', 2,  548,  'RQ-6367-2026', 11, 'María Vargas',   7, 2),
  mkItemBandeja(1882, 'OM', 'OM-001882',   'programada',   'Programada',    '2026-10-15', true,  2,  'Alicorp S.A.A.',                      '20100055237', 1402, 'PRO-1402-2026', 1, 1302, 'RQ-2026-1302', 10, 'Diego Gastelo',  8, 1),
  mkItemBandeja(1316, 'OS', 'OS-001316',   'programada',   'Programada',    '2026-10-15', true,  2,  'Alicorp S.A.A.',                      '20100055237', 1402, 'PRO-1402-2026', 1, 1302, 'RQ-2026-1302', 10, 'Diego Gastelo', 12, 1),
  mkItemBandeja(1877, 'OM', 'OM-001877',   'finalizada',   'Finalizada',    '2026-10-10', true,  4,  'Compañía Minera Las Bambas SAC',     '20100020017',  612, 'PRO-0612-2026', 1,  505,  'RQ-2026-0505', 12, 'Carlos Ríos',   12, 1),
  mkItemBandeja(789,  'OS', 'OS-000789',   'finalizada',   'Finalizada',    '2026-10-09', true,  5,  'Southern Peru Copper Corp',           '20100012345',  126, 'PRO-0126-2026', 5,  118,  'RQ-2026-0118', 11, 'María Vargas',   4, 2),
  mkItemBandeja(785,  'OS', 'OS-000785',   'borrador',     'Borrador',      null,         false, 6,  'Corporación Minera MLPO',             '20100099999',  878, 'PRO-0878-2026', 1,  720,  'RQ-2026-0720', 10, 'Diego Gastelo',  0, 3),
  mkItemBandeja(1870, 'OM', 'OM-001870',   'emitida',      'Emitida',       '2026-10-02', true,  7,  'Hudbay Perú S.A.C.',                 '20100088888',  620, 'PRO-0620-2026', 1,  510,  'RQ-2026-0510', 13, 'Ana Torres',     6, 1),
  mkItemBandeja(783,  'OS', 'OS-000783',   'anulada',      'Anulada',       '2026-09-28', true,  8,  'Volcan Compañía Minera',             '20100111222',  512, 'PRO-0512-2026', 1,  415,  'RQ-2026-0415', 11, 'María Vargas',  15, 2),
  mkItemBandeja(780,  'OS', 'OS-000780',   'finalizada',   'Finalizada',    '2026-09-25', true,  1,  'Agroindustrial del Norte S.A.C.',    '20100005512',   40, 'PRO-0040-2026', 1,  180,  'RQ-2026-0180', 10, 'Diego Gastelo',  9, 1),
  mkItemBandeja(778,  'OM', 'OM-001878',   'finalizada',   'Finalizada',    '2026-09-20', true,  2,  'Alicorp S.A.A.',                      '20100055237',   58, 'PRO-0058-2026', 1,  205,  'RQ-2026-0205', 12, 'Carlos Ríos',    5, 1),
  mkItemBandeja(776,  'OS', 'OS-000776',   'anulada',      'Anulada',       '2026-09-18', true,  3,  'Compañía Minera Antamina S.A.',       '20338262428',   74, 'PRO-0074-2026', 2,  220,  'RQ-2026-0220', 11, 'María Vargas',  10, 2),
  mkItemBandeja(774,  'OS', 'OS-000774',   'borrador',     'Borrador',      null,         false, 7,  'Hudbay Perú S.A.C.',                 '20100088888',   83, 'PRO-0083-2026', 1,  235,  'RQ-2026-0235', 13, 'Ana Torres',     0, 2),
  mkItemBandeja(772,  'OS', 'OS-000772',   'programada',   'Programada',    '2026-09-15', true,  5,  'Southern Peru Copper Corp',           '20100012345',   91, 'PRO-0091-2026', 1,  248,  'RQ-2026-0248', 11, 'María Vargas',   8, 1),
  mkItemBandeja(770,  'OM', 'OM-001866',   'emitida',      'Emitida',       '2026-09-12', true,  4,  'Compañía Minera Las Bambas SAC',     '20100020017',  104, 'PRO-0104-2026', 1,  261,  'RQ-2026-0261', 12, 'Carlos Ríos',   11, 1),
];

export const MOCK_TARJETAS_BANDEJA: TarjetasOrdenesServicio = {
  total:            MOCK_BANDEJA_ITEMS.length,
  borradores:       MOCK_BANDEJA_ITEMS.filter(i => i.estado === 'borrador').length,
  emitidas:         MOCK_BANDEJA_ITEMS.filter(i => i.estado === 'emitida').length,
  emitidasSemana:   2,
  programadas:      MOCK_BANDEJA_ITEMS.filter(i => i.estado === 'programada').length,
  enEjecucion:      MOCK_BANDEJA_ITEMS.filter(i => i.estado === 'en_ejecucion').length,
  finalizadas:      MOCK_BANDEJA_ITEMS.filter(i => i.estado === 'finalizada').length,
  finalizadasMes:   3,
  anuladas:         MOCK_BANDEJA_ITEMS.filter(i => i.estado === 'anulada').length,
};

export const MOCK_CLIENTES_FILTRO: OpcionFiltro[] = [
  { id: 1, nombre: 'Agroindustrial del Norte S.A.C.' },
  { id: 2, nombre: 'Alicorp S.A.A.' },
  { id: 3, nombre: 'Compañía Minera Antamina S.A.' },
  { id: 4, nombre: 'Compañía Minera Las Bambas SAC' },
  { id: 5, nombre: 'Southern Peru Copper Corp' },
  { id: 6, nombre: 'Corporación Minera MLPO' },
  { id: 7, nombre: 'Hudbay Perú S.A.C.' },
  { id: 8, nombre: 'Volcan Compañía Minera' },
];

export const MOCK_RESPONSABLES_FILTRO: OpcionFiltro[] = [
  { id: 10, nombre: 'Diego Gastelo' },
  { id: 11, nombre: 'María Vargas' },
  { id: 12, nombre: 'Carlos Ríos' },
  { id: 13, nombre: 'Ana Torres' },
];

export function filtrarBandejaOs(f: FiltrosBandejaOrdenesServicio): BandejaOrdenesServicio {
  let items = [...MOCK_BANDEJA_ITEMS];

  const estado = f.estado as string | undefined;
  const tipo = f.tipo as string | undefined;
  if (estado && estado !== 'todas' && estado !== '')
    items = items.filter(i => i.estadoGrupo === estado);
  if (tipo && tipo !== 'todos' && tipo !== '')
    items = items.filter(i => i.tipo === tipo);
  if (f.idCliente)
    items = items.filter(i => i.idCliente === f.idCliente);
  if (f.idResponsable)
    items = items.filter(i => i.idResponsable === f.idResponsable);
  if (f.fechaDesde)
    items = items.filter(i => !i.fechaEmision || i.fechaEmision >= f.fechaDesde!);
  if (f.fechaHasta)
    items = items.filter(i => !i.fechaEmision || i.fechaEmision <= f.fechaHasta!);
  if (f.busqueda) {
    const q = f.busqueda.toLowerCase();
    items = items.filter(i =>
      i.numero.toLowerCase().includes(q) ||
      (i.numeroPropuesta ?? '').toLowerCase().includes(q) ||
      (i.razonSocial ?? '').toLowerCase().includes(q) ||
      (i.ruc ?? '').includes(q),
    );
  }

  const total     = items.length;
  const pagina    = f.pagina ?? 1;
  const porPagina = f.porPagina ?? 10;
  const inicio    = (pagina - 1) * porPagina;

  return {
    tarjetas:     MOCK_TARJETAS_BANDEJA,
    items:        items.slice(inicio, inicio + porPagina),
    total,
    pagina,
    porPagina,
    clientes:     MOCK_CLIENTES_FILTRO,
    responsables: MOCK_RESPONSABLES_FILTRO,
  };
}

// ─── HU-43 mocks: Equipos del catálogo del cliente ─────────────────────────
export const MOCK_EQUIPOS_CATALOGO_CLIENTE = [
  { idEquipo: 1001, clasificacion: 'equipo'      as const, clasificacionLabel: 'Equipo',      marca: 'LOMA',           modelo: 'LCW-6000',       numSerie: 'LCW-6000-19908', codigoTw: 'GAL-ECJ5-LB-006', alcance: '20 000 g', ubicacion: 'Bañado de galleta',    estado: 'disponible' as const },
  { idEquipo: 1002, clasificacion: 'equipo'      as const, clasificacionLabel: 'Equipo',      marca: 'OHAUS',          modelo: 'PR4202/E',       numSerie: 'C447117584',     codigoTw: 'GAL-ELAB-LB-008', alcance: '4 200 g',  ubicacion: 'Elaboración — Horno',   estado: 'disponible' as const },
  { idEquipo: 1003, clasificacion: 'equipo'      as const, clasificacionLabel: 'Equipo',      marca: 'METTLER TOLEDO', modelo: 'ME802',          numSerie: 'B743854235',     codigoTw: 'INS-POS1-LB-006', alcance: '820 g',    ubicacion: 'Envasado P1',          estado: 'en_otra_os_activa' as const, numeroOsActiva: 'OS-000791' },
  { idEquipo: 1004, clasificacion: 'instrumento' as const, clasificacionLabel: 'Instrumento', marca: 'METTLER TOLEDO', modelo: 'HE73/01',        numSerie: 'C116563346',     codigoTw: 'INS-CALI-LB-003', alcance: '71 g',     ubicacion: 'Laboratorio',          estado: 'disponible' as const },
  { idEquipo: 1005, clasificacion: 'instrumento' as const, clasificacionLabel: 'Instrumento', marca: 'Sartorius',      modelo: 'MA35M-000230V1', numSerie: '24284414',       codigoTw: 'GAL-INS-LB-003',  alcance: '35 g',     ubicacion: 'Lab instantáneo',      estado: 'disponible' as const },
  { idEquipo: 1006, clasificacion: 'equipo'      as const, clasificacionLabel: 'Equipo',      marca: 'ISHIDA',         modelo: 'DACS-G-S150-48', numSerie: '881343',         codigoTw: 'GAL-ECJ2-LB-002', alcance: '15 000 g', ubicacion: 'Línea 2 encajado',     estado: 'disponible' as const },
  { idEquipo: 1007, clasificacion: 'equipo'      as const, clasificacionLabel: 'Equipo',      marca: 'Precisa',        modelo: 'XB220A',         numSerie: 'XB220A-9031',    codigoTw: 'GAL-BAL-004',     alcance: '220 g',    ubicacion: 'Bodega secundaria',    estado: 'disponible' as const },
  { idEquipo: 1008, clasificacion: 'equipo'      as const, clasificacionLabel: 'Equipo',      marca: 'A&D',            modelo: 'GX-800',         numSerie: 'GX-800-001',     codigoTw: 'LAB-CTR-001',     alcance: '800 g',    ubicacion: 'Control de calidad',    estado: 'disponible' as const },
];

// ─── HU-44 mocks: Análisis de importación ───────────────────────────────────
export const MOCK_ANALISIS_IMPORTACION_OS = {
  nombreArchivo:         'alicorp_equipos_conceptos.xlsx',
  totalEquipos:          19,
  totalConceptos:        2,
  totalRelaciones:       20,
  resumenEquiposOk:      17,
  resumenEquiposAdvertencias: 2,
  resumenEquiposErrores: 0,
  conceptos: [
    { codigo: 'SRV-CAL-001', descripcion: 'Servicio de Calibración de Balanzas y Sistemas de Pesaje', estado: 'ok' as const },
    { codigo: 'SRV-CAL-002', descripcion: 'Servicio de Calibración de Determinadoras de Humedad',       estado: 'ok' as const },
  ],
  equipos: [
    { codigoTw: 'GAL-ECJ5-LB-006', tipo: 'equipo' as const,      tipoLabel: 'Equipo',      marca: 'LOMA',           modelo: 'LCW-6000',       numSerie: 'LCW-6000-19908',  ubicacion: 'Bañado de galleta',    conceptosAplicados: ['SRV-CAL-001'], estado: 'ok' as const },
    { codigoTw: 'GAL-ELAB-LB-008', tipo: 'equipo' as const,      tipoLabel: 'Equipo',      marca: 'OHAUS',          modelo: 'PR4202/E',       numSerie: 'C447117584',       ubicacion: 'Elaboración — Horno',   conceptosAplicados: ['SRV-CAL-001'], estado: 'ok' as const },
    { codigoTw: 'INS-POS1-LB-006', tipo: 'equipo' as const,      tipoLabel: 'Equipo',      marca: 'METTLER TOLEDO', modelo: 'ME802',          numSerie: 'B743854235',       ubicacion: 'Envasado P1',          conceptosAplicados: ['SRV-CAL-001'], estado: 'advertencia' as const, mensaje: 'Este equipo forma parte de la OS-000791 (En Ejecución). Se asociará también a esta OS.' },
    { codigoTw: 'INS-CALI-LB-003', tipo: 'instrumento' as const, tipoLabel: 'Instrumento', marca: 'METTLER TOLEDO', modelo: 'HE73/01',        numSerie: 'C116563346',       ubicacion: 'Laboratorio',          conceptosAplicados: ['SRV-CAL-002'], estado: 'ok' as const },
    { codigoTw: 'GAL-INS-LB-003',  tipo: 'instrumento' as const, tipoLabel: 'Instrumento', marca: 'Sartorius',      modelo: 'MA35M-000230V1', numSerie: '24284414',         ubicacion: 'Lab instantáneo',      conceptosAplicados: ['SRV-CAL-002'], estado: 'ok' as const },
    { codigoTw: 'GAL-ECJ2-LB-002', tipo: 'equipo' as const,      tipoLabel: 'Equipo',      marca: 'ISHIDA',         modelo: 'DACS-G-S150-48', numSerie: '881343',           ubicacion: 'Línea 2 encajado',     conceptosAplicados: ['SRV-CAL-001'], estado: 'ok' as const },
    { codigoTw: 'GAL-BAL-004',     tipo: 'equipo' as const,      tipoLabel: 'Equipo',      marca: 'Precisa',        modelo: 'XB220A',         numSerie: 'XB220A-9031',      ubicacion: 'Bodega secundaria',    conceptosAplicados: ['SRV-CAL-001'], estado: 'advertencia' as const, mensaje: 'Equipo con ubicación no verificada por el cliente.' },
    { codigoTw: 'LAB-CTR-001',     tipo: 'equipo' as const,      tipoLabel: 'Equipo',      marca: 'A&D',            modelo: 'GX-800',         numSerie: 'GX-800-001',       ubicacion: 'Control de calidad',    conceptosAplicados: ['SRV-CAL-001'], estado: 'ok' as const },
  ],
};
