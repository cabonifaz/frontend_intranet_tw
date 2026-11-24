// HU-55 — Registrar Informe Técnico desde Intranet
// Contratos de /api/intranet/servicios/{idOs}/... (back de Bryan/Cristopher)
// Doc: Desarrollo/backend_intranet_tw/docs/HU-55_REGISTRO_INFORME_INTRANET.md
//
// Reglas comunes:
//   - Envelope { idTipoMensaje, mensaje, datos }. 2 = éxito.
//   - 409 cuando otra persona tiene el equipo abierto (mensaje indica quién).
//   - 403 si falta el permiso seg_registrar_informe.
//   - No se envía GPS ni hora de captura (lo pone el servidor en Lima).

export interface RespuestaIntranetApi<T> {
  idTipoMensaje: number;
  mensaje:       string;
  datos:         T;
}

// ─── 1. Contexto de registro (GET contexto-registro) ────────────────────────

export type EstadoEtapa = 'conforme' | 'en_curso' | 'pendiente' | 'bloqueado' | 'no_conforme';

export interface EtapaRegistroApi {
  orden:   number;
  codigo:  'variables' | 'fotos' | 'ensayos' | 'cabecera' | 'correlativo';
  nombre:  string;
  estado:  EstadoEtapa;
  detalle: string | null;
}

export interface CatalogoItemRegistroApi {
  codigo:        string;
  nombre:        string;
  clasificacion: string | null;
  orden:         number;
}

export interface ContextoRegistroFilaApi {
  idOs:                     number;
  numeroOs:                 string | null;
  tipoOrden:                string | null;
  numeroRq:                 string | null;
  estadoOs:                 string | null;
  cliente:                  string | null;
  ruc:                      string | null;
  planta:                   string | null;
  direccionPlanta:          string | null;
  idOsEquipo:               number;
  idEquipo:                 number | null;
  equipoNombre:             string | null;
  numeroEquipo:             number | null;
  numeroSerie:              string | null;
  codigoCliente:            string | null;
  codigoTw:                 string | null;
  marca:                    string | null;
  modelo:                   string | null;
  idTecnico:                number | null;
  tecnico:                  string | null;
  informeFisico:            boolean;
  estadoEquipo:             string | null;
  iniciado:                 boolean;
  informeGenerado:          boolean;
  numeroInforme:            string | null;
  idInforme:                number | null;
  puedeIniciar:             boolean;
  motivoNoPuede:            string | null;
  registroActivo:           boolean;
  registradorId:            number | null;
  registradorNombre:        string | null;
  registroPropio:           boolean;
  registroUltimaActividad:  string | null;
  actividadPreviaTecnico:   boolean;
  otroEquipoAbierto:        string | null;
}

export interface ContextoRegistroApi {
  contexto:  ContextoRegistroFilaApi;
  etapas:    EtapaRegistroApi[];
  catalogos: {
    procedencia?:         CatalogoItemRegistroApi[];
    tipo_equipo?:         CatalogoItemRegistroApi[];
    forma_plato?:         CatalogoItemRegistroApi[];
    checklist_os?:        CatalogoItemRegistroApi[];
    checklist_om?:        CatalogoItemRegistroApi[];
    severidad?:           CatalogoItemRegistroApi[];
    estado_equipo?:       CatalogoItemRegistroApi[];
    clasificacion_falla?: CatalogoItemRegistroApi[];
    componente_falla?:    CatalogoItemRegistroApi[];
    motivo_manual?:       CatalogoItemRegistroApi[];
    [key: string]:        CatalogoItemRegistroApi[] | undefined;
  };
}

// ─── 2. Sesión (iniciar / liberar / pausar-otro) ────────────────────────────

export interface PeticionIniciarRegistroApi {
  /** Hora de Lima ISO 8601 sin zona (o con Z/offset — se respeta). */
  inicio:      string;
  fin:         string;
  /** Código de catalogos.motivo_manual (ej. "PLANTA_SIN_CELULAR"). */
  motivo:      string;
  comentario?: string | null;
}

