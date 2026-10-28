// ═════════════════════════════════════════════════════════════════════════════
// Módulo 9 — Órdenes de Servicio / Metrología (OS/OM) — Sprint 4
// HU-40 (crear/editar/anular), HU-41 (bandeja), HU-42 (modal detalle),
// HU-43 (equipos + conceptos + vinculación), HU-44 (importación Excel).
//
// Contrato espejo del back:
//   TW.Intranet.Aplicacion/Dtos/OrdenServicioDtos.cs
//   SP_ObtenerBandejaOrdenesServicio.sql
// ═════════════════════════════════════════════════════════════════════════════

/** Tipo de orden — determinado por el tipo de servicio heredado de la Propuesta. */
export type TipoOrden = 'OS' | 'OM';

/** Grupo del estado (color del chip en la bandeja). */
export type EstadoGrupoOrdenServicio =
  | 'borrador'
  | 'emitida'
  | 'programada'
  | 'en_ejecucion'
  | 'finalizada'
  | 'anulada';

/** Estado detallado (puede incluir sub-estados operativos del Módulo 8/11). */
export type EstadoOrdenServicio =
  | 'borrador'
  | 'emitida'
  | 'programada'
  | 'reprogramada'
  | 'en_ruta'
  | 'en_ejecucion'
  | 'pausada'
  | 'bloqueada'
  | 'finalizada'
  | 'anulada';

/** Estado de ejecución individual por equipo (viene del Módulo 11 Ejecución). */
export type EstadoEjecucionEquipo = 'pendiente' | 'en_proceso' | 'ejecutado' | 'observado';

// ─── Bandeja (HU-41) — contrato back ─────────────────────────────────────────

/**
 * KPI de la bandeja. Cada tarjeta se calcula aplicando los demás filtros
 * (salvo el de estado); al pulsarla se filtra por su estado.
 */
export interface TarjetasOrdenesServicio {
  total:            number;
  borradores:       number;
  emitidas:         number;
  /** Órdenes emitidas desde el lunes de esta semana ("+N esta semana"). */
  emitidasSemana:   number;
  programadas:      number;
  enEjecucion:      number;
  finalizadas:      number;
  /** Finalizadas este mes. */
  finalizadasMes:   number;
  anuladas:         number;
}

/** Fila de la tabla de la bandeja. */
export interface ItemBandejaOrdenServicio {
  idOs:                   number;
  tipo:                   TipoOrden;
  numero:                 string;                // ej. "OS-000792"
  /** Estado detallado (puede ser sub-estado operativo). */
  estado:                 EstadoOrdenServicio;
  /** Grupo del estado — determina el color del chip. */
  estadoGrupo:            EstadoGrupoOrdenServicio;
  estadoLabel:            string;                // texto humano precalculado por el back
  fechaEmision:           string | null;         // ISO; borrador → fecha de creación
  /** false = la orden aún no fue emitida (o es anterior al módulo). */
  emitida:                boolean;
  idCliente:              number | null;
  razonSocial:            string | null;
  ruc:                    string | null;
  idPropuesta:            number | null;
  numeroPropuesta:        string | null;         // ej. "PRO-0045-2026"
  versionPropuesta:       number | null;
  idRequerimiento:        number | null;
  numeroRequerimiento:    string | null;         // ej. "RQ-0045-2026"
  /** Para abrir los modales reutilizables de Documentos (HU-31) e Historial de Auditoría (HU-32). */
  idExpediente:           number | null;
  idResponsable:          number | null;
  responsable:            string | null;         // "Diego Gastelo"
  numeroEquipos:          number;
  numeroConceptos:        number;
  /** Hay una solicitud de edición esperando al Jefe Comercial. */
  solicitudPendiente:     boolean;
  idSolicitudPendiente:   number | null;
  /** El usuario tiene una solicitud de edición aprobada pendiente de ejecutar. */
  edicionAprobada:        boolean;
  // ─── Flags del menú ⋯ según estado y rol ───
  puedeEditar:            boolean;
  puedeSolicitarEdicion:  boolean;
  puedeResolverSolicitud: boolean;
  puedeAnular:            boolean;
}

