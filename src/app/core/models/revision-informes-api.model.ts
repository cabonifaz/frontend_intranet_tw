// DTOs 1:1 con RevisionTecnicaDtos.cs del backend.
// HU-56 a HU-59 — Servicio Técnico › Revisión de Informes (Sprint 5).
// La capa de UI usa estos DTOs tal cual (camelCase); el mapper agrega labels/colores derivados.

export interface RespuestaRevisionApi<T> {
  idTipoMensaje: number;
  mensaje: string;
  datos: T;
}

// ─── HU-56 Bandeja ──────────────────────────────────────────────────────────

export type GrupoBandejaInformes =
  | 'todos' | 'pendientes' | 'revisados'
  | 'pendiente_revision' | 'revisado_sin_complementario' | 'revisado_con_complementario';

export interface FiltrosBandejaInformesQs {
  grupo?:            GrupoBandejaInformes | null;
  busqueda?:         string | null;
  idTecnico?:        number | null;
  idCliente?:        number | null;
  conObservaciones?: boolean | null;
  slaVencido?:       boolean;
  fechaDesde?:       string | null;
  fechaHasta?:       string | null;
  pagina?:           number;
  porPagina?:        number;
}

export interface TarjetasInformesApi {
  pendientesRevision:          number;
  revisadosSinComplementario:  number;
  revisadosConComplementario:  number;
  slaVencidos:                 number;
  slaHoras:                    number;
}

/** Estado en BD: pendiente_revision · en_revision · revisado · revisado_con_complementario. */
export type EstadoInformeApi =
  | 'pendiente_revision' | 'en_revision' | 'revisado' | 'revisado_con_complementario';

export interface ItemBandejaInformeApi {
  idInforme:               number;
  numeroInforme:           string | null;
  version:                 number;
  idOs:                    number | null;
  numeroOs:                string | null;
  tipoOs:                  string | null;
  fechaEjecucion:          string | null;
  idCliente:               number | null;
  razonSocial:             string | null;
  ruc:                     string | null;
  sede:                    string | null;
  idEquipo:                number | null;
  equipo:                  string | null;
  codigoTw:                string | null;
  numeroSerie:             string | null;
  tipoEquipo:              string | null;
  tipoServicio:            string | null;
  idTecnico:               number | null;
  tecnico:                 string | null;
  nObservaciones:          number;
  conObservaciones:        boolean;
  estado:                  EstadoInformeApi | null;
  grupoEstado:             string | null;
  estadoLabel:             string | null;
  idPrecotizacion:         number | null;
  numeroPrecot:            string | null;
  idPropuestaDerivada:     number | null;
  numeroPropuestaDerivada: string | null;
  fechaEnvioRevision:         string | null;
  horasEspera:                number | null;
  slaHoras:                   number | null;
  slaVencido:                 boolean;
  fechaRevision:              string | null;
  revisor:                    string | null;
  /** HU-58: id del informe complementario (si existe). */
  idInformeComplementario:    number | null;
  tieneComplementario:        boolean;
}

export interface OpcionInformeApi {
  id:     number;
  nombre: string | null;
}

export interface BandejaInformesApi {
  tarjetas:  TarjetasInformesApi;
  items:     ItemBandejaInformeApi[];
  total:     number;
  pagina:    number;
  porPagina: number;
  tecnicos:  OpcionInformeApi[];
  clientes:  OpcionInformeApi[];
}

// ─── HU-57 Detalle ──────────────────────────────────────────────────────────

/** sin_registro · incompletos · completos */
export type EstadoEnsayos = 'sin_registro' | 'incompletos' | 'completos';

/** no_aplica · requiere_precotizacion · precotizacion_enviada · convertida */
export type OportunidadComercial =
  | 'no_aplica' | 'requiere_precotizacion' | 'precotizacion_enviada' | 'convertida';

/** Botón primario del modal según estado + acciones permitidas. */
export type AccionPrincipalInforme =
  | 'registrar_revision' | 'ver_complementario' | null;