export interface ResultadoIniciarRegistroApi {
  idRegistro:        number;
  idempotente:       boolean;
  estadoOs:          string | null;
  estadoEquipo:      string | null;
  idTecnico:         number;
  tiempoAplicadoMin: number;
}

export interface ResultadoPausarEquipoAbiertoApi {
  idOs:       number;
  idOsEquipo: number;
  equipo:    string | null;
}

// ─── 3. Variables ambientales ──────────────────────────────────────────────

export interface VariablesAmbientalesApi {
  temperatura:  number;
  humedad:      number;
  procedencia:  string;
  registradoEn: string | null;
}

export interface PeticionVariablesAmbientalesApi {
  temperatura: number;
  humedad:     number;
  procedencia?: string | null;
}

// ─── 3. Trabajo del equipo (devuelto por PUT variables, GET informe-en-curso) ─

export interface CabeceraTrabajoApi {
  idOs:               number;
  numeroOs:           string;
  cliente:            string | null;
  tipoOrden:          string;
  numeroRq:           string | null;
  servicioSigla:      string | null;
  servicio:           string | null;
  idOsEquipo:         number;
  nombre:             string;
  numeroSerie:        string | null;
  codigoCliente:      string | null;
  codigoTw:           string | null;
  marca:              string | null;
  modelo:             string | null;
  ubicacion:          string | null;
  estado:             string;
  tiempoEstimadoMin:  number | null;
  tiempoRealMin:      number;
  iniciadoEn:         string | null;
  puedeRegistrar:     boolean;
  etapasConformes:    number;
  etapasTotal:        number;
  puedeFinalizar:     boolean;
}

export interface EtapaTrabajoApi {
  orden:      number;
  codigo:     string;
  nombre:     string;
  estado:     EstadoEtapa;
  detalle:    string | null;
  disponible: boolean;
}

export interface TrabajoEquipoApi {
  cabecera:  CabeceraTrabajoApi;
  variables: VariablesAmbientalesApi | null;
  etapas:    EtapaTrabajoApi[];
}

// ─── 4. Evidencias (GET + upload + forzar + eliminar adicional + archivo) ───

export type MedioEvidencia = 'foto' | 'video' | 'qr';
export type EstadoEvidencia = 'pendiente' | 'aprobada' | 'rechazada' | 'forzada' | 'omitida';

export interface CabeceraEvidenciasApi {
  idOs:               number;
  idOsEquipo:         number;
  numeroOs:           string;
  nombre:             string;
  numero:             number;
  servicioSigla:      string | null;
  numeroSerie:        string | null;
  codigoCliente:      string | null;
  codigoTw:           string | null;
  marca:              string | null;
  modelo:             string | null;
  estado:             string;
  puedeRegistrar:     boolean;
  numeroRq:           string | null;
  total:              number;
  completas:          number;
  forzadas:           number;
  rechazadas:         number;
  obligatoriasFaltan: number;
  puedeGuardar:       boolean;
  informeFisico:      boolean;
}

export interface EvidenciaApi {
  orden:            number;
  codigo:           'placa' | 'inicial' | 'encendido' | 'desmontaje' | 'abierto' | 'prueba' | 'final' | 'informe' | 'qr';
  nombre:           string;
  descripcion:      string;
  obligatoria:      boolean;
  medio:            MedioEvidencia;
  estado:           EstadoEvidencia;
  idEvidencia:      number | null;
  intento:          number | null;
  esVideo:          boolean;
  duracionSeg:      number | null;
  paginas:          number;
  motivoRechazoIa:  string | null;
  motivoForzado:    string | null;
  forzadaPor:       string | null;
  forzadaEn:        string | null;
  intentosPrevios:  number;
  capturadaEn:      string | null;
  resultadoIa:      unknown | null;
  tieneCuadro:      boolean;
}

export interface AdicionalEvidenciaApi {
  idEvidencia: number;
  numero:      number;
  capturadaEn: string | null;
}