/** Opción simple para los dropdowns de filtro (cliente, responsable). */
export interface OpcionFiltro {
  id:      number;
  nombre:  string;
  codigo?: string | null;
}

/** Respuesta completa del endpoint GET /api/crm/ordenes-servicio. */
export interface BandejaOrdenesServicio {
  tarjetas:     TarjetasOrdenesServicio;
  items:        ItemBandejaOrdenServicio[];
  total:        number;
  pagina:       number;
  porPagina:    number;
  clientes:     OpcionFiltro[];
  responsables: OpcionFiltro[];
}

/** Filtros de la bandeja (query params del endpoint). */
export interface FiltrosBandejaOrdenesServicio {
  busqueda?:        string;
  estado?:          EstadoGrupoOrdenServicio | 'todas' | '';
  tipo?:            TipoOrden | 'todos' | '';
  idCliente?:       number | null;
  idResponsable?:   number | null;
  fechaDesde?:      string | null;        // ISO (YYYY-MM-DD)
  fechaHasta?:      string | null;
  pagina:           number;
  porPagina:        number;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-40 — Modal "Elegir Propuesta Aceptada" (entrada del flujo Nueva OS/OM)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Propuesta aceptada candidata para generar una OS/OM.
 * Reglas: propuesta en estado `aceptada` + sin OS/OM activa (todas anuladas o ninguna).
 */
export interface PropuestaDisponibleOs {
  idPropuesta:         number;
  numero:              string;         // ej. "PRO-0045-2026"
  version:             number;
  razonSocial:         string;
  ruc:                 string;
  idRequerimiento:     number | null;
  numeroRequerimiento: string | null;
  tipoServicio:        string;
  /** OS o OM determinado por el tipo de servicio. */
  tipoOrden:           TipoOrden;
  fechaAceptacion:     string;         // ISO
  comercial:           string;
  cantidadEquipos:     number;
  cantidadConceptos:   number;
  /** Si tuvo OS/OM anulada previa, cuántas (informativo). */
  intentosPrevios?:    number;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-40 — Ficha Nueva/Editar OS/OM
// ═════════════════════════════════════════════════════════════════════════════

/** Contacto registrado del cliente (para el dropdown de la sección 1). */
export interface ContactoClienteOs {
  idContacto:    number;
  nombre:        string;
  cargo?:        string | null;
  esPrincipal?:  boolean;
}

/**
 * Datos precargados al abrir "Nueva OS/OM" desde una propuesta aceptada.
 * Todo viene de la propuesta origen; solo el contacto y la fecha programada
 * (si OS) son editables en la ficha.
 */
export interface PreparacionNuevaOs {
  // Documento sugerido
  numeroSugerido:        string;
  tipo:                  TipoOrden;
  tipoLabel:             string;
  fechaEmision:          string;    // hoy (ISO)

  // Datos del cliente
  idCliente:             number;
  razonSocial:           string;
  ruc:                   string;
  direccionOperaciones:  string | null;
  contactos:             ContactoClienteOs[];
  idContactoDefault:     number | null;

  // Comercial responsable
  idResponsable:         number;
  nombreResponsable:     string;

  // Propuesta origen (card solo lectura)
  propuestaOrigen:       PropuestaOrigenOs;

  // Requerimiento origen
  idRequerimiento:       number | null;
  numeroRequerimiento:   string | null;

  // Flag + datos precargados del certificado (solo relevante si tipo = OM)
  rqEsTercerizado?:      boolean;
  datosCertificadoDefault?: DatosCertificadoOm;

