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
  | 'pendiente_revision' | 'pendiente_precotizacion' | 'revisado_sin_precot' | 'revisado_con_precot';

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
  pendientesRevision:      number;
  pendientesPrecotizacion: number;
  revisadosSinPrecot:      number;
  revisadosConPrecot:      number;
  slaVencidos:             number;
  slaHoras:                number;
}

/** Estado en BD: pendiente_revision · en_revision · revisado. */
export type EstadoInformeApi = 'pendiente_revision' | 'en_revision' | 'revisado';

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
  fechaEnvioRevision:      string | null;
  horasEspera:             number | null;
  slaHoras:                number | null;
  slaVencido:              boolean;
  fechaRevision:           string | null;
  revisor:                 string | null;
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
  | 'registrar_precotizacion' | 'registrar_revision' | null;

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
  puedeEditar:                 boolean;
  puedeRegistrarPrecotizacion: boolean;
  puedeRegistrarRevision:      boolean;
  mensajeBloqueo:              string | null;
  accionPrincipal:             AccionPrincipalInforme;
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

// ─── HU-58 Edición ──────────────────────────────────────────────────────────

/** Secciones opcionales: null = no cambia. Enviada = reemplaza la lista (con Id = actualiza, sin Id = agrega, las que faltan se eliminan). */
export interface GuardarInformePayload {
  descripcionComplementaria?: string | null;
  resultado?:                  ResultadoEnsayosGuardarPayload | null;
  procedimiento?:              PasoGuardarPayload[]  | null;
  ensayos?:                    EnsayoGuardarPayload[]  | null;
  observaciones?:              ObservacionGuardarPayload[]  | null;
  recomendaciones?:            RecomendacionGuardarPayload[]  | null;
}

export interface ResultadoEnsayosGuardarPayload {
  normativa?:               string | null;
  patronEnsayo?:            string | null;
  toleranciaExcentricidad?: number | null;
  resultadoGlobal?:         'dentro' | 'fuera' | null;
  errorMaximo?:             number | null;
  errorMaximoDetalle?:      string | null;
  incertidumbre?:           number | null;
  factorK?:                 number | null;
  decisionTecnica?:         string | null;
}

export interface PasoGuardarPayload {
  id?:        number | null;
  titulo?:    string | null;
  detalle?:   string | null;
  realizado:  boolean;
  nota?:      string | null;
}

export interface EnsayoGuardarPayload {
  id?:         number | null;
  tipo?:       'pesaje' | 'excentricidad' | null;
  punto?:      string | null;
  notaPunto?:  string | null;
  carga?:      number | null;
  lectura?:    number | null;
  error?:      number | null;
  tolerancia?: number | null;
  resultado?:  'conforme' | 'no_conforme' | null;
}

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
  /** Para vincular una observación NUEVA (no guardada aún) de este mismo payload: su posición (desde 0) en Observaciones. */
  indiceObservacion?: number | null;
}

export interface InformeGuardadoApi {
  idInforme:         number;
  cambiosRegistrados: number;
  estado:            string | null;
}

/** Paso 4: precotización (obligatoria si el servicio tiene observaciones). Items = lista completa. */
export interface GuardarPrecotizacionPayload {
  nota?:  string | null;
  items:  ItemPrecotizacionGuardarPayload[];
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

export interface PrecotizacionGuardadaApi {
  idPrecotizacion: number;
  numero:          string;
  items:           number;
  estado:          string;
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

/** fotos · ensayos · observaciones · precotizacion · procedimiento */
export type CodigoChecklistRevision =
  | 'fotos' | 'ensayos' | 'observaciones' | 'precotizacion' | 'procedimiento';

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
