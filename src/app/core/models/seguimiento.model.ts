// ══════════════════════ HU-17 — Bandeja de Seguimiento Comercial ══════════════════════

export interface FiltrosBandejaSeguimiento {
  idResponsable?: number;
  estado?:        string;   // en_seguimiento | sin_respuesta | requiere_ajuste | vencidos | aceptada | rechazada | oc_pendientes | aceptadas_mes | rechazadas_mes | todas
  busqueda?:      string;
  pagina?:        number;
  porPagina?:     number;
}

export interface KpisSeguimiento {
  enSeguimiento:              number;
  variacionEnSeguimientoPct:  number;
  sinRespuesta:               number;
  seguimientosVencidos:       number;
  aceptadasMes:               number;
  metaAceptadasMes:           number;
  rechazadasMes:              number;
  rechazadasMesAnterior:      number;
  tendenciaRechazadas:        string;   // alza | baja | estable
  ocPendientes:               number;
}

export interface ItemBandejaSeguimiento {
  idPropuesta:            number;
  numero:                 string;
  version:                number;
  idRequerimiento?:       number | null;
  numeroRq?:              string | null;
  idCliente:              number;
  razonSocial:            string;
  ruc?:                   string | null;
  idContacto?:            number | null;
  contacto?:              string | null;
  cargoContacto?:         string | null;
  telefonoContacto?:      string | null;
  correoContacto?:        string | null;
  total:                  number;
  idMoneda:               number;
  moneda?:                string | null;
  monedaSimbolo?:         string | null;
  fechaEnvio?:            string | null;
  diasTranscurridos:      number;
  diasSinRespuesta:       number;
  idResponsable:          number;
  responsable?:           string | null;
  interacciones:          number;
  fechaUltimaInteraccion?: string | null;
  canalUltimo?:           string | null;
  resultadoUltimoCodigo?: string | null;
  resultadoUltimo?:       string | null;
  proximaAccionCodigo?:   string | null;
  proximaAccion?:         string | null;
  proximaAccionDetalle?:  string | null;
  proximaAccionFecha?:    string | null;
  diasParaAccion?:        number | null;
  horasParaAccion?:       number | null;
  prioridadAccion?:       string | null;
  prioridadAccionCodigo?: string | null;
  estadoSeguimiento:      string;   // en_seguimiento | sin_respuesta | requiere_ajuste | aceptada | rechazada
  estadoPropuesta:        string;
  slaEstado:              string;   // en_plazo | proximo | vencido | cumplido | cerrado
  slaPct?:                number | null;
  fechaAceptacion?:       string | null;
  fechaRechazo?:          string | null;
  tieneOc:                boolean;
  ocPorValidar:           number;
}

export interface OpcionFiltro {
  id:      number;
  nombre:  string;
  codigo?: string | null;
}

export interface ParametrosSeguimiento {
  diasSinRespuesta:  number;
  slaHoras:          number;
  alertaHoras:       number;
  metaAceptadasMes:  number;
}

export interface BandejaSeguimiento {
  kpis:          KpisSeguimiento;
  items:         ItemBandejaSeguimiento[];
  total:         number;
  pagina:        number;
  porPagina:     number;
  responsables:  OpcionFiltro[];
  parametros:    ParametrosSeguimiento;
}

// ══════════════════════ HU-18 — Vista Detalle del Seguimiento ══════════════════════