export interface CabeceraInformeApi {
  idInforme:                number;
  numeroInforme:            string | null;
  version:                  number;
  estado:                   EstadoInformeApi | null;
  grupoEstado:              string | null;
  estadoLabel:              string | null;
  urlPdf:                   string | null;
  idOs:                     number | null;
  numeroOs:                 string | null;
  tipoOs:                   string | null;
  idCliente:                number | null;
  razonSocial:              string | null;
  ruc:                      string | null;
  idSede:                   number | null;
  sede:                     string | null;
  idEquipo:                 number | null;
  equipo:                   string | null;
  codigoTw:                 string | null;
  numeroSerie:              string | null;
  marca:                    string | null;
  modelo:                   string | null;
  tipoEquipo:               string | null;
  idTipoServicio:           number | null;
  tipoServicio:             string | null;
  idTecnico:                number | null;
  tecnico:                  string | null;
  fechaEjecucion:           string | null;
  horaInicio:               string | null;
  horaFin:                  string | null;
  duracionMin:              number | null;
  idPropuesta:              number | null;
  numeroPropuesta:          string | null;
  versionPropuesta:         number | null;
  idRequerimiento:          number | null;
  numeroRq:                 string | null;
  contacto:                 string | null;
  diagnostico:              string | null;

  // Resumen de validaciones
  nFotos:                   number;
  nFotosValidas:            number;
  nEnsayos:                 number;
  nEnsayosSinResultado:     number;
  nEnsayosNoConformes:      number;
  nObservaciones:           number;
  nRecomendaciones:         number;
  nPasos:                   number;
  nPasosRealizados:         number;
  porcentajeProcedimiento:  number | null;
  estadoEnsayos:            EstadoEnsayos | null;
  oportunidadComercial:     OportunidadComercial | null;

  // Resultado global de los ensayos
  normativa:                string | null;
  patronEnsayo:             string | null;
  toleranciaExcentricidad:  number | null;
  resultadoGlobal:          'dentro' | 'fuera' | null;
  errorMaximo:              number | null;
  errorMaximoDetalle:       string | null;
  incertidumbre:            number | null;
  factorK:                  number | null;
  decisionTecnica:          string | null;
  descripcionComplementaria: string | null;

  // Trazabilidad
  fechaEnvioRevision:       string | null;
  fechaInicioRevision:      string | null;
  fechaRevision:            string | null;
  idRevisor:                number | null;
  revisor:                  string | null;
  notaRevision:             string | null;
  horasEspera:              number | null;
  slaHoras:                 number | null;
  slaVencido:               boolean;
  idPrecotizacion:          number | null;
  numeroPrecot:             string | null;
  estadoPrecot:             string | null;
  fechaPrecot:              string | null;
  autorPrecot:              string | null;
  nItemsPrecot:             number | null;
  notaPrecotizacion:        string | null;
  idPropuestaDerivada:      number | null;
  numeroPropuestaDerivada:  string | null;
  versionPropuestaDerivada: number | null;
  estadoPropuestaDerivada:  string | null;

  // Acciones
  puedeGenerarComplementario:  boolean;
  puedeRegistrarRevision:      boolean;
  mensajeBloqueo:              string | null;
  accionPrincipal:             AccionPrincipalInforme;

  // Vínculo al complementario (HU-58) — "puede ver" se deriva de tieneComplementario && idInformeComplementario.
  idInformeComplementario:     number | null;
  numeroInformeComplementario: string | null;
  tieneComplementario:         boolean;
  /** Estado propio de la fila complementaria: 'borrador' · 'complementario' (confirmado tras guardar). */
  estadoComplementario:        string | null;

  // PDF del original: Bryan avisa que hoy puede venir null (no está implementado aún).
  pdfInformeOriginalUrl:       string | null;
}

export interface PasoInformeApi {
  idPaso:    number;
  orden:     number;
  titulo:    string | null;
  detalle:   string | null;
  realizado: boolean;
  nota:      string | null;
  origen:    'tecnico' | 'supervisor' | null;
}

export interface EnsayoInformeApi {
  idEnsayo:       number;
  tipo:           'pesaje' | 'excentricidad' | null;
  orden:          number;
  punto:          string | null;
  notaPunto:      string | null;
  carga:          number | null;
  lectura:        number | null;
  error:          number | null;
  tolerancia:     number | null;
  resultado:      'conforme' | 'no_conforme' | null;
  resultadoLabel: string | null;
  origen:         string | null;
}

export type NivelObservacion = 'critico' | 'alto' | 'medio' | 'bajo';

