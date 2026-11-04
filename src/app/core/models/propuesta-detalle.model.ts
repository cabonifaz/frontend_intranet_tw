// Modelo del state de la propuesta en edición. Compartido entre el shell y las 9
// secciones vía PropuestaDraftService.


// ─── Línea de ítem en la propuesta (secciones 2 Propuesta y 3 Opcionales) ────
export interface LineaItemPropuesta {
  idSuministro:    number;
  descripcion:     string;
  alcance:         string;
  ptosCalibracion: string;
  cantidad:        number;
  frecuencia:      number;
  precioUnitario:  number;
  descuentoPct:    number;
}

// ─── Bloque jerárquico (secciones 4 Detalle, 5 Recomendaciones, 7 Suministros,
//     8 Condiciones). Cada grupo tiene un título y una lista de viñetas. ──────
export interface GrupoBloque {
  id:        string;
  titulo:    string;
  vinetas:   { id: string; texto: string }[];
}

// ─── Cuota de pago (sección 6) ────────────────────────────────────────────────
export interface CuotaPago {
  id:         string;
  porcentaje: number;
  descripcion: string;
}

// ─── Equipo del cliente vinculado (sección 9) ────────────────────────────────
export interface EquipoVinculado {
  idEquipo:    number;
  numSerie:    string;
  codigoTw:    string;
  local:       string;    // sede
  tipo:        string;
  subtipo:     string;
  marca:       string;
  modelo:      string;
  esNuevo:     boolean;   // true si fue creado por importación XLS o manualmente
  /** Observación 21 (31/10, fix 2026-11-03): estado real del equipo en el
   *  maestro. En BD solo existen `Activo` o `Inactivo`. El chip "Nuevo" es
   *  una marca adicional del front para equipos creados recién en esta
   *  importación XLS (no es un estado del maestro). */
  estado?:     string | null;
}

// ─── Estado completo de la propuesta en edición ──────────────────────────────
export interface PropuestaDraft {
  // Identificación
  idPropuesta:         number | null;    // null = nueva
  codigo:              string;           // PROP-002581 (asignado al guardar)
  version:             string;           // v1, v2, v3
  esNuevaVersion:      boolean;          // true si se creó como versión de una existente
  idRequerimiento:     number | null;
  codigoRequerimiento: string | null;

  // Estado y edición
  estado:              string;          // 'borrador' | 'pendiente' | 'por_vb' | ...
  esEditable:          boolean;         // false → UI en modo solo-lectura

  // Campos de carátula adicionales (Fase 2b)
  referencia:          string;
  introduccion:        string;
  notasGenerales:      string;

  // Descuentos globales (Fase 2c)
  descuentoPct:        number | null;   // % de descuento sobre subtotal propuesta
  descuentoMonto:      number | null;   // Monto fijo (si no se usa pct)
  idMotivoDescuento:   number | null;
  descuentoOpcionales:         number | null;
  // Migración 48 — paralelo al descuento principal pero para el bloque de opcionales
  descuentoOpcionalesPct:      number | null;
  idMotivoDescuentoOpcionales: number | null;
  totalOpcionales:             number | null;

  // Datos del cliente (readonly, vienen del RQ)
  idCliente:    number | null;
  razonSocial:  string;
  ruc:          string;
  contacto:     string;
  /** Observación 11 (31/10): id del contacto elegido para "Dirigido a" (dropdown de contactos del cliente). */
  idContacto:   number | null;
  correoContacto: string | null;
  // Observaciones 31/10: datos heredados del RQ que condicionan opciones del wizard.
  /** El RQ marcó "Proyecto entra al sistema de acreditación" (observación 8/10). */
  esAcreditacionRq:       boolean;
  /** Condición de pago habitual del cliente para precargar la Forma de pago (observación 20). */
  condicionPagoClienteRq: string | null;
  condicionPagoCodigoRq:  string | null;

  // 1 - Configuración
  seccionesIncluidas: {
    configuracion:        boolean;
    propuesta:            boolean;
    opcionales:           boolean;
    detalle:              boolean;
    recomendaciones:      boolean;
    formaPago:            boolean;
    suministrosCliente:   boolean;
    condicionesServicio:  boolean;
    listadoEquipos:       boolean;
  };
  // Observación 10 (31/10): tipo de propuesta ahora viene del catálogo TIPO_PROPUESTA (106).
  // Se guarda el nombre (String1) del catálogo para que el back lo persista como tipo_servicio.
  tipoPropuesta:       string;
  responsableTecnico:  string;
  requiereTercerizacion: boolean;
  /** Observación 15 (31/10): el tercerizado ahora se busca del maestro de clientes.
   *  Si el usuario selecciona uno, se guarda su id; si decide ingresarlo manualmente
   *  (cliente "nuevo al vuelo"), el id queda en `null` y los otros campos van sueltos. */
  idClienteTercero:    number | null;
  terceroEmpresa:      string;
  terceroRuc:          string;
  terceroDireccion:    string;