export interface CabeceraDetalleSeguimiento {
  idPropuesta:              number;
  numero:                   string;
  version:                  number;
  idRequerimiento?:         number | null;
  numeroRq?:                string | null;
  idCliente:                number;
  razonSocial:              string;
  ruc?:                     string | null;
  idContacto?:              number | null;
  contacto?:                string | null;
  cargoContacto?:           string | null;
  telefonoContacto?:        string | null;
  correoContacto?:          string | null;
  total:                    number;
  idMoneda:                 number;
  moneda?:                  string | null;
  monedaSimbolo?:           string | null;
  fechaEnvio?:              string | null;
  diasTranscurridos:        number;
  diasSinRespuesta:         number;
  idResponsable:            number;
  responsable?:             string | null;
  interacciones:            number;
  fechaUltimaInteraccion?:  string | null;
  resultadoUltimoCodigo?:   string | null;
  resultadoUltimo?:         string | null;
  proximaAccionCodigo?:     string | null;
  proximaAccion?:           string | null;
  proximaAccionDetalle?:    string | null;
  proximaAccionFecha?:      string | null;
  diasParaAccion?:          number | null;
  horasParaAccion?:         number | null;
  minutosParaAccion?:       number | null;
  idPrioridadAccion?:       number | null;
  prioridadAccion?:         string | null;
  prioridadAccionCodigo?:   string | null;
  idAsignado?:              number | null;
  asignado?:                string | null;
  estadoSeguimiento:        string;
  estadoPropuesta:          string;
  slaEstado:                string;
  slaPct?:                  number | null;
  slaHoras:                 number;
  fechaAceptacion?:         string | null;
  fechaRechazo?:            string | null;
  tieneOc:                  boolean;
  ocPorValidar:             number;
  puedeRegistrarSeguimiento: boolean;
  puedeEjecutarAccion:       boolean;
  puedeRegistrarAceptacion:  boolean;
  puedeRegistrarRechazo:     boolean;
  puedeReprogramar:          boolean;
  reprogramaciones:          number;
  permiteReactivacion:       boolean;
}

export interface EventoTimelineSeguimiento {
  fecha:          string;
  tipo:           string;   // propuesta_creada | vb_* | enviada_cliente | seguimiento | cierre_* | accion_reprogramada | orden_compra
  titulo:         string;
  descripcion?:   string | null;
  version:        number;
  idUsuario?:     number | null;
  usuario?:       string | null;
  canalCodigo?:   string | null;
  canal?:         string | null;
  resultadoCodigo?: string | null;
  idSeguimiento?: number | null;
  duracionMinutos?: number | null;
  asunto?:        string | null;
  adjuntos:       number;
}

export interface ProximaAccionSeguimiento {
  idSeguimiento:  number;
  fecha?:         string | null;
  tipoCodigo?:    string | null;
  tipo:           string;
  detalle?:       string | null;
  idPrioridad?:   number | null;
  prioridad?:     string | null;
  prioridadCodigo?: string | null;
  idAsignado?:    number | null;
  asignado?:      string | null;
  estado:         string;   // pendiente | vencida | realizada | reprogramada | cancelada
  programadaEn?:  string | null;
}

export interface ContactoSeguimiento {
  idContacto:                 number;
  nombres:                    string;
  cargo?:                     string | null;
  area?:                      string | null;
  correo?:                    string | null;
  telefonoMovil?:             string | null;
  telefonoAnexo?:             string | null;
  estado?:                    string | null;
  esContactoPrincipal:        boolean;
  autorizadoAprobarCotizaciones: boolean;
  esContactoPropuesta:        boolean;
}

export interface DocumentoSeguimiento {
  tipo:     string;   // propuesta_pdf | orden_compra | adjunto_seguimiento
  nombre:   string;
  fecha?:   string | null;
  version:  number;
  url?:     string | null;
  estado?:  string | null;
}

export interface DetalleSeguimiento {
  cabecera:          CabeceraDetalleSeguimiento;
  timeline:          EventoTimelineSeguimiento[];
  proximasAcciones:  ProximaAccionSeguimiento[];
  contactos:         ContactoSeguimiento[];
  documentos:        DocumentoSeguimiento[];
}

// ══════════════════════ HU-19 — Registro de acciones ══════════════════════

export interface ProximaAccionEntrada {
  idTipoAccion?:   number | null;
  fecha?:          string | null;
  idResponsable?:  number | null;
  idPrioridad?:    number | null;
  detalle?:        string | null;
  minutosAntesNotificar?: number | null;  // Notificación anticipada: 5/10/15/20/30/60 min
}