export interface EvidenciasApi {
  cabecera:    CabeceraEvidenciasApi;
  evidencias:  EvidenciaApi[];
  adicionales: AdicionalEvidenciaApi[];
}

export interface ResultadoEvidenciaApi {
  idEvidencia:   number;
  estado:        'aprobada' | 'rechazada' | 'omitida';
  motivoRechazo: string | null;
  intento:       number;
  coincide:      boolean | null;
  numeroRq:      string | null;
  datosIa:       unknown | null;
  mensaje:       string;
}

// ─── 5. Ensayos ──────────────────────────────────────────────────────────

export type FormaPlato = 'rectangular' | 'circular' | 'triangular';
export type ResultadoEnsayo = 'conforme' | 'no_conforme';

export interface CabeceraEnsayosApi {
  idOs:               number;
  idOsEquipo:         number;
  numeroOs:           string;
  nombre:             string;
  numero:             number;
  unidad:             string;
  clase:              string | null;
  capMaxima:          number | null;
  d:                  number | null;
  e:                  number | null;
  evaluable:          boolean;
  formaPlato:         FormaPlato;
  motivoErrorCritico: string | null;
  aceptaError:        boolean;
  finalizado:         boolean;
  finalizadoEn:       string | null;
  puedeRegistrar:     boolean;
  areaEncargado:      string | null;
}

export interface LecturaPesajeApi {
  orden:      number;
  carga:      number;
  indicacion: number | null;
  error:      number | null;
  emp:        number | null;
  resultado:  ResultadoEnsayo | null;
  critico:    boolean;
}

export interface LecturaExcentricidadApi {
  grupo:      number;
  posicion:   number;
  carga:      number;
  indicacion: number | null;
  error:      number | null;
  emp:        number | null;
  resultado:  ResultadoEnsayo | null;
  critico:    boolean;
}

export interface EncargadoEnsayoApi {
  idUsuario: number;
  nombre:    string;
  cargo:     string | null;
  telefono:  string | null;
  area:      string | null;
}

export interface EnsayosApi {
  cabecera:      CabeceraEnsayosApi;
  pesaje:        LecturaPesajeApi[];
  excentricidad: LecturaExcentricidadApi[];
  encargado:     EncargadoEnsayoApi | null;
}

export interface CargaPesajeEnvio {
  carga:      number | null;
  indicacion: number | null;
}

export interface CargaExcentricidadEnvio {
  carga:    number | null;
  /** Indicaciones por posición (índice 0 = centro). null = aún sin leer. */
  lecturas: (number | null)[] | null;
}

export interface GuardarEnsayosApi {
  formaPlato?:         FormaPlato | null;
  pesaje?:             CargaPesajeEnvio[] | null;
  excentricidad?:      CargaExcentricidadEnvio[] | null;
  motivoErrorCritico?: string | null;
  finalizar:           boolean;
}

// ─── 6. Cabecera del informe ────────────────────────────────────────────

export interface OpcionInformeApi {
  codigo:        string;
  nombre:        string;
  clasificacion: string | null;
}

export interface DatosInformeApi {
  idOs:                number;
  numeroOs:            string;
  tipoOrden:           string;
  numeroRq:            string | null;
  idInforme:           number | null;
  numeroInforme:       string | null;
  generado:            boolean;
  puedeEditar:         boolean;
  empresa:             string | null;
  ruc:                 string | null;
  direccion:           string | null;
  contacto:            string | null;
  contactoCargo:       string | null;
  contactoTelefono:    string | null;
  contactoCorreo:      string | null;
  marca:               string | null;
  modelo:              string | null;
  numSerie:            string | null;
  codigoCliente:       string | null;
  codigoTw:            string | null;
  capacidadMax:        string | null;
  d:                   string | null;
  e:                   string | null;
  ubicacion:           string | null;
  clase:               string | null;
  propuesta:           string | null;
  comercial:           string | null;
  tecnico:             string | null;
  fecha:               string | null;
  horaInicio:          string | null;
  horaFin:             string | null;
  tipoServicio:        string | null;
  responsableNombre:   string | null;
  responsableCargo:    string | null;
  responsableTelefono: string | null;
  guardadaEn:          string | null;
}