  // 2 - Propuesta (ítems comerciales)
  lineasPropuesta:  LineaItemPropuesta[];

  // 3 - Opcionales
  lineasOpcionales: LineaItemPropuesta[];

  // 4 - Detalle (textos base como bloques jerárquicos)
  bloquesDetalle:  GrupoBloque[];

  // 5 - Recomendaciones
  bloquesRecomendaciones: GrupoBloque[];

  // 6 - Forma de Pago
  tipoMoneda:         string;      // PEN, USD
  tipoCambio:         number;
  garantiaEquipos:    number;      // meses
  plazoEntrega:       number;      // días
  plazoEntregaUnidad: 'habiles' | 'calendario';
  validezOferta:      number;      // días calendario
  igvDesagregado:     boolean;
  cuotas:             CuotaPago[];

  // 7 - Suministros del Cliente
  bloquesSuministrosCliente: GrupoBloque[];

  // 8 - Condiciones del Servicio
  clausulasContrato: { id: string; titulo?: string; texto: string }[];

  // 9 - Listado de Equipos vinculados
  equiposVinculados: EquipoVinculado[];

  // Metadatos
  ultimaModificacion: string;      // ISO datetime
}

// ─── Factory ─────────────────────────────────────────────────────────────────
export function crearDraftVacio(): PropuestaDraft {
  return {
    idPropuesta: null,
    codigo: '',
    version: 'v1',
    esNuevaVersion: false,
    idRequerimiento: null,
    codigoRequerimiento: null,
    idCliente: null,
    razonSocial: '',
    ruc: '',
    contacto: '',
    idContacto:   null,
    correoContacto: null,
    esAcreditacionRq:       false,
    condicionPagoClienteRq: null,
    condicionPagoCodigoRq:  null,

    estado:              'borrador',
    esEditable:          true,

    referencia:          '',
    introduccion:        '',
    notasGenerales:      '',

    descuentoPct:        null,
    descuentoMonto:      null,
    idMotivoDescuento:   null,
    descuentoOpcionales:         null,
    descuentoOpcionalesPct:      null,
    idMotivoDescuentoOpcionales: null,
    totalOpcionales:             null,

    seccionesIncluidas: {
      configuracion:        true,
      propuesta:            true,
      opcionales:           true,
      detalle:              true,
      recomendaciones:      true,
      formaPago:            true,
      suministrosCliente:   true,
      condicionesServicio:  true,
      listadoEquipos:       true,
    },
    tipoPropuesta: '',
    responsableTecnico: '',
    requiereTercerizacion: false,
    idClienteTercero: null,
    terceroEmpresa: '',
    terceroRuc: '',
    terceroDireccion: '',

    lineasPropuesta: [],
    lineasOpcionales: [],
    bloquesDetalle: [],
    bloquesRecomendaciones: [],

    tipoMoneda: 'USD',
    tipoCambio: 3.75,
    garantiaEquipos: 12,
    plazoEntrega: 15,
    plazoEntregaUnidad: 'habiles',
    validezOferta: 30,
    igvDesagregado: false,
    cuotas: [],

    bloquesSuministrosCliente: [],
    clausulasContrato: [],
    equiposVinculados: [],

    ultimaModificacion: new Date().toISOString(),
  };
}

// ─── Pasos del wizard (metadata para stepper + routing) ──────────────────────
export interface PasoWizard {
  id:        PasoId;
  numero:    number;
  etiqueta:  string;
  ruta:      string;        // segmento de la URL
}

export type PasoId =
  | 'configuracion'
  | 'propuesta'
  | 'opcionales'
  | 'detalle'
  | 'recomendaciones'
  | 'forma-pago'
  | 'suministros-cliente'
  | 'condiciones'
  | 'listado-equipos';

export const PASOS_WIZARD: PasoWizard[] = [
  { id: 'configuracion',       numero: 1, etiqueta: 'Configuración',       ruta: 'configuracion'       },
  { id: 'propuesta',           numero: 2, etiqueta: 'Propuesta',           ruta: 'propuesta'           },
  { id: 'opcionales',          numero: 3, etiqueta: 'Opcionales',          ruta: 'opcionales'          },
  { id: 'detalle',             numero: 4, etiqueta: 'Detalle',             ruta: 'detalle'             },
  { id: 'recomendaciones',     numero: 5, etiqueta: 'Recomendaciones',     ruta: 'recomendaciones'     },
  { id: 'forma-pago',          numero: 6, etiqueta: 'Forma de Pago',       ruta: 'forma-pago'          },
  { id: 'suministros-cliente', numero: 7, etiqueta: 'Suministros Cliente', ruta: 'suministros-cliente' },
  { id: 'condiciones',         numero: 8, etiqueta: 'Condiciones',         ruta: 'condiciones'         },
  { id: 'listado-equipos',     numero: 9, etiqueta: 'Listado de Equipos',  ruta: 'listado-equipos'     },
];