export interface RegistrarSeguimientoRequest {
  idCanal?:                number | null;
  idResultado?:            number | null;
  idContacto?:             number | null;
  fechaInteraccion?:       string | null;
  notas?:                  string | null;
  programarProximaAccion:  boolean;
  proximaAccion?:          ProximaAccionEntrada | null;
  ejecutaAccionPendiente:  boolean;
}

export interface RegistrarLlamadaRequest {
  idContacto?:             number | null;
  fechaInteraccion?:       string | null;
  duracionMinutos?:        number | null;
  idResultado?:            number | null;
  notas?:                  string | null;
  programarProximaAccion:  boolean;
  proximaAccion?:          ProximaAccionEntrada | null;
  ejecutaAccionPendiente:  boolean;
}

export interface DestinatarioSeguimiento {
  correo:      string;
  nombre?:     string | null;
  idContacto?: number | null;
}

export interface CorreoSeguimientoRequest {
  idCorreo?:               number | null;
  idPlantilla?:            number | null;
  para:                    DestinatarioSeguimiento[];
  cc:                      DestinatarioSeguimiento[];
  asunto?:                 string | null;
  cuerpoHtml?:             string | null;
  idContacto?:             number | null;
  idResultado?:            number | null;
  programarProximaAccion:  boolean;
  proximaAccion?:          ProximaAccionEntrada | null;
  ejecutaAccionPendiente:  boolean;
}

export interface CabeceraRegistroSeguimiento {
  idPropuesta:            number;
  numero:                 string;
  version:                number;
  idCliente:              number;
  razonSocial:            string;
  referencia?:            string | null;
  idContacto?:            number | null;
  contacto?:              string | null;
  telefonoContacto?:      string | null;
  correoContacto?:        string | null;
  idUsuario:              number;
  usuario?:               string | null;
  correoUsuario?:         string | null;
  cargoUsuario?:          string | null;
  fechaServidor?:         string | null;
  estadoSeguimiento:      string;
  proximaAccionCodigo?:   string | null;
  proximaAccion?:         string | null;
  proximaAccionFecha?:    string | null;
  canalSugeridoCodigo?:   string | null;
  plantillaSugeridaCodigo?: string | null;
}

export interface OpcionSeguimiento {
  id:     number;
  nombre: string;
  codigo?: string | null;
}

export interface ContactoRegistroSeguimiento {
  idContacto:          number;
  nombres:             string;
  cargo?:              string | null;
  correo?:             string | null;
  telefonoMovil?:      string | null;
  telefonoAnexo?:      string | null;
  esContactoPropuesta: boolean;
  esContactoPrincipal: boolean;
}

export interface ResponsableSeguimiento {
  id:              number;
  nombre:          string;
  cargo?:          string | null;
  esUsuarioActual: boolean;
}

export interface PlantillaCorreoSeguimiento {
  idPlantilla: number;
  codigo:      string;
  nombre:      string;
  asunto:      string;
  cuerpoHtml:  string;
}

export interface BorradorCorreoSeguimiento {
  idCorreo:    number;
  idPlantilla?: number | null;
  para:        DestinatarioSeguimiento[];
  cc:          DestinatarioSeguimiento[];
  asunto:      string;
  cuerpoHtml:  string;
  estado:      string;   // borrador | error
  error?:      string | null;
  fecha?:      string | null;
}

export interface PreparacionRegistroSeguimiento {
  cabecera:          CabeceraRegistroSeguimiento;
  tiposSeguimiento:  OpcionSeguimiento[];
  resultados:        OpcionSeguimiento[];
  contactos:         ContactoRegistroSeguimiento[];
  tiposTarea:        OpcionSeguimiento[];
  prioridades:       OpcionSeguimiento[];
  responsables:      ResponsableSeguimiento[];
  plantillas:        PlantillaCorreoSeguimiento[];
  borrador?:         BorradorCorreoSeguimiento | null;
}