export interface PasoChecklistApi {
  codigo:  string;
  titulo:  string;
  orden:   number;
  marcado: boolean;
}

export interface DetalleServicioInformeApi {
  tipoEquipo:       string | null;
  celdas:           number[];
  sumatoriaHasta:   number | null;
  comparacionHasta: number | null;
  anillosFijacion:  boolean | null;
  guardado:         boolean;
  checklist:        PasoChecklistApi[];
}

export type PrioridadRecomendacionInforme = 'alta' | 'media' | 'baja';

export interface RecomendacionInformeApi {
  idRecomendacion: number;
  codigo:          string;
  titulo:          string;
  descripcion:     string | null;
  prioridad:       PrioridadRecomendacionInforme;
  plazo:           string | null;
}

export interface PruebaFallaApi {
  tipo:       string;
  orden:      number;
  posicion:   number | null;
  carga:      number;
  indicacion: number;
  error:      number;
  emp:        number | null;
  resultado:  ResultadoEnsayo | null;
}

export type SeveridadFalla = 'critica' | 'alta' | 'media' | 'baja';

export interface FallaInformeApi {
  idObservacion:       number;
  codigo:              string;
  clasificacion:       string;
  componente:          string;
  clasificacionNombre: string | null;
  componenteNombre:    string | null;
  descripcion:         string;
  severidad:           SeveridadFalla;
  fotos:               number[];
  pruebas:             PruebaFallaApi[];
}

export interface LecturaGeneralApi {
  orden:      number;
  carga:      number | null;
  indicacion: number | null;
  error:      number | null;
  emp:        number | null;
  resultado:  ResultadoEnsayo | null;
  critico:    boolean;
}

export interface CargaExcentricidadInformeApi {
  grupo:    number;
  carga:    number | null;
  lecturas: LecturaGeneralApi[];
}

export interface PruebasGeneralesApi {
  finalizado:    boolean;
  errorCritico:  string | null;
  pesaje:        LecturaGeneralApi[];
  excentricidad: CargaExcentricidadInformeApi[];
}

export type SeveridadGeneral = 'critica' | 'alta' | 'media' | 'baja' | 'ninguna';

export interface DiagnosticoInformeApi {
  severidadGeneral: SeveridadGeneral | string | null;
  estadoEquipo:     string | null;
  revisionJefatura: boolean;
  precotizacion:    boolean;
  segundaVisita:    boolean;
  aplicaGarantia:   boolean;
}

export interface OpcionesInformeApi {
  tiposEquipo:     OpcionInformeApi[];
  clasificaciones: OpcionInformeApi[];
  componentes:     OpcionInformeApi[];
}

export interface CabeceraInformeIntranetApi {
  datos:              DatosInformeApi;
  detalle:            DetalleServicioInformeApi;
  recomendaciones:    RecomendacionInformeApi[];
  sinRecomendaciones: boolean;
  fallas:             FallaInformeApi[];
  sinFallas:          boolean;
  pruebasGenerales:   PruebasGeneralesApi;
  comentarioPruebas:  string | null;
  diagnostico:        DiagnosticoInformeApi;
  opciones:           OpcionesInformeApi;
}

// ─── Guardado de cabecera (PUT cabecera-informe) ─────────────────────────

export interface DatosGuardarInforme {
  responsableNombre?:   string | null;
  responsableCargo?:    string | null;
  responsableTelefono?: string | null;
}

export interface DetalleGuardarInforme {
  tipoEquipo?:       string | null;
  celdas?:           number[] | null;
  sumatoriaHasta?:   number | null;
  comparacionHasta?: number | null;
  anillosFijacion?:  boolean | null;
  checks?:           string[] | null;
}

export interface RecomendacionGuardarInforme {
  titulo?:      string | null;
  descripcion?: string | null;
  prioridad?:   PrioridadRecomendacionInforme | null;
}