export interface ObservacionInformeApi {
  idObservacion:   number;
  codigo:          string | null;
  orden:           number;
  titulo:          string | null;
  descripcion:     string | null;
  ubicacion:       string | null;
  detalleExtra:    string | null;
  nivelAfectacion: NivelObservacion | null;
  idEvidencia:     number | null;
  urlFoto:         string | null;
  origen:          string | null;
}

export type PrioridadRecomendacion = 'alta' | 'media' | 'baja';

export interface RecomendacionInformeApi {
  idRecomendacion:   number;
  codigo:            string | null;
  orden:             number;
  titulo:            string | null;
  descripcion:       string | null;
  prioridad:         PrioridadRecomendacion | null;
  plazo:             string | null;
  idObservacion:     number | null;
  codigoObservacion: string | null;
  origen:            string | null;
}

export type MomentoFoto = 'ANTES' | 'DURANTE' | 'DESPUES' | 'FALLA' | 'VERIFICACION';

export interface FotoInformeApi {
  idEvidencia:      number;
  urlArchivo:       string | null;
  descripcion:      string | null;
  esVideo:          boolean;
  momento:          MomentoFoto | null;
  momentoLabel:     string | null;
  fechaCaptura:     string | null;
  latitud:          number | null;
  longitud:         number | null;
  georreferenciada: boolean;
  validacionIa:     string | null;
  idObservacion:    number | null;
  codigoObservacion:string | null;
  /** Evidencia forzada (HU-12): la IA la rechazó y el técnico la aceptó con un motivo. */
  forzada?:         boolean;
  motivoForzado?:   string | null;
  motivoRechazoIa?: string | null;
  forzadaPor?:      string | null;
  forzadaEn?:       string | null;
  /** HU-58: 'tecnico' si la subió el técnico desde la app (viene del original), 'supervisor' si la sumó el supervisor en el complementario, 'intranet' si la subió una asistente. */
  origen?:          string | null;
}

/** Observación registrada durante el servicio en el Seguimiento Operativo. */
export interface ObservacionSeguimientoApi {
  clave:       string;
  /** asistente (nota del Asistente) · equipo (observación del equipo) · ejecucion (observación de ejecución). */
  origen:      string;
  registrador: string | null;
  /** Cómo se enteró el Asistente (llamada telefónica, WhatsApp, contacto en planta, observación directa). */
  fuente:      string | null;
  texto:       string;
  fecha:       string | null;
}

export type PrioridadItemPrecot = 'alta' | 'media' | 'opcional';

export interface ItemPrecotizacionApi {
  idItem:             number;
  orden:              number;
  concepto:           string | null;
  codigo:             string | null;
  idSuministro:       number | null;
  descripcionTecnica: string | null;
  cantidad:           number;
  unidad:             string | null;
  prioridad:          PrioridadItemPrecot | null;
  idObservacion:      number | null;
  codigoObservacion:  string | null;
  precioReferencia:   number | null;
}

export interface EventoRecienteApi {
  idAuditoria: number;
  accion:      string | null;
  descripcion: string | null;
  fecha:       string | null;
  usuario:     string | null;
}

export interface DetalleInformeApi {
  cabecera:           CabeceraInformeApi;
  procedimiento:      PasoInformeApi[];
  ensayos:            EnsayoInformeApi[];
  observaciones:      ObservacionInformeApi[];
  recomendaciones:    RecomendacionInformeApi[];
  fotos:              FotoInformeApi[];
  precotizacion:      ItemPrecotizacionApi[];
  historialReciente:  EventoRecienteApi[];
}

// ─── HU-58 Informe Complementario ───────────────────────────────────────────
// Cambio arquitectónico (reunión cliente 2026-11-23): el supervisor ya NO edita
// el informe original (que es inmutable tras llegar del móvil); si lo ve necesario,
// genera un informe complementario como entidad aparte (fila nueva en informe_tecnico
// con id_informe_padre = id del original) que replica datos del original y permite
// añadir fotos/videos/obs/recoms + registrar la Precotización.

export interface ResponsableClienteApi {
  nombre:   string | null;
  cargo:    string | null;
  telefono: string | null;
}

export interface DiagnosticoFinalApi {
  severidadGeneral: string | null;
  estadoEquipo:     string | null;
  revisionJefatura: boolean;
  precotizacion:    boolean;
  segundaVisita:    boolean;
  aplicaGarantia:   boolean;
}

