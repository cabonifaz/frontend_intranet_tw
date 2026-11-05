// Modelo del módulo 8 Programación Operativa (Sprint 5). HU-35 a HU-39 + HU-45.
// Alineado con los DTOs del back en `TW.Intranet.Aplicacion/Dtos/Programacion*.cs`.

// ─── HU-35 Bandeja ───────────────────────────────────────────────────────────

export type SubEstadoProgramacion =
  | 'pendiente_programar'
  | 'pendiente_conf_cliente'
  | 'pendiente_reprogramacion'
  | 'pendiente_ssoma'
  | 'programado';

export type TipoOrden = 'OS' | 'OM';

export interface FiltrosProgramacionOperativa {
  subEstado?:  SubEstadoProgramacion | 'todos' | null;
  rango?:      'todos' | 'hoy' | 'esta_semana' | 'proxima_semana' | 'personalizado' | null;
  fechaDesde?: string | null;   // yyyy-MM-dd
  fechaHasta?: string | null;
  tipo?:       TipoOrden | 'todos' | null;
  idCliente?:  number | null;
  idArea?:     number | null;
  idTecnico?:  number | null;
  idSede?:     number | null;
  zona?:       string | null;
  busqueda?:   string | null;
  pagina:      number;
  porPagina:   number;
}

export interface OpcionFiltro {
  id:     number;
  nombre: string;
  codigo?: string | null;
}

export interface TarjetasProgramacion {
  serviciosHoy:             number;
  enEjecucionHoy:           number;
  pendientesProgramar:      number;
  pendientesConfCliente:    number;
  pendientesReprogramacion: number;
  pendientesSsoma:          number;
  totalPendientes:          number;
  programados:              number;
  programadosSemana:        number;
  conConflicto:             number;
  tecnicosDisponibles:      number;
  plantillaTecnicos:        number;
  finalizadosHoy:           number;
}

export interface ServicioCalendario {
  idOs:              number;
  tipo:              TipoOrden;
  numero:            string;
  estado:            string;
  subEstado:         string;
  idTecnico:         number;
  tecnico?:          string | null;
  rol:               'principal' | 'apoyo';
  tecnicoPrincipal?: string | null;
  fecha?:            string | null;
  horaInicio?:       string | null;
  horaFin?:          string | null;
  horas?:            number | null;
  cliente?:          string | null;
  sede?:             string | null;
  tipoServicio?:     string | null;
  enConflicto:       boolean;
  confirmadoCliente: boolean;
}

export interface CargaDia {
  fecha:     string;    // yyyy-MM-dd
  horas:     number;
  nivel:     'libre' | 'baja' | 'optimo' | 'alta' | 'sobrecarga';
  conflicto: boolean;
  servicios: number;
}

export interface CargaTecnico {
  idUsuario:       number;
  nombre:          string;
  cargo?:          string | null;
  tipoRecurso:     'tecnico' | 'metrologo';
  sedeOperativa?:  string | null;
  dias:            CargaDia[];
  totalHoras:      number;
  utilizacionPct:  number;
  nivel:           CargaDia['nivel'];
}

export interface AlertaProgramacion {
  tipo:      'conflicto' | 'reprogramacion' | 'ssoma';
  severidad: 'critica' | 'advertencia';
  titulo:    string;
  detalle:   string;
  idUsuario?: number | null;
  idOs?:      number | null;
  idOs2?:     number | null;
  fecha?:     string | null;
  cantidad:   number;
}

export interface ResumenProgramacion {
  inicioSemana:          string;
  finSemana:             string;
  capacidadSemanalHoras: number;
  capacidadDiariaHoras:  number;
  tarjetas:              TarjetasProgramacion;
  calendario:            ServicioCalendario[];
  carga:                 CargaTecnico[];
  alertas:               AlertaProgramacion[];
}