export interface PruebaGuardarInforme {
  tipo?:       string | null;
  posicion?:   number | null;
  carga?:      number | null;
  indicacion?: number | null;
}

export interface FallaGuardarInforme {
  clasificacion?: string | null;
  componente?:    string | null;
  severidad?:     SeveridadFalla | null;
  descripcion?:   string | null;
  fotos?:         number[] | null;
  pruebas?:       PruebaGuardarInforme[] | null;
}

export interface DiagnosticoGuardarInforme {
  severidadGeneral?: string | null;
  estadoEquipo?:     string | null;
  revisionJefatura?: boolean | null;
  precotizacion?:    boolean | null;
  segundaVisita?:    boolean | null;
  aplicaGarantia?:   boolean | null;
}

export interface GuardarCabeceraInformeApi {
  datos?:              DatosGuardarInforme | null;
  detalle?:            DetalleGuardarInforme | null;
  recomendaciones?:    RecomendacionGuardarInforme[] | null;
  sinRecomendaciones?: boolean | null;
  fallas?:             FallaGuardarInforme[] | null;
  sinFallas?:          boolean | null;
  comentarioPruebas?:  string | null;
  diagnostico?:        DiagnosticoGuardarInforme | null;
}

export interface ResultadoGuardarCabeceraApi {
  idInforme:         number;
  guardadaEn:        string | null;
  nFallas:           number;
  nRecomendaciones:  number;
}

// Foto de una falla ya subida (POST cabecera-informe/fotos)
export interface FotoFallaSubidaApi {
  idEvidencia: number;
}

// ─── 7. Correlativo y certificado ─────────────────────────────────────────

export interface TipoCertificadoApi {
  idTipo: number;
  nombre: string;
}

export interface CorrelativoAsignadoApi {
  idTicket:    number;
  ticket:      string;
  correlativo: string;
  asignadoEn:  string | null;
  asignadoPor: string | null;
}

export interface CabeceraSolicitudCorrelativoApi {
  idOs:                   number;
  numeroOs:               string;
  idOsEquipo:             number;
  equipo:                 string;
  numero:                 number;
  numeroSerie:            string | null;
  codigoCliente:          string | null;
  codigoTw:               string | null;
  clase:                  string | null;
  capacidad:              string | null;
  tipoOrden:              string;
  numeroRq:               string | null;
  resultado:              ResultadoEnsayo | null;
  puedeSolicitar:         boolean;
  motivoBloqueo:          string | null;
  ticketAbiertoId:        number | null;
  ticketAbiertoNumero:    string | null;
  ticketAbiertoEstado:    string | null;
  numeroCertificado:      string | null;
  tecnicoMetrologia:      boolean;
}

export interface SolicitudCorrelativoApi {
  cabecera:     CabeceraSolicitudCorrelativoApi;
  tipos:        TipoCertificadoApi[];
  asignado:     CorrelativoAsignadoApi | null;
  reservaLibre: string[];
}

export interface SolicitarCorrelativoPayload {
  idTipoCertificado: number;
  observacion?:      string | null;
}

export interface TicketCreadoApi {
  idTicket:     number;
  numero:       string;
  estado:       string;
  solicitadoEn: string | null;
  notificados:  number;
}

export interface GuardarCertificadoPayload {
  /** Formato "CC-0000-2026" asignado por Metrología. */
  numeroCertificado: string;
}

export interface CertificadoGuardadoApi {
  numeroCertificado: string;
  origen:            string | null;
  ticket:            string | null;
}

// ─── 8. Cierre (Hard Stop) e informe ─────────────────────────────────────

export interface EtapaCierreApi {
  orden:      number;
  codigo:     string;
  nombre:     string;
  estado:     EstadoEtapa;
  detalle:    string | null;
  pendientes: string[];
}

export interface CierreEquipoApi {
  puedeGenerar:   boolean;
  yaGenerado:     boolean;
  numeroInforme:  string | null;
  conformes:      number;
  total:          number;
  pendientes:     number;
  estadoEquipo:   string;
  equipo:         string;
  numeroOs:       string;
  etapas:         EtapaCierreApi[];
}