  // Precarga desde la propuesta (opcional — en HU-43 se podrán agregar/quitar)
  conceptosSugeridos:    ConceptoDetalleOs[];
  equiposSugeridos:      EquipoDetalleOs[];
}

/**
 * Preparación para editar una OS/OM existente — reusa la mayor parte de
 * DetalleOrdenServicio y agrega info de la solicitud de edición aprobada.
 */
export interface PreparacionEdicionOs {
  // Reusa el detalle completo
  detalle:               DetalleOrdenServicio;
  // Dropdown de contactos (igual que en Nueva, para poder cambiar el contacto)
  contactos:             ContactoClienteOs[];
  idContactoActual:      number | null;
  // Autorización vigente del Jefe Comercial
  autorizacion?: {
    jefeComercial:       string;
    fechaAutorizacion:   string;
    motivoLabel:         string;
    comentario:          string;
    idSolicitud:         number;
  } | null;
}

/** Payload para guardar borrador o emitir. */
export interface GuardarOrdenServicioRequest {
  idOs?:                 number | null;         // null = nueva
  idPropuesta:           number;
  tipo:                  TipoOrden;
  idContacto:            number | null;
  fechaProgramadaDesde?: string | null;         // solo OS
  fechaProgramadaHasta?: string | null;
  observaciones:         string;
  // Equipos y conceptos editables en HU-43
  equipos:               EquipoDetalleOs[];
  conceptos:             ConceptoDetalleOs[];
  // Datos para certificado — solo OM
  datosCertificado?:     DatosCertificadoOm;
  // Flag de emisión al confirmar
  emitir:                boolean;
}

export interface ResultadoGuardarOrdenServicio {
  idOs:         number;
  numero:       string;
  estado:       EstadoOrdenServicio;
  emitida:      boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-40 Fase C — Modal Solicitar Edición
// ═════════════════════════════════════════════════════════════════════════════

export interface MotivoEdicionOs {
  idMotivo: number;
  codigo:   string;
  label:    string;
}

export interface JefeComercialOs {
  idUsuario:   number;
  nombre:      string;
  cargo:       string;        // ej. "Jefe Comercial"
  sede?:       string;        // ej. "Sede Lima"
  iniciales:   string;
  disponible:  boolean;
}

export interface SolicitarEdicionOsRequest {
  idOs:        number;
  idMotivo:    number;
  comentario:  string;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-40 Fase C — Modal Anular OS/OM
// ═════════════════════════════════════════════════════════════════════════════

export interface MotivoAnulacionOs {
  idMotivo: number;
  codigo:   string;
  label:    string;
}

/** Si la OS/OM ya está programada, se muestran los recursos que se liberarán. */
export interface ImpactoAnulacionOs {
  tieneProgramacion: boolean;
  tecnicoAsignado?:  string | null;
  fechaLiberacion?:  string | null;    // ISO
  fechaReservada?:   string | null;    // ISO
  horaInicio?:       string | null;
  horaFin?:          string | null;
  viaticosLiberados?: number | null;
  monedaViaticos?:   string | null;
}

export interface AnularOsRequest {
  idOs:          number;
  idMotivo:      number;
  justificacion: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-43 — Modal Agregar Concepto del Servicio (catálogo maestros)
// ═════════════════════════════════════════════════════════════════════════════

export interface ConceptoCatalogoOs {
  idSuministro:       number;
  codigo:             string;         // ej. "SRV-CAL-001"
  descripcion:        string;
  clasificacion:      string;         // clase genérica (back: 'servicio'/'equipo'/'pesa'/...)
  tipo?:              string;         // back: catálogo TIPO_SUMINISTRO
  subtipo?:           string;         // back: catálogo SUBTIPO_SUMINISTRO
  aplicableA:         string;         // "Equipos de pesaje" / "Instrumentos"
  /** Marca "De la propuesta origen" en el modal de agregar. */
  deLaPropuesta?:     boolean;
  yaAgregado?:        boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-43 — Modal Agregar Equipo/Instrumento (catálogo cliente)
// ═════════════════════════════════════════════════════════════════════════════

export interface EquipoCatalogoClienteOs {
  idEquipo:           number;
  clasificacion:      ClasificacionEquipoOs;
  clasificacionLabel: string;
  marca:              string;
  modelo:             string;
  numSerie:           string;
  codigoTw:           string;
  alcance:            string | null;
  ubicacion:          string | null;
  /** 'disponible' | 'en_otra_os_activa' */
  estado:             'disponible' | 'en_otra_os_activa';
  numeroOsActiva?:    string | null;  // si está en otra OS activa
  /** Marca "De la propuesta origen" en el modal de agregar. */
  deLaPropuesta?:     boolean;
  yaAgregado?:        boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-44 — Importación desde Excel (plantilla estructurada, sin IA)
// ═════════════════════════════════════════════════════════════════════════════

export type EstadoFilaImportacionOs = 'ok' | 'advertencia' | 'error';

export interface FilaConceptoImportado {
  codigo:          string;
  descripcion:     string;
  estado:          EstadoFilaImportacionOs;
  mensaje?:        string;
}

export interface FilaEquipoImportado {
  codigoTw:              string;
  tipo:                  ClasificacionEquipoOs;
  tipoLabel:             string;
  marca:                 string;
  modelo:                string;
  numSerie:              string;
  ubicacion:             string | null;
  conceptosAplicados:    string[];      // códigos de conceptos
  estado:                EstadoFilaImportacionOs;
  mensaje?:              string;
}

export interface AnalisisImportacionOsOm {
  nombreArchivo:         string;
  totalEquipos:          number;
  totalConceptos:        number;
  totalRelaciones:       number;
  resumenEquiposOk:      number;
  resumenEquiposAdvertencias: number;
  resumenEquiposErrores: number;
  conceptos:             FilaConceptoImportado[];
  equipos:               FilaEquipoImportado[];
}

export type EstrategiaMergeImportacion = 'fusionar' | 'reemplazar' | 'cancelar';

// ═════════════════════════════════════════════════════════════════════════════
// Detalle de OS/OM (HU-42)
// Nota: endpoint GET /api/crm/ordenes-servicio/{id} aún NO existe en el back.
// Mientras tanto, el service devuelve mock siguiendo este contrato.
// ═════════════════════════════════════════════════════════════════════════════

/** Clasificación del equipo en el listado operativo. */
export type ClasificacionEquipoOs = 'equipo' | 'instrumento' | 'pesa';

/** Avance de un equipo individual (viene del Módulo 11 Ejecución). */
export interface AvanceEquipoOs {
  idEquipo:        number;
  codigoTw:        string;
  descripcion:     string;              // ej. "GAL-ECJS-LB-006 · LOMA LCW-6000"
  estado:          EstadoEjecucionEquipo;
  estadoLabel:     string;
  fechaEjecucion?: string | null;       // ISO
}

/** Bloque "Avance por Equipos" del tab Resumen. */
export interface AvancePorEquiposOs {
  totalEquipos:        number;
  ejecutados:          number;
  porcentaje:          number;          // 0..100
  actualizadoDesde:    string;          // ej. "Módulo 11 Ejecución"
  descripcion?:        string;          // ej. "Progreso en tiempo real de calibración"
  equipos:             AvanceEquipoOs[];
}

/** Tab Resumen — sección "Datos Generales de la Orden". */
export interface DatosGeneralesOs {
  numero:                 string;
  tipo:                   TipoOrden;
  tipoLabel:              string;        // ej. "OS (Orden de Servicio)"
  fechaEmision:           string | null;
  fechaProgramadaDesde?:  string | null; // solo OS
  fechaProgramadaHasta?:  string | null;
  diasHabilesEstimados?:  number | null;
  razonSocial:            string;
  ruc:                    string;
  direccionOperaciones:   string | null;
  contactoPlanta:         string | null;
  comercialResponsable:   string;
  numeroRequerimiento:    string | null;
  idRequerimiento:        number | null;
}

/** Tab Propuesta Origen — card de 10 campos de solo lectura. */
export interface PropuestaOrigenOs {
  idPropuesta:              number;
  codigo:                   string;      // "PRO-0045-2026"
  version:                  number;
  estado:                   string;      // "aceptada"
  estadoLabel:              string;
  tipoServicio:             string;      // "Metrología & Pesaje"
  fechaAceptacion:          string | null;
  comercial:                string;
  aprobadorVb:              string | null;
  montoTotal:               number;
  moneda:                   string;
  cantidadEquiposCotizados:   number;
  cantidadConceptosCotizados: number;
  condicionPago:            string | null;
}

/** Tab Equipos/Instrumentos — fila. */
export interface EquipoDetalleOs {
  item:              number;
  idEquipo:          number;
  clasificacion:     ClasificacionEquipoOs;
  clasificacionLabel: string;
  marca:             string;
  modelo:            string;
  numSerie:          string;
  codigoTw:          string;
  alcance:           string | null;
  ubicacion:         string | null;
  /** Códigos de los conceptos que aplican a este equipo. Si vacío → "General". */
  conceptosAplicados: string[];
  // Columnas condicionales según tipo
  d?:                 string | null;    // resolución (si equipo)
  e?:                 string | null;    // escala verif (si equipo)
  clase?:             string | null;    // OIML R76 (si equipo)
  escala?:            string | null;    // (si instrumento)
  puntosCalibracion?: string | null;    // (si instrumento)
}

/** Tab Conceptos — fila. */
export interface ConceptoDetalleOs {
  idConcepto:         number;
  codigo:             string;           // "SRV-CAL-001"
  descripcion:        string;
  clasificacion?:     string | null;    // mantenido por compat (clase genérica)
  tipo?:              string | null;    // ej. "Mantenimiento y Calibración"
  subtipo?:           string | null;    // ej. "De Plataforma"
  /** Alcance / capacidad cotizado en la propuesta — se muestra como texto secundario. */
  alcance?:           string | null;
  /** Códigos TW de los equipos a los que aplica. Vacío → "General". */
  equiposAplicados:   string[];
  /** Precargado desde la propuesta origen (no agregado manualmente). */
  deLaPropuesta?:     boolean;
}

/** Tab Programación — resumen de lo que armó Operaciones (Módulo 8). */
export interface ProgramacionOs {
  tieneProgramacion:  boolean;
  idProgramacion?:    number | null;
  tecnicoAsignado?:   string | null;
  fechaReal?:         string | null;
  horaInicio?:        string | null;
  horaFin?:           string | null;
  estadoPreparacion?: string | null;
  viaticosAsignados?: number | null;
  moneda?:            string | null;
  // Al no haber programación aún: mostrar mensaje y link al Módulo 8
}

/** Tab Certificado — solo OM. */
export interface DatosCertificadoOm {
  esTercerizado:      boolean;
  razonSocial:        string;
  ruc:                string;
  direccion:          string | null;
  contacto:           string | null;
}

/** Solicitud de edición pendiente sobre esta OS/OM. */
export interface SolicitudEdicionOs {
  idSolicitud:        number;
  motivo:             string;           // tipo seleccionado del catálogo
  motivoLabel:        string;
  comentario:         string;
  solicitadaPor:      string;
  fechaSolicitud:     string;
  dirigidaA:          string;           // Jefe Comercial
  idDirigidaA:        number;
  estado:             'pendiente' | 'aprobada' | 'rechazada';
}

/** Payload completo del endpoint de detalle. */
export interface DetalleOrdenServicio {
  // Cabecera
  idOs:                   number;
  tipo:                   TipoOrden;
  numero:                 string;
  estado:                 EstadoOrdenServicio;
  estadoGrupo:            EstadoGrupoOrdenServicio;
  estadoLabel:            string;
  idExpediente:           number | null;
  responsable:            string;
  idResponsable:          number;
  // Flags de acciones
  puedeSolicitarEdicion:  boolean;
  puedeResolverSolicitud: boolean;
  puedeEditar:            boolean;      // Edición aprobada activa
  puedeAnular:            boolean;
  solicitudPendiente:     SolicitudEdicionOs | null;

  // Tab Resumen
  datosGenerales:    DatosGeneralesOs;
  avancePorEquipos:  AvancePorEquiposOs;

  // Tab Propuesta Origen
  propuestaOrigen:   PropuestaOrigenOs;

  // Tab Equipos
  equipos:           EquipoDetalleOs[];

  // Tab Conceptos
  conceptos:         ConceptoDetalleOs[];

  // Tab Observaciones
  observaciones:     string;

  // Tab Programación
  programacion:      ProgramacionOs;

  // Tab Certificado (solo OM)
  datosCertificado?: DatosCertificadoOm;

  // Footer
  ultimaActualizacion:    string;
  usuarioUltimaActualizacion: string;
  fuenteUltimaActualizacion?: string;    // ej. "Sistema (ejecución)"
}