export interface ItemProgramacion {
  idOs:                     number;
  tipo:                     TipoOrden;
  numero:                   string;
  estado:                   string;
  estadoLabel:              string;
  subEstado:                SubEstadoProgramacion;
  subEstadoLabel:           string;
  idExpediente?:            number | null;
  idCliente?:               number | null;
  razonSocial?:             string | null;
  ruc?:                     string | null;
  idSede?:                  number | null;
  sede?:                    string | null;
  zona?:                    string | null;
  idPropuesta?:             number | null;
  numeroPropuesta?:         string | null;
  versionPropuesta?:        number | null;
  numeroRequerimiento?:     string | null;
  idArea?:                  number | null;
  area?:                    string | null;
  idTecnico?:               number | null;
  tecnico?:                 string | null;
  tecnicosApoyo?:           string | null;
  numeroTecnicos:           number;
  idTipoServicio?:          number | null;
  tipoServicio?:            string | null;
  ssomaMotivo?:             string | null;
  idProgramacion?:          number | null;
  codigoProgramacion?:      string | null;
  fechaEjecucion?:          string | null;
  horaInicio?:              string | null;
  horaFin?:                 string | null;
  horas?:                   number | null;
  fechaProgramadaDesde?:    string | null;
  fechaProgramadaHasta?:    string | null;
  confirmacionCliente:      boolean;
  fechaConfirmacionCliente?: string | null;
  enConflicto:              boolean;
  idReprogramacionPendiente?: number | null;
  diasEnEspera:             number;
  viaticoMonto:             number;
  viaticoMoneda:            string;
  viaticoEstado:            'sin_asignar' | 'pendiente_deposito' | 'depositado';
  // Acciones según rol+estado
  puedeProgramar:                boolean;
  puedeReprogramar:              boolean;
  puedeSolicitarReprogramacion:  boolean;
  puedeResolverReprogramacion:   boolean;
  puedeCancelar:                 boolean;
  puedeVerDetalle:               boolean;
}

export interface ConteoSubEstados {
  pendienteProgramar:      number;
  pendienteConfCliente:    number;
  pendienteReprogramacion: number;
  pendienteSsoma:          number;
  total:                   number;
}

export interface ListaProgramacion {
  items:            ItemProgramacion[];
  total:            number;
  pagina:           number;
  porPagina:        number;
  clientes:         OpcionFiltro[];
  areas:            OpcionFiltro[];
  tecnicos:         OpcionFiltro[];
  sedes:            OpcionFiltro[];
  zonas?:           OpcionFiltro[] | null;
  conteoSubEstados?: ConteoSubEstados | null;
}

// ─── HU-36 Ficha Programar Servicio ─────────────────────────────────────────

export interface OrdenParaProgramar {
  idOs:                      number;
  tipo:                      TipoOrden;
  numero:                    string;
  estado:                    string;
  idExpediente?:             number | null;
  numeroExpediente?:         string | null;
  idCliente?:                number | null;
  razonSocial?:              string | null;
  ruc?:                      string | null;
  idSede?:                   number | null;
  sede?:                     string | null;
  ubicacion?:                string | null;
  idPropuesta?:              number | null;
  numeroPropuesta?:          string | null;
  versionPropuesta?:         number | null;
  idTipoServicio?:           number | null;
  tipoServicio?:             string | null;
  numeroRequerimiento?:      string | null;
  idArea?:                   number | null;
  area?:                     string | null;
  fechaProgramadaDesde?:     string | null;
  fechaProgramadaHasta?:     string | null;
  numeroEquipos:             number;
  numeroConceptos:           number;
  idProgramacionActiva?:     number | null;
  codigoProgramacionActiva?: string | null;
  puedeProgramar:            boolean;
  motivoNoProgramable?:      string | null;
}

export interface EquipoProgramacion {
  idOsEquipo:     number;
  idEquipo:       number;
  codigoTw?:      string | null;
  marca?:         string | null;
  modelo?:        string | null;
  numeroSerie?:   string | null;
  ubicacion?:     string | null;
  alcanceMaximo?: string | null;
  orden:          number;
}

export interface ConceptoProgramacion {
  idOsConcepto: number;
  codigo?:      string | null;
  descripcion:  string;
  alcance?:     string | null;
  orden:        number;
}

export interface RequisitoSsomaProgramacion {
  id:                  number;
  idRequisito:         number;
  requisito:           string;
  esObligatorio:       boolean;
  bloqueaServicio:     boolean;
  sede?:               string | null;
  aplicaA:             string;  // 'ambos' | 'tecnico' | 'otro'
  documentoEquivalente?: string | null;
}

export interface FichaProgramacion {
  orden:           OrdenParaProgramar;
  equipos:         EquipoProgramacion[];
  requisitosSsoma: RequisitoSsomaProgramacion[];
  conceptos:       ConceptoProgramacion[];
}

export interface FiltrosTecnicosProgramacion {
  fecha?:              string | null;
  horaInicio?:         string | null;
  horaFin?:            string | null;
  soloDisponibles?:    boolean;
  soloSsomaConforme?:  boolean;
  busqueda?:           string | null;
  sedeOperativa?:      string | null;
  tipoRecurso?:        'tecnico' | 'metrologo' | 'externo' | null;
}