export interface InformeGeneradoApi {
  idInforme:     number;
  numeroInforme: string;
  estadoEquipo:  string;
  repetida:      boolean;
}

// ─── 9. Informe en curso (GET) ───────────────────────────────────────────

export interface InformeEnCursoApi {
  trabajo:    TrabajoEquipoApi | null;
  evidencias: EvidenciasApi | null;
  ensayos:    EnsayosApi | null;
  cabecera:   CabeceraInformeIntranetApi | null;
  avisos:     string[];
}

// ─── 10. Firma y constancia (nivel OS) ───────────────────────────────────

export type EstadoFirma = 'incompleto' | 'pendiente' | 'ausente' | 'firmado';

export interface CabeceraFirmasApi {
  idOs:               number;
  numeroOs:           string;
  cliente:            string | null;
  plazoHoras:         number;
  segundosRestantes:  number | null;
  tacitaActiva:       boolean;
  informes:           number;
  completos:          number;
  firmados:           number;
  responsables:       number;
  resueltos:          number;
  listo:              boolean;
  constanciaFirmada:  boolean;
  constanciaGenerada: boolean;
  cerrado:            boolean;
}

export interface InformeFirmaApi {
  idOsEquipo:    number;
  idInforme:     number | null;
  numeroInforme: string | null;
  equipo:        string | null;
  codigoEquipo:  string | null;
  completo:      boolean;
  motivo:        string | null;
  responsable:   string | null;
  cargo:         string | null;
  telefono:      string | null;
  clave:         string | null;
  firma:         EstadoFirma;
  firmadoEn:     string | null;
}

export interface ResponsableFirmaApi {
  clave:       string;
  nombre:      string;
  cargo:       string | null;
  telefono:    string | null;
  nInformes:   number;
  informes:    string | null;
  firma:       EstadoFirma;
  modo:        string | null;
  resuelto:    boolean;
  firmadoEn:   string | null;
  firmante:    string | null;
  motivo:      string | null;
  trazos:      unknown | null;
}

export interface FirmasApi {
  cabecera:     CabeceraFirmasApi;
  informes:     InformeFirmaApi[];
  responsables: ResponsableFirmaApi[];
}

export interface FirmaAusentePayload {
  /** 5 a 300 caracteres. */
  motivo: string;
}

export interface CabeceraConstanciaApi {
  idOs:               number;
  numeroOs:           string;
  cliente:            string | null;
  direccion:          string | null;
  contactoNombre:     string | null;
  contactoCargo:      string | null;
  contactoTelefono:   string | null;
  contactoCorreo:     string | null;
  numeroRq:           string | null;
  fecha:              string | null;
  informes:           number;
  completos:          number;
  firmados:           number;
  responsables:       number;
  resueltos:          number;
  modo:               string | null;
  firmante:           string | null;
  firmadoEn:          string | null;
  trazos:             unknown | null;
  tieneFoto:          boolean;
  firmada:            boolean;
  generadaEn:         string | null;
  cerradaEn:          string | null;
  envioEstado:        string;
  envioDestino:       string | null;
  envioEn:            string | null;
  envioDetalle:       string | null;
  puedeGenerar:       boolean;
  envioActivo:        boolean;
}

export interface EquipoConstanciaApi {
  equipo:      string | null;
  marca:       string | null;
  modelo:      string | null;
  serie:       string | null;
  capacidad:   string | null;
  d:           string | null;
  e:           string | null;
  ubicacion:   string | null;
  codigo:      string | null;
  procedencia: string | null;
  certificado: string | null;
}

export interface FaltaFirmaApi {
  nombre:   string;
  cargo:    string | null;
  informes: string | null;
}

export interface ConstanciaApi {
  cabecera: CabeceraConstanciaApi;
  equipos:  EquipoConstanciaApi[];
  faltan:   FaltaFirmaApi[];
}