export interface DetalleServicioOriginalApi {
  tipoEquipo:        string | null;
  /** Array de lecturas de celdas en mV (hasta 12). Ej. [1, 1, 1, 1]. */
  celdas:            number[] | null;
  sumatoriaHasta:    number | null;
  comparacionHasta:  number | null;
  anillosFijacion:   boolean | null;
}

export interface ResultadoOriginalApi {
  resultadoGlobal: 'dentro' | 'fuera' | null;
  errorMaximo:     number | null;
  decisionTecnica: string | null;
  errorCritico:    boolean | null;
}

export interface OpcionCatalogo {
  id?:     number | null;
  codigo?: string | null;
  nombre:  string;
  /** Para `componentesFalla`: id/codigo de la clasificación padre. */
  padre?:  string | number | null;
}

export interface CatalogosComplementarioApi {
  tiposEquipo?:                  OpcionCatalogo[] | null;
  clasificacionesFalla?:         OpcionCatalogo[] | null;
  componentesFalla?:             OpcionCatalogo[] | null;
  severidadesObservacion?:       OpcionCatalogo[] | null;
  prioridadesRecomendacion?:     OpcionCatalogo[] | null;
  prioridadesItemPrecotizacion?: OpcionCatalogo[] | null;
}

export interface PrecotizacionDetalleApi {
  idPrecotizacion: number | null;
  numero:          string | null;
  estado:          string | null;
  nota:            string | null;
  items:           ItemPrecotizacionApi[] | null;
}

export interface ObservacionComplementarioApi extends ObservacionInformeApi {
  clasificacion?:      string | number | null;
  clasificacionNombre?: string | null;
  componente?:         string | number | null;
  componenteNombre?:   string | null;
}

export interface CabeceraComplementarioApi {
  idInformeComplementario:  number;
  idInformeOriginal:        number;
  /** N° del informe técnico que da origen a este complementario. */
  numeroInformeTecnico:     string | null;
  numeroComplementario:     string | null;
  estado:                   string;
  idSupervisor:             number | null;
  supervisor:               string | null;
  fechaGeneracion:          string | null;
  fechaUltimaEdicion:       string | null;
  urlPdf:                   string | null;

  // Datos del servicio (SOLO LECTURA — vienen del original)
  numeroOs:                 string | null;
  razonSocial:              string | null;
  equipo:                   string | null;
  tecnico:                  string | null;
  fechaEjecucion:           string | null;

  // Nuevos campos editables en Tab 5
  observacionesGenerales:   string | null;
}

export interface DetalleComplementarioApi {
  cabecera:         CabeceraComplementarioApi;

  // Del original (readonly) — todo al nivel raíz, al mismo nivel que detalleServicio
  responsableCliente?:   ResponsableClienteApi      | null;
  diagnosticoFinal?:     DiagnosticoFinalApi        | null;
  comentarioPruebas?:    string                     | null;
  detalleServicio?:      DetalleServicioOriginalApi | null;
  procedimiento?:        PasoInformeApi[]           | null;
  ensayos?:              EnsayoInformeApi[]         | null;
  resultadoOriginal?:    ResultadoOriginalApi       | null;

  // Editable (copia de lo que tiene el técnico — supervisor puede modificar)
  observaciones?:        ObservacionComplementarioApi[] | null;
  recomendaciones?:      RecomendacionInformeApi[]      | null;
  fotos?:                FotoInformeApi[]               | null;
  precotizacionDetalle?: PrecotizacionDetalleApi        | null;

  // Catálogos para los dropdowns del tab 5
  opciones?:             CatalogosComplementarioApi | null;
}

/** Para crear el complementario: no requiere body (se precarga desde el original). */
export interface CrearComplementarioRespuestaApi {
  idInformeComplementario: number;
  numeroComplementario:    string | null;
  estado:                  string;
}

/** Guardar cambios editables del complementario.
 *  Reglas del PUT (Bryan): `null` no toca la sección, `[]` la borra, `[X, Y]` deja solo esas filas.
 *  Para `precotizacion`, el objeto va envuelto: `null` no toca, `{ items: [] }` la quita.
 */