export interface DocumentoSsomaTecnico {
  requisito:        string;
  estado?:          string | null;
  fechaVencimiento?: string | null;
  situacion:        'conforme' | 'por_vencer' | 'bloqueado' | 'sin_documento' | 'sin_verificar';
  requerido:        boolean;
  bloquea:          boolean;
}

export interface TecnicoProgramacion {
  idUsuario:           number;
  nombre:              string;
  cargo?:              string | null;
  area?:               string | null;
  tipoRecurso:         'tecnico' | 'metrologo' | 'externo';
  sedeOperativa?:      string | null;
  sedeOperativaNombre?: string | null;
  disponibilidad:      'disponible' | 'ocupado' | 'sin_horario';
  conflictoOs?:        string | null;
  conflictoDesde?:     string | null;
  conflictoHasta?:     string | null;
  serviciosDia:        number;
  horasDia:            number;
  serviciosMaxDia:     number;
  cupoLibre:           number;
  horasLibres:         number;
  ssomaEstado:         'conforme' | 'por_vencer' | 'incompleto' | 'pendiente' | 'bloqueado';
  ssomaMotivo?:        string | null;
  ssomaFaltantes?:     string | null;
  ssomaRequeridos:     number;
  ssomaCumplidos:      number;
  serviciosCliente:    number;
  experienciaCliente:  'alta' | 'media' | 'sin_experiencia';
  scorecardPct?:       number | null;
  scorecardNivel?:     string | null;
  scorecardServicios?: number | null;
  documentosSsoma:     DocumentoSsomaTecnico[];
}

export interface ContadoresRecurso {
  tecnicos:   number;
  metrologos: number;
  externos:   number;
}

export interface BusquedaTecnicos {
  tecnicos:    TecnicoProgramacion[];
  total:       number;
  contadores?: ContadoresRecurso | null;
}

export interface CrearProgramacionRequest {
  idOs:               number;
  fechaEjecucion:     string;   // yyyy-MM-dd
  horaInicio:         string;   // HH:mm
  horaFin:            string;   // HH:mm
  idTecnicoPrincipal: number;
  idsTecnicosApoyo?:  number[];
  idsEquipos?:        number[];
  observaciones?:     string | null;
}

export interface ProgramacionCreada {
  idProgramacion: number;
  codigo:         string;
  idOs:           number;
  numeroOs:       string;
  estado:         string;
  fechaEjecucion?: string | null;
  horaInicio?:    string | null;
  horaFin?:       string | null;
  advertencias:   string[];
}

export interface DerivarSsomaRequest {
  fecha?:      string | null;
  idsTecnicos: number[];
  comentario?: string | null;
}

export interface PendienteSsomaDerivado {
  idUsuario:        number;
  tecnico:          string;
  requisito:        string;
  situacion:        'bloqueado' | 'por_vencer' | 'sin_documento' | 'sin_verificar';
  fechaVencimiento?: string | null;
}

export interface DerivacionSsoma {
  notificados:          number;
  tecnicosConPendientes: number;
  pendientes:           PendienteSsomaDerivado[];
}

// ─── HU-37 Detalle + Registrar respuesta cliente ────────────────────────────

export interface AccionesDetalleProgramacion {
  puedeRegistrarRespuesta:         boolean;
  puedeReasignar:                  boolean;
  puedeReprogramar:                boolean;
  reprogramacionDirecta:           boolean;
  reprogramacionRequiereSolicitud: boolean;
  puedeCancelar:                   boolean;
  puedeGestionarViaticos:          boolean;
  puedeVerExpediente:              boolean;
}

export interface CabeceraProgramacion {
  idProgramacion:   number;
  codigo:           string;
  estado:           string;
  estadoLabel:      string;
  idOs:             number;
  numeroOs:         string;
  tipo:             TipoOrden;
  estadoOs?:        string | null;
  idExpediente?:    number | null;
  numeroExpediente?: string | null;
  idCliente?:       number | null;
  razonSocial?:     string | null;
  ruc?:             string | null;
  idSede?:          number | null;
  sede?:            string | null;
  ubicacion?:       string | null;
  idPropuesta?:     number | null;
  numeroPropuesta?: string | null;
  versionPropuesta?: number | null;
  idTipoServicio?:  number | null;
  tipoServicio?:    string | null;
  fechaEjecucion?:  string | null;
  horaInicio?:      string | null;
  horaFin?:         string | null;
  duracionHoras?:   number | null;
  observaciones?:   string | null;
  tecnicoPrincipal?: string | null;
  numeroTecnicos:   number;
  numeroEquipos:    number;
  numeroConceptos:  number;
  proximoPaso:      string;
  creadoEn?:        string | null;
  creadoPor?:       string | null;
  bloqueoSsomaActivo: boolean;
  idSolicitudPendiente?: number | null;
  puedeResolverSolicitud: boolean;
  acciones:         AccionesDetalleProgramacion;
}