export interface ResultadoRegistroSeguimiento {
  idSeguimiento: number;
  idCorreo?:     number | null;
}

export interface AdjuntoSeguimiento {
  idAdjunto:     number;
  nombreArchivo: string;
  tamanoBytes:   number;
  url:           string;
}

// ══════════════════════ HU-20 — Reprogramación ══════════════════════

export interface ReprogramarAccionRequest {
  idTipoAccion?:  number | null;
  fecha?:         string | null;
  idPrioridad?:   number | null;
  idResponsable?: number | null;
  idMotivo?:      number | null;
  detalle?:       string | null;
  minutosAntesNotificar?: number | null;  // Notificación anticipada: 5/10/15/20/30/60 min
}

export interface AccionActualSeguimiento {
  idPropuesta:         number;
  numero:              string;
  version:             number;
  idCliente:           number;
  razonSocial:         string;
  proximaAccionCodigo?: string | null;
  proximaAccion?:      string | null;
  idTipoAccion?:       number | null;
  fechaProgramada?:    string | null;
  idPrioridad?:        number | null;
  prioridad?:          string | null;
  prioridadCodigo?:    string | null;
  idResponsable?:      number | null;
  responsable?:        string | null;
  origen:              string;   // programada | calculada
  slaEstado:           string;
  estadoSeguimiento:   string;
  reprogramaciones:    number;
  fechaServidor?:      string | null;
}

export interface ReprogramacionHistorial {
  idReprogramacion:  number;
  fecha?:            string | null;
  fechaAnterior?:    string | null;
  tipoAnterior?:     string | null;
  fechaNueva?:       string | null;
  tipoNuevo?:        string | null;
  prioridadNueva?:   string | null;
  responsableNuevo?: string | null;
  motivo?:           string | null;
  motivoCodigo?:     string | null;
  detalle?:          string | null;
  usuario?:          string | null;
}

export interface PreparacionReprogramacion {
  accionActual:  AccionActualSeguimiento;
  tiposAccion:   OpcionSeguimiento[];
  prioridades:   OpcionSeguimiento[];
  responsables:  ResponsableSeguimiento[];
  motivos:       OpcionSeguimiento[];
  historial:     ReprogramacionHistorial[];
}

export interface ResultadoReprogramacion {
  idReprogramacion: number;
}

// ══════════════════════ HU-21 — Cierre del seguimiento ══════════════════════

export interface RegistrarAceptacionRequest {
  idTipoAceptacion?: number | null;
  idContacto?:       number | null;
  fecha?:            string | null;
  comentario?:       string | null;
}

export interface RegistrarRechazoRequest {
  idMotivo?:   number | null;
  fecha?:      string | null;
  comentario?: string | null;
}

export interface CabeceraCierreSeguimiento {
  idPropuesta:       number;
  numero:            string;
  version:           number;
  idCliente:         number;
  razonSocial:       string;
  ruc?:              string | null;
  idRequerimiento?:  number | null;
  numeroRq?:         string | null;
  total:             number;
  idMoneda:          number;
  moneda?:           string | null;
  monedaSimbolo?:    string | null;
  idResponsable:     number;
  responsable?:      string | null;
  idContacto?:       number | null;
  contacto?:         string | null;
  cargoContacto?:    string | null;
  estadoSeguimiento: string;
  diasTranscurridos: number;
  fechaServidor?:    string | null;
}

export interface PreparacionCierreSeguimiento {
  cabecera:         CabeceraCierreSeguimiento;
  tiposAceptacion:  OpcionSeguimiento[];
  motivosRechazo:   OpcionSeguimiento[];
  contactos:        ContactoRegistroSeguimiento[];
}

export interface ResultadoCierreSeguimiento {
  idSeguimiento:     number;
  estadoSeguimiento: string;
  siguienteEtapa?:   string | null;
}