export interface GuardarComplementarioPayload {
  observacionesGenerales?: string | null;
  observaciones?:          ObservacionGuardarPayload[]   | null;
  recomendaciones?:        RecomendacionGuardarPayload[] | null;
  precotizacion?:          { nota?: string | null; items: ItemPrecotizacionGuardarPayload[] } | null;
}

export interface ComplementarioGuardadoApi {
  idInformeComplementario: number;
  cambiosRegistrados:      number;
  estado:                  string;
}

// ─── Payloads del guardado del complementario ─────────────────────────────
// HU-58 reescrita (2026-11-23): el supervisor ya no edita el informe original.
// Estos tipos ahora alimentan el PUT del informe complementario (ver
// GuardarComplementarioPayload arriba) — se mantienen separados para poder
// reutilizarlos si alguna otra pantalla los necesita.

export interface ObservacionGuardarPayload {
  id?:              number | null;
  titulo?:          string | null;
  descripcion?:     string | null;
  ubicacion?:       string | null;
  detalleExtra?:    string | null;
  nivelAfectacion?: NivelObservacion | null;
  idEvidencia?:     number | null;
}

export interface RecomendacionGuardarPayload {
  id?:                number | null;
  titulo?:            string | null;
  descripcion?:       string | null;
  prioridad?:         PrioridadRecomendacion | null;
  plazo?:             string | null;
  idObservacion?:     number | null;
}

export interface ItemPrecotizacionGuardarPayload {
  id?:                 number | null;
  concepto?:           string | null;
  codigo?:             string | null;
  idSuministro?:       number | null;
  descripcionTecnica?: string | null;
  cantidad:            number;
  unidad?:             string | null;
  prioridad?:          PrioridadItemPrecot | null;
  idObservacion?:      number | null;
}

// ─── HU-59 Revisión e Historial ─────────────────────────────────────────────

export interface CabeceraRevisionInformeApi {
  idInforme:            number;
  numeroOs:             string | null;
  razonSocial:          string | null;
  equipo:               string | null;
  tecnico:              string | null;
  verificados:          number;
  total:                number;
  /** false si falta un punto obligatorio del checklist. */
  puedeConfirmar:       boolean;
  aviso:                string | null;
  impactoInforme:       string | null;
  impactoPrecotizacion: string | null;
  impactoEstado:        string | null;
  impactoNotificacion:  string | null;
}

/**
 * fotos · ensayos · observaciones · procedimiento.
 * HU-59 (2026-11-23): quitado 'precotizacion' — la precotización ya no es parte
 * del ciclo de revisión del informe original (vive en el complementario).
 */
export type CodigoChecklistRevision =
  | 'fotos' | 'ensayos' | 'observaciones' | 'procedimiento';

export interface ItemChecklistRevisionApi {
  orden:       number;
  codigo:      CodigoChecklistRevision | null;
  titulo:      string | null;
  detalle:     string | null;
  cumple:      boolean;
  obligatorio: boolean;
}

export interface PreparacionRevisionApi {
  cabecera:  CabeceraRevisionInformeApi;
  checklist: ItemChecklistRevisionApi[];
}

export interface RegistrarRevisionPayload {
  /** Nota interna del supervisor (opcional, hasta 500 caracteres). */
  nota?: string | null;
}

export interface InformeRevisadoApi {
  idInforme:           number;
  estado:              string | null;
  fechaRevision:       string | null;
  idPrecotizacion:     number | null;
  numeroPrecotizacion: string | null;
}

/** todos · edicion · precotizacion · revision · sistema */
export type CategoriaHistorial = 'todos' | 'edicion' | 'precotizacion' | 'revision' | 'sistema';

export interface ContadoresHistorialApi {
  todos:         number;
  edicion:       number;
  precotizacion: number;
  revision:      number;
  sistema:       number;
}

export interface EventoHistorialApi {
  idAuditoria: number;
  dia:         string | null;
  fecha:       string | null;
  accion:      string | null;
  categoria:   CategoriaHistorial | null;
  origen:      'movil' | 'sistema' | 'intranet' | null;
  etiqueta:    string | null;
  idUsuario:   number | null;
  usuario:     string | null;
  descripcion: string | null;
  cambios:     string | null;
  detalle:     string | null;
  nota:        string | null;
}

export interface HistorialInformeApi {
  contadores: ContadoresHistorialApi;
  eventos:    EventoHistorialApi[];
}