export interface TecnicoDetalleProgramacion {
  idUsuario:        number;
  nombre:           string;
  cargo?:           string | null;
  rol:              'principal' | 'apoyo';
  ssomaAlProgramar?: string | null;
  ssomaActual?:     string | null;
  ssomaMotivo?:     string | null;
}

export interface EquipoDetalleProgramacion {
  idEquipo:    number;
  codigoTw?:   string | null;
  marca?:      string | null;
  modelo?:     string | null;
  numeroSerie?: string | null;
}

export interface ItemChecklistProgramacion {
  item:           string;
  titulo:         string;
  cumple:         boolean;
  requiereAccion: boolean;
  detalle?:       string | null;
}

export interface AlertaSsomaProgramacion {
  severidad:        'critica' | 'advertencia';
  idUsuario:        number;
  tecnico:          string;
  requisito?:       string | null;
  situacion?:       string | null;
  estadoDocumento?: string | null;
  fechaVencimiento?: string | null;
  diasVencido?:     number | null;
  yaVencio:         boolean;
  mensaje?:         string | null;
}

export interface EventoProgramacion {
  fecha?:         string | null;
  tipo:           string;   // programacion | respuesta_cliente | reprogramacion | aprobacion | cancelacion | estado
  titulo:         string;
  descripcion?:   string | null;
  usuario?:       string | null;
  estadoAnterior?: string | null;
  estadoNuevo?:   string | null;
  motivo?:        string | null;
}

export interface RespuestaClienteProgramacion {
  id:             number;
  canal:          string;
  canalLabel:     string;
  resultado:      string;
  resultadoLabel: string;
  comentario?:    string | null;
  fechaRegistro?: string | null;
  registradoPor?: string | null;
}

export interface DetalleProgramacion {
  programacion:   CabeceraProgramacion;
  tecnicos:       TecnicoDetalleProgramacion[];
  equipos:        EquipoDetalleProgramacion[];
  conceptos:      ConceptoProgramacion[];
  checklist:      ItemChecklistProgramacion[];
  alertasSsoma:   AlertaSsomaProgramacion[];
  historial:      EventoProgramacion[];
  respuestas:     RespuestaClienteProgramacion[];
}

export interface RegistrarRespuestaClienteRequest {
  canal:      'correo' | 'whatsapp' | 'llamada' | 'presencial';
  resultado:  'acepto' | 'pidio_reprogramar' | 'cancelo';
  comentario?: string | null;
}

// ─── HU-38 Reprogramación + Cancelación ────────────────────────────────────

export interface Motivo { idMotivo: number; nombre: string; codigo?: string | null; }

export interface TecnicoReprogramacion { idUsuario: number; nombre: string; cargo?: string | null; rol: 'principal' | 'apoyo'; }

export interface EquipoReprogramacion {
  idEquipo:    number;
  codigoTw?:   string | null;
  marca?:      string | null;
  modelo?:     string | null;
  numSerie?:   string | null;
  reservado:   boolean;
}

export interface ProgramacionPreparada {
  idProgramacion:        number;
  codigo:                string;
  estado:                string;
  estadoLabel:           string;
  idOs:                  number;
  numeroOs:              string;
  tipo:                  TipoOrden;
  estadoOs?:             string | null;
  razonSocial?:          string | null;
  sede?:                 string | null;
  ubicacion?:            string | null;
  tipoServicio?:         string | null;
  fechaEjecucion?:       string | null;
  horaInicio?:           string | null;
  horaFin?:              string | null;
  duracionHoras?:        number | null;
  idTecnicoPrincipal?:   number | null;
  tecnicoPrincipal?:     string | null;
  numeroEquipos:         number;
  viaticosDepositados:   number;
  modo:                  'directa' | 'solicitud';
  idSolicitudPendiente?: number | null;
  puedeReprogramar:      boolean;
  motivoNoReprogramable?: string | null;
  comentarioMaximo:      number;
  tecnicos:              TecnicoReprogramacion[];
  equipos:               EquipoReprogramacion[];
  motivos:               Motivo[];
}

export interface ReprogramarRequest {
  fecha?:              string | null;
  horaInicio?:         string | null;
  horaFin?:            string | null;
  idTecnicoPrincipal?: number | null;
  idsTecnicosApoyo?:   number[] | null;
  idsEquipos?:         number[] | null;
  idMotivo:            number;
  comentario?:         string | null;
}

export interface ReprogramacionResultado {
  modo:                       'directa' | 'solicitud';
  idSolicitud?:               number | null;
  idProgramacion:             number;
  codigo:                     string;
  estado:                     string;
  estadoLabel:                string;
  requiereReconfirmarCliente: boolean;
  cambiaFechaHora:            boolean;
  cambiaTecnicos:             boolean;
  cambiaEquipos:              boolean;
  fechaEjecucion?:            string | null;
  horaInicio?:                string | null;
  horaFin?:                   string | null;
}

export interface SolicitudReprogramacion {
  idSolicitud:              number;
  estado:                   string;
  estadoLabel:              string;
  idProgramacion:           number;
  codigo:                   string;
  idOs:                     number;
  numeroOs:                 string;
  razonSocial?:             string | null;
  solicitante?:             string | null;
  cargoSolicitante?:        string | null;
  fechaSolicitud?:          string | null;
  motivo?:                  string | null;
  comentario?:              string | null;
  fechaActual?:             string | null;
  horaInicioActual?:        string | null;
  horaFinActual?:           string | null;
  duracionActualHoras?:     number | null;
  tecnicoActual?:           string | null;
  fechaPropuesta?:          string | null;
  horaInicioPropuesta?:     string | null;
  horaFinPropuesta?:        string | null;
  duracionPropuestaHoras?:  number | null;
  diasDiferencia?:          number | null;
  tecnicoPropuesto?:        string | null;
  cambiaTecnicoPrincipal:   boolean;
  proponeApoyo:             boolean;
  proponeEquipos:           boolean;
  cambiaFechaHora:          boolean;
  nuevoEstadoLabel?:        string | null;
  viaticosDepositados:      number;
  resueltoPorNombre?:       string | null;
  fechaResolucion?:         string | null;
  comentarioResolucion?:    string | null;
  puedeResolver:            boolean;
  puedeRetirar:             boolean;
  equipoTrabajoPropuesto:   TecnicoReprogramacion[];
  equiposPropuestos:        EquipoReprogramacion[];
}

export interface ResolverSolicitudRequest {
  decision:    'aprobar' | 'rechazar';
  comentario?: string | null;
}

export interface SolicitudResuelta {
  idSolicitud:                number;
  estadoSolicitud:            'aprobada' | 'rechazada' | 'cancelada';
  idProgramacion:             number;
  codigo:                     string;
  estado:                     string;
  estadoLabel:                string;
  requiereReconfirmarCliente: boolean;
}

export interface CancelacionPreparada {
  idProgramacion:     number;
  codigo:             string;
  estado:             string;
  estadoLabel:        string;
  idOs:               number;
  numeroOs:           string;
  tipo:               TipoOrden;
  estadoOs?:          string | null;
  razonSocial?:       string | null;
  puedeCancelar:      boolean;
  motivoNoCancelable?: string | null;
  viaticosDepositados: number;
  idSolicitudPendiente?: number | null;
  comentarioMinimo:   number;
  comentarioMaximo:   number;
  motivos:            Motivo[];
}

export interface CancelarRequest {
  idMotivo:   number;
  comentario?: string | null;
}

export interface CancelacionResultado {
  idProgramacion:       number;
  codigo:               string;
  estado:               string;
  estadoLabel:          string;
  idOs:                 number;
  numeroOs:             string;
  estadoOs?:            string | null;
  motivo?:              string | null;
  viaticosDepositados:  number;
  solicitudesCanceladas: number;
  siguienteAccion?:     string | null;
}

export interface RespuestaClienteRegistrada {
  idConfirmacion:            number;
  idProgramacion:            number;
  codigo:                    string;
  estado:                    string;
  estadoLabel:               string;
  canal:                     string;
  resultado:                 string;
  comentario?:               string | null;
  idOs:                      number;
  numeroOs:                  string;
  siguienteAccion:           string;
  puedeGestionarViaticos:    boolean;
  requiereSolicitud:         boolean;
  requiereMotivoCancelacion: boolean;
  advertencias:              string[];
}
