// Mapper entre:
//   - Modelos del front (PreparacionNuevaOs, PreparacionEdicionOs, GuardarOrdenServicioRequest…)
//   - DTOs del back (FichaOrdenServicioDto, GuardarOrdenServicioDto, …).
//
// El back usa un único `FichaOrdenServicioDto` con un campo `modo` para distinguir
// nueva vs edición. El front los tiene como 2 interfaces separadas, así que acá
// hacemos la bifurcación.

import {
  AnalisisImportacionOsOm,
  AnularOsRequest,
  AvanceEquipoOs,
  AvancePorEquiposOs,
  ClasificacionEquipoOs,
  ConceptoCatalogoOs,
  ConceptoDetalleOs,
  ContactoClienteOs,
  DatosCertificadoOm,
  DatosGeneralesOs,
  DetalleOrdenServicio,
  EquipoCatalogoClienteOs,
  EquipoDetalleOs,
  EstadoEjecucionEquipo,
  EstadoFilaImportacionOs,
  EstadoOrdenServicio,
  EstadoGrupoOrdenServicio,
  FilaConceptoImportado,
  FilaEquipoImportado,
  GuardarOrdenServicioRequest,
  ImpactoAnulacionOs,
  JefeComercialOs,
  MotivoAnulacionOs,
  MotivoEdicionOs,
  PreparacionEdicionOs,
  PreparacionNuevaOs,
  ProgramacionOs,
  PropuestaDisponibleOs,
  PropuestaOrigenOs,
  SolicitarEdicionOsRequest,
  SolicitudEdicionOs,
  TipoOrden,
} from '../models/ordenes-servicio.model';

// ─── Shapes del back (camelCase sobre el wire, serialización default de ASP.NET) ─

export interface PropuestaDisponibleOsApi {
  idPropuesta:         number;
  numero:              string;
  version:             number;
  tipoServicio:        string | null;
  tipo:                string;      // "OS" | "OM"
  idCliente:           number;
  razonSocial:         string;
  ruc:                 string | null;
  sede:                string | null;
  idRequerimiento:     number | null;
  numeroRequerimiento: string | null;
  area:                string | null;
  idResponsable:       number | null;
  responsable:         string | null;
  fechaAceptacion:     string | null;
  montoTotal:          number | null;
  simboloMoneda:       string | null;
  equiposCotizados:    number;
  conceptosCotizados:  number;
}

export interface PropuestasDisponiblesOsApi {
  items:     PropuestaDisponibleOsApi[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

export interface ContactoClienteOsApi {
  idContacto:   number;
  nombres:      string;
  cargo:        string | null;
  correo:       string | null;
  telefono:     string | null;
  esPrincipal:  boolean;
}

export interface PropuestaOrigenOsApi {
  idPropuesta:        number;
  numero:             string;
  version:            number;
  estado:             string | null;
  tipoServicio:       string | null;
  fechaAceptacion:    string | null;
  comercial:          string | null;
  aprobadorVb:        string | null;
  montoTotal:         number | null;
  simboloMoneda:      string | null;
  equiposCotizados:   number;
  conceptosCotizados: number;
  condicionPago:      string | null;
}

export interface CertificadoOsApi {
  esTercerizado: boolean;
  editable:      boolean;
  razonSocial:   string | null;
  ruc:           string | null;
  direccion:     string | null;
  contacto:      string | null;
}

export interface ConceptoOsApi {
  idOsConcepto:     number | null;
  idSuministro:     number | null;
  codigo:           string | null;
  descripcion:      string;
  clasificacion:    string | null;
  alcance:          string | null;
  sugerido:         boolean;
  equiposAplicados: string[];
  general:          boolean;
}

export interface EquipoOsApi {
  idOsEquipo:        number | null;
  orden:             number | null;
  idEquipo:          number;
  codigoTw:          string;
  numSerie:          string;
  codigoCliente:     string | null;
  clasificacion:     string;
  clasificacionLabel: string;
  marca:             string;
  modelo:            string;
  alcance:           string | null;
  ubicacion:         string | null;
  sede:              string | null;
  divisionMinima:    string | null;
  divisionVerif:     string | null;
  claseExactitud:    string | null;
  escala:            string | null;
  puntosCalibracion: string | null;
  valorNominal:      string | null;
  estadoEjecucion:   string | null;
}

export interface FichaOrdenServicioApi {
  modo:                   'nueva' | 'borrador' | 'edicion_aprobada';
  idOs:                   number | null;
  numero:                 string;
  tipo:                   string;      // "OS" | "OM"
  estado:                 string;
  idSolicitudAprobada:    number | null;
  motivoEdicion:          string | null;
  edicionAprobadaPor:     string | null;
  cargoAprobadorEdicion:  string | null;
  fechaAprobacionEdicion: string | null;
  idCliente:              number;
  razonSocial:            string;
  ruc:                    string | null;
  idSede:                 number | null;
  sede:                   string | null;
  direccionOperaciones:   string | null;
  idContacto:             number | null;
  idResponsable:          number | null;
  responsable:            string | null;
  cargoResponsable:       string | null;
  contactos:              ContactoClienteOsApi[];
  propuesta:              PropuestaOrigenOsApi;
  fechaEmision:           string;
  idRequerimiento:        number | null;
  numeroRq:               string | null;
  fechaProgramadaDesde:   string | null;
  fechaProgramadaHasta:   string | null;
  conceptos:              ConceptoOsApi[];
  equipos:                EquipoOsApi[];
  observaciones:          string | null;
  certificado:            CertificadoOsApi | null;
}

export interface EquipoGuardarOsApi {
  idEquipo:  number;
  conceptos: number[];   // idSuministro
}

export interface GuardarOrdenServicioApi {
  idPropuesta:          number | null;
  idContacto:           number | null;
  fechaProgramadaDesde: string | null;
  fechaProgramadaHasta: string | null;
  observaciones:        string | null;
  certRazonSocial:      string | null;
  certRuc:              string | null;
  certDireccion:        string | null;
  certContacto:         string | null;
  conceptos:            number[];              // idSuministro
  equipos:              EquipoGuardarOsApi[];
  emitir:               boolean;
}

export interface OrdenServicioGuardadaApi {
  idOs:   number;
  numero: string;
  tipo:   string;
  estado: string;
}

// ─── Mappers Back → Front ────────────────────────────────────────────────────

export function mapPropuestaDisponibleOs(dto: PropuestaDisponibleOsApi): PropuestaDisponibleOs {
  return {
    idPropuesta:         dto.idPropuesta,
    numero:              dto.numero,
    version:             dto.version,
    razonSocial:         dto.razonSocial,
    ruc:                 dto.ruc ?? '',
    idRequerimiento:     dto.idRequerimiento,
    numeroRequerimiento: dto.numeroRequerimiento,
    tipoServicio:        dto.tipoServicio ?? '',
    tipoOrden:           dto.tipo as TipoOrden,
    fechaAceptacion:     dto.fechaAceptacion ?? '',
    comercial:           dto.responsable ?? '',
    cantidadEquipos:     dto.equiposCotizados,
    cantidadConceptos:   dto.conceptosCotizados,
  };
}

function mapContacto(c: ContactoClienteOsApi): ContactoClienteOs {
  return {
    idContacto:  c.idContacto,
    nombre:      c.nombres,
    cargo:       c.cargo,
    esPrincipal: c.esPrincipal,
  };
}

function mapPropuestaOrigen(p: PropuestaOrigenOsApi): PropuestaOrigenOs {
  const estadoNormalizado = (p.estado ?? '').toLowerCase();
  const estadoLabel = {
    aceptado:  'Aceptada',
    aceptada:  'Aceptada',
    emitida:   'Emitida',
    revocada:  'Revocada',
    anulada:   'Anulada',
    rechazada: 'Rechazada',
  }[estadoNormalizado] ?? (p.estado ?? '');
  return {
    idPropuesta:               p.idPropuesta,
    codigo:                    p.numero,
    version:                   p.version,
    estado:                    p.estado ?? '',
    estadoLabel,
    tipoServicio:              p.tipoServicio ?? '',
    fechaAceptacion:           p.fechaAceptacion,
    comercial:                 p.comercial ?? '',
    aprobadorVb:               p.aprobadorVb,
    montoTotal:                p.montoTotal ?? 0,
    moneda:                    p.simboloMoneda ?? '',
    cantidadEquiposCotizados:  p.equiposCotizados,
    cantidadConceptosCotizados: p.conceptosCotizados,
    condicionPago:             p.condicionPago,
  };
}

function mapCertificado(c: CertificadoOsApi | null | undefined): DatosCertificadoOm | undefined {
  if (!c) return undefined;
  return {
    esTercerizado: c.esTercerizado,
    razonSocial:   c.razonSocial ?? '',
    ruc:           c.ruc ?? '',
    direccion:     c.direccion,
    contacto:      c.contacto,
  };
}

function mapConcepto(c: ConceptoOsApi): ConceptoDetalleOs {
  return {
    // El back separa idOsConcepto (fila guardada) vs idSuministro (ref al catálogo).
    // Al enviar el guardar, el back espera idSuministro. Preferimos ese valor acá
    // para que el redondeo sea limpio.
    idConcepto:       c.idSuministro ?? c.idOsConcepto ?? 0,
    codigo:           c.codigo ?? '',
    descripcion:      c.descripcion,
    clasificacion:    c.clasificacion,
    tipo:             null,
    subtipo:          null,
    alcance:          c.alcance ?? null,
    equiposAplicados: c.equiposAplicados ?? [],
    deLaPropuesta:    c.sugerido,
  };
}

/**
 * Al mapear equipos, hay que calcular `conceptosAplicados` a partir de los
 * conceptos (back lo guarda al revés: cada concepto tiene su lista de
 * códigos TW de equipos; el front invierte esa relación por equipo).
 */
function mapEquipo(e: EquipoOsApi, codigosConceptosPorCodigoTw: Map<string, string[]>): EquipoDetalleOs {
  return {
    item:               e.orden ?? 0,
    idEquipo:           e.idEquipo,
    clasificacion:      e.clasificacion as ClasificacionEquipoOs,
    clasificacionLabel: e.clasificacionLabel,
    marca:              e.marca,
    modelo:             e.modelo,
    numSerie:           e.numSerie,
    codigoTw:           e.codigoTw,
    alcance:            e.alcance,
    ubicacion:          e.ubicacion,
    conceptosAplicados: codigosConceptosPorCodigoTw.get(e.codigoTw) ?? [],
    d:                  e.divisionMinima,
    e:                  e.divisionVerif,
    clase:              e.claseExactitud,
    escala:             e.escala,
    puntosCalibracion:  e.puntosCalibracion,
  };
}

/** Invierte conceptos.equiposAplicados → equipo.conceptosAplicados (por códigoTw). */
function construirIndiceConceptosPorEquipo(conceptos: ConceptoOsApi[]): Map<string, string[]> {
  const indice = new Map<string, string[]>();
  for (const c of conceptos) {
    const codigo = c.codigo ?? '';
    if (!codigo) continue;
    for (const codigoTw of c.equiposAplicados ?? []) {
      const acum = indice.get(codigoTw) ?? [];
      acum.push(codigo);
      indice.set(codigoTw, acum);
    }
  }
  return indice;
}

export function mapFichaApiToPreparacionNueva(dto: FichaOrdenServicioApi): PreparacionNuevaOs {
  const tipo = dto.tipo as TipoOrden;
  const idx  = construirIndiceConceptosPorEquipo(dto.conceptos);
  return {
    numeroSugerido:          dto.numero,
    tipo,
    tipoLabel:               tipo === 'OM' ? 'Orden de Metrología' : 'Orden de Servicio',
    fechaEmision:            dto.fechaEmision,
    idCliente:               dto.idCliente,
    razonSocial:             dto.razonSocial,
    ruc:                     dto.ruc ?? '',
    direccionOperaciones:    dto.direccionOperaciones,
    contactos:               dto.contactos.map(mapContacto),
    idContactoDefault:       dto.idContacto,
    idResponsable:           dto.idResponsable ?? 0,
    nombreResponsable:       dto.responsable ?? '',
    propuestaOrigen:         mapPropuestaOrigen(dto.propuesta),
    idRequerimiento:         dto.idRequerimiento,
    numeroRequerimiento:     dto.numeroRq,
    rqEsTercerizado:         dto.certificado?.esTercerizado,
    datosCertificadoDefault: mapCertificado(dto.certificado),
    conceptosSugeridos:      dto.conceptos.map(mapConcepto),
    equiposSugeridos:        dto.equipos.map(e => mapEquipo(e, idx)),
  };
}

export function mapFichaApiToPreparacionEdicion(dto: FichaOrdenServicioApi): PreparacionEdicionOs {
  const tipo = dto.tipo as TipoOrden;
  const idx  = construirIndiceConceptosPorEquipo(dto.conceptos);
  const detalle = {
    idOs:                   dto.idOs ?? 0,
    tipo,
    numero:                 dto.numero,
    estado:                 dto.estado as EstadoOrdenServicio,
    estadoGrupo:            dto.estado as EstadoGrupoOrdenServicio,
    estadoLabel:            '',
    idExpediente:           null,
    responsable:            dto.responsable ?? '',
    idResponsable:          dto.idResponsable ?? 0,
    puedeSolicitarEdicion:  false,
    puedeResolverSolicitud: false,
    puedeEditar:            dto.modo === 'edicion_aprobada',
    puedeAnular:            false,
    solicitudPendiente:     null,
    datosGenerales: {
      cliente:              dto.razonSocial,
      ruc:                  dto.ruc ?? '',
      direccionOperaciones: dto.direccionOperaciones,
      sede:                 dto.sede,
      contacto:             dto.contactos.find(c => c.idContacto === dto.idContacto)?.nombres ?? '',
      fechaEmision:         dto.fechaEmision,
      numeroRequerimiento:  dto.numeroRq,
      numeroPropuesta:      dto.propuesta.numero,
      versionPropuesta:     dto.propuesta.version,
    } as any,
    avancePorEquipos: { total: dto.equipos.length, ejecutados: 0, pendientes: dto.equipos.length } as any,
    propuestaOrigen: mapPropuestaOrigen(dto.propuesta),
    equipos:        dto.equipos.map(e => mapEquipo(e, idx)),
    conceptos:      dto.conceptos.map(mapConcepto),
    observaciones:  dto.observaciones ?? '',
    programacion:   { tieneProgramacion: false } as any,
    datosCertificado: mapCertificado(dto.certificado),
  } as any;

  return {
    detalle,
    contactos:        dto.contactos.map(mapContacto),
    idContactoActual: dto.idContacto,
    autorizacion:     dto.modo === 'edicion_aprobada' && dto.idSolicitudAprobada ? {
      jefeComercial:     dto.edicionAprobadaPor ?? '',
      fechaAutorizacion: dto.fechaAprobacionEdicion ?? '',
      motivoLabel:       dto.motivoEdicion ?? '',
      comentario:        '',
      idSolicitud:       dto.idSolicitudAprobada,
    } : null,
  };
}

// ─── Mapper Front → Back ────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// HU-42 Detalle — Base + 6 tabs lazy
// ═════════════════════════════════════════════════════════════════════════════

export interface AvanceEquipoOsApi {
  idOsEquipo:         number;
  idEquipo:           number;
  codigoTw:           string;
  clasificacion:      string;
  clasificacionLabel: string;
  marca:              string;
  modelo:             string;
  numSerie:           string;
  estadoEjecucion:    string;
  fechaEjecucion:     string | null;
  observacion:        string | null;
}

export interface AvanceOrdenServicioApi {
  total:       number;
  pendientes:  number;
  enProceso:   number;
  ejecutados:  number;
  observados:  number;
  porcentaje:  number;
  equipos:     AvanceEquipoOsApi[];
}

export interface SolicitudPendienteOsApi {
  idSolicitud:    number;
  motivo:         string | null;
  comentario:     string | null;
  fechaSolicitud: string | null;
  idSolicitante:  number | null;
  solicitante:    string | null;
  idAprobador:    number | null;
  aprobador:      string | null;
}

export interface DetalleOrdenServicioApi {
  idOs:                   number;
  tipo:                   string;
  numero:                 string;
  estado:                 string;
  estadoGrupo:            string;
  estadoLabel:            string;
  idCliente:              number | null;
  razonSocial:            string | null;
  ruc:                    string | null;
  direccionOperaciones:   string | null;
  idContacto:             number | null;
  contacto:               string | null;
  cargoContacto:          string | null;
  telefonoContacto:       string | null;
  correoContacto:         string | null;
  idResponsable:          number | null;
  responsable:            string | null;
  fechaEmision:           string | null;
  fechaDocumento:         string | null;
  fechaProgramadaDesde:   string | null;
  fechaProgramadaHasta:   string | null;
  diasHabilesEstimados:   number | null;
  idPropuesta:            number | null;
  numeroPropuesta:        string | null;
  versionPropuesta:       number | null;
  idRequerimiento:        number | null;
  numeroRq:               string | null;
  idExpediente:           number | null;
  numeroEquipos:          number;
  numeroConceptos:        number;
  solicitudPendiente:     SolicitudPendienteOsApi | null;
  edicionAprobada:        boolean;
  puedeEditar:            boolean;
  puedeSolicitarEdicion:  boolean;
  puedeResolverSolicitud: boolean;
  puedeAnular:            boolean;
  motivoAnulacion:        string | null;
  comentarioAnulacion:    string | null;
  anuladoEn:              string | null;
  anuladoPor:             string | null;
  ultimaActualizacion:    string | null;
  actualizadoPor:         string | null;
  avance:                 AvanceOrdenServicioApi;
}

export interface PersonalAsignadoOsApi {
  idUsuario:   number;
  nombre:      string;
  rol:         string | null;
  estadoSsoma: string | null;
}

export interface ProgramacionOrdenServicioApi {
  estado:               string;
  tieneProgramacion:    boolean;
  idTecnico:            number | null;
  tecnico:              string | null;
  fechaEjecucion:       string | null;
  horaInicio:           string | null;
  horaFinEstimada:      string | null;
  horaLlegadaReal:      string | null;
  horaFinReal:          string | null;
  estadoPreparacion:    string | null;
  confirmacionCliente:  boolean;
  viaticos:             number | null;
  simboloMoneda:        string | null;
  notasOperativas:      string | null;
  personal:             PersonalAsignadoOsApi[];
  mensaje:              string | null;
}

// ─── Mappers Tabs → Front ────────────────────────────────────────────────────

function mapAvanceEquipo(e: AvanceEquipoOsApi): AvanceEquipoOs {
  const desc = [e.marca, e.modelo].filter(Boolean).join(' ') + (e.numSerie ? ` · ${e.numSerie}` : '');
  return {
    idEquipo:       e.idEquipo,
    codigoTw:       e.codigoTw,
    descripcion:    desc || e.codigoTw,
    estado:         e.estadoEjecucion as EstadoEjecucionEquipo,
    estadoLabel:    labelEstadoEjecucion(e.estadoEjecucion),
    fechaEjecucion: e.fechaEjecucion,
  };
}

function labelEstadoEjecucion(e: string): string {
  switch (e) {
    case 'pendiente':  return 'Pendiente';
    case 'en_proceso': return 'En proceso';
    case 'ejecutado':  return 'Ejecutado';
    case 'observado':  return 'Observado';
    default:           return e;
  }
}

function mapAvance(a: AvanceOrdenServicioApi): AvancePorEquiposOs {
  return {
    totalEquipos:     a.total,
    ejecutados:       a.ejecutados,
    porcentaje:       a.porcentaje,
    actualizadoDesde: 'Módulo 11 Ejecución',
    descripcion:      undefined,
    equipos:          (a.equipos ?? []).map(mapAvanceEquipo),
  };
}

function mapSolicitudPendiente(s: SolicitudPendienteOsApi | null): SolicitudEdicionOs | null {
  if (!s) return null;
  return {
    idSolicitud:    s.idSolicitud,
    motivo:         s.motivo ?? '',
    motivoLabel:    s.motivo ?? '',
    comentario:     s.comentario ?? '',
    solicitadaPor:  s.solicitante ?? '',
    fechaSolicitud: s.fechaSolicitud ?? '',
    dirigidaA:      s.aprobador ?? '',
    idDirigidaA:    s.idAprobador ?? 0,
    estado:         'pendiente',
  };
}

/**
 * Mapea la respuesta base del detalle a `DetalleOrdenServicio`.
 * Los campos de los tabs lazy (propuestaOrigen, equipos, conceptos, observaciones,
 * programacion, datosCertificado) quedan con placeholders — se completan luego al
 * activar cada tab.
 */
export function mapDetalleBaseApi(dto: DetalleOrdenServicioApi): DetalleOrdenServicio {
  const tipo = dto.tipo as TipoOrden;
  return {
    idOs:                   dto.idOs,
    tipo,
    numero:                 dto.numero,
    estado:                 dto.estado as EstadoOrdenServicio,
    estadoGrupo:            dto.estadoGrupo as EstadoGrupoOrdenServicio,
    estadoLabel:            dto.estadoLabel,
    idExpediente:           dto.idExpediente,
    responsable:            dto.responsable ?? '',
    idResponsable:          dto.idResponsable ?? 0,
    puedeSolicitarEdicion:  dto.puedeSolicitarEdicion,
    puedeResolverSolicitud: dto.puedeResolverSolicitud,
    puedeEditar:            dto.puedeEditar,
    puedeAnular:            dto.puedeAnular,
    solicitudPendiente:     mapSolicitudPendiente(dto.solicitudPendiente),
    datosGenerales: {
      numero:               dto.numero,
      tipo,
      tipoLabel:            tipo === 'OM' ? 'OM (Orden de Metrología)' : 'OS (Orden de Servicio)',
      fechaEmision:         dto.fechaEmision,
      fechaProgramadaDesde: dto.fechaProgramadaDesde,
      fechaProgramadaHasta: dto.fechaProgramadaHasta,
      diasHabilesEstimados: dto.diasHabilesEstimados,
      razonSocial:          dto.razonSocial ?? '',
      ruc:                  dto.ruc ?? '',
      direccionOperaciones: dto.direccionOperaciones,
      contactoPlanta:       dto.contacto,
      comercialResponsable: dto.responsable ?? '',
      numeroRequerimiento:  dto.numeroRq,
      idRequerimiento:      dto.idRequerimiento,
    } as DatosGeneralesOs,
    avancePorEquipos:       mapAvance(dto.avance),
    // Placeholders — se llenan al activar su tab
    propuestaOrigen: {
      idPropuesta:               dto.idPropuesta ?? 0,
      codigo:                    dto.numeroPropuesta ?? '',
      version:                   dto.versionPropuesta ?? 0,
      estado:                    '',
      estadoLabel:               '',
      tipoServicio:              '',
      fechaAceptacion:           null,
      comercial:                 '',
      aprobadorVb:               null,
      montoTotal:                0,
      moneda:                    '',
      cantidadEquiposCotizados:  0,
      cantidadConceptosCotizados: 0,
      condicionPago:             null,
    },
    equipos:         [],
    conceptos:       [],
    observaciones:   '',
    programacion: {
      tieneProgramacion: false,
    },
    datosCertificado:          undefined,
    ultimaActualizacion:       dto.ultimaActualizacion ?? '',
    usuarioUltimaActualizacion: dto.actualizadoPor ?? '',
    fuenteUltimaActualizacion: undefined,
  };
}

export function mapTabPropuestaApi(dto: PropuestaOrigenOsApi): PropuestaOrigenOs {
  return mapPropuestaOrigen(dto);
}

/**
 * Mapea los equipos del tab Equipos. Para calcular `conceptosAplicados` necesita
 * la lista de conceptos (del tab Conceptos). Si no la tiene, el array queda vacío
 * y debe re-ejecutarse cuando se cargue el otro tab.
 */
export function mapTabEquiposApi(dtos: EquipoOsApi[], conceptos?: ConceptoOsApi[]): EquipoDetalleOs[] {
  const idx = construirIndiceConceptosPorEquipo(conceptos ?? []);
  return dtos.map(e => mapEquipo(e, idx));
}

export function mapTabConceptosApi(dtos: ConceptoOsApi[]): ConceptoDetalleOs[] {
  return dtos.map(mapConcepto);
}

export function mapTabObservacionesApi(dto: string | null): string {
  return dto ?? '';
}

export function mapTabProgramacionApi(dto: ProgramacionOrdenServicioApi): ProgramacionOs {
  return {
    tieneProgramacion:  dto.tieneProgramacion,
    tecnicoAsignado:    dto.tecnico,
    fechaReal:          dto.fechaEjecucion,
    horaInicio:         dto.horaInicio,
    horaFin:            dto.horaFinEstimada,
    estadoPreparacion:  dto.estadoPreparacion,
    viaticosAsignados:  dto.viaticos,
    moneda:             dto.simboloMoneda,
  };
}

export function mapTabCertificadoApi(dto: CertificadoOsApi | null): DatosCertificadoOm | undefined {
  return mapCertificado(dto);
}

export function mapGuardarRequestToApi(req: GuardarOrdenServicioRequest): GuardarOrdenServicioApi {
  // Para cada equipo: conceptos aplicados son los que tienen el codigoTw del equipo.
  // Convertimos esos códigos a los idSuministro correspondientes.
  const idPorCodigo = new Map(req.conceptos.map(c => [c.codigo, c.idConcepto]));

  return {
    idPropuesta:          req.idPropuesta,
    idContacto:           req.idContacto,
    fechaProgramadaDesde: req.fechaProgramadaDesde ?? null,
    fechaProgramadaHasta: req.fechaProgramadaHasta ?? null,
    observaciones:        req.observaciones || null,
    certRazonSocial:      req.datosCertificado?.razonSocial ?? null,
    certRuc:              req.datosCertificado?.ruc ?? null,
    certDireccion:        req.datosCertificado?.direccion ?? null,
    certContacto:         req.datosCertificado?.contacto ?? null,
    conceptos:            req.conceptos.map(c => c.idConcepto),
    equipos:              req.equipos.map(e => ({
      idEquipo:  e.idEquipo,
      conceptos: (e.conceptosAplicados ?? [])
        .map(codigo => idPorCodigo.get(codigo))
        .filter((id): id is number => id != null),
    })),
    emitir: req.emitir,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-40 Fase C — Solicitar edición, Anular, Resolver solicitud
// ═════════════════════════════════════════════════════════════════════════════

export interface OpcionFiltroApi {
  id:     number;
  nombre: string;
  codigo: string | null;
}

export interface PreparacionSolicitudEdicionOsApi {
  idOs:                number;
  numero:              string;
  tipo:                string;
  estado:              string;
  razonSocial:         string | null;
  idAprobador:         number | null;
  aprobador:           string | null;
  cargoAprobador:      string | null;
  sedeAprobador:       string | null;
  aprobadorDisponible: boolean;
  motivos:             OpcionFiltroApi[];
}

export interface PreparacionAnulacionOsApi {
  idOs:               number;
  numero:             string;
  tipo:               string;
  estado:             string;
  razonSocial:        string | null;
  tieneProgramacion:  boolean;
  tecnico:            string | null;
  fechaEjecucion:     string | null;
  horaInicio:         string | null;
  horaFin:            string | null;
  viaticos:           number | null;
  simboloMoneda:      string | null;
  personal:           PersonalAsignadoOsApi[];
  motivos:            OpcionFiltroApi[];
}

export interface SolicitarEdicionOsApi {
  idMotivo:   number;
  comentario: string | null;
}

export interface AnularOrdenServicioApi {
  idMotivo:   number;
  comentario: string | null;
}

export interface ComentarioSolicitudOsApi {
  comentario: string | null;
}

// ─── Mappers Back → Front ────────────────────────────────────────────────────

export function mapMotivoEdicion(dto: OpcionFiltroApi): MotivoEdicionOs {
  return {
    idMotivo: dto.id,
    codigo:   dto.codigo ?? '',
    label:    dto.nombre,
  };
}

export function mapMotivoAnulacion(dto: OpcionFiltroApi): MotivoAnulacionOs {
  return {
    idMotivo: dto.id,
    codigo:   dto.codigo ?? '',
    label:    dto.nombre,
  };
}

function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return '—';
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function mapPreparacionSolicitudEdicion(
  dto: PreparacionSolicitudEdicionOsApi,
): { jefe: JefeComercialOs; motivos: MotivoEdicionOs[] } {
  return {
    jefe: {
      idUsuario:  dto.idAprobador ?? 0,
      nombre:     dto.aprobador ?? '—',
      cargo:      dto.cargoAprobador ?? 'Jefe Comercial',
      sede:       dto.sedeAprobador ?? undefined,
      iniciales:  iniciales(dto.aprobador),
      disponible: dto.aprobadorDisponible,
    },
    motivos: (dto.motivos ?? []).map(mapMotivoEdicion),
  };
}

export function mapPreparacionAnulacion(
  dto: PreparacionAnulacionOsApi,
): { impacto: ImpactoAnulacionOs; motivos: MotivoAnulacionOs[] } {
  return {
    impacto: {
      tieneProgramacion:  dto.tieneProgramacion,
      tecnicoAsignado:    dto.tecnico,
      fechaLiberacion:    dto.fechaEjecucion,
      fechaReservada:     dto.fechaEjecucion,
      horaInicio:         dto.horaInicio,
      horaFin:            dto.horaFin,
      viaticosLiberados:  dto.viaticos,
      monedaViaticos:     dto.simboloMoneda,
    },
    motivos: (dto.motivos ?? []).map(mapMotivoAnulacion),
  };
}

// ─── Mappers Front → Back ────────────────────────────────────────────────────

export function mapSolicitarEdicionRequestToApi(req: SolicitarEdicionOsRequest): SolicitarEdicionOsApi {
  return {
    idMotivo:   req.idMotivo,
    comentario: req.comentario || null,
  };
}

export function mapAnularRequestToApi(req: AnularOsRequest): AnularOrdenServicioApi {
  return {
    idMotivo:   req.idMotivo,
    comentario: req.justificacion || null,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-43 — Buscadores (equipos y conceptos del cliente)
// ═════════════════════════════════════════════════════════════════════════════

export interface OpcionImportacionApi {
  valor: string;
  label: string;
}

export interface ConceptoCatalogoOsApi {
  idSuministro:     number;
  codigo:           string;
  descripcion:      string;
  tipo:             string | null;
  tipoLabel:        string | null;
  subtipo:          string | null;
  subtipoLabel:     string | null;
  aplicaServicio:   boolean;
  aplicaMetrologia: boolean;
  deLaPropuesta:    boolean;
}

export interface BusquedaConceptosOsApi {
  items: ConceptoCatalogoOsApi[];
  total: number;
  tipos: OpcionImportacionApi[];
}

export interface BusquedaEquiposOsApi {
  items:           EquipoOsApi[];
  total:           number;
  ubicaciones:     string[];
  clasificaciones: OpcionImportacionApi[];
}

export function mapConceptoCatalogo(dto: ConceptoCatalogoOsApi): ConceptoCatalogoOs {
  const aplicable: string[] = [];
  if (dto.aplicaMetrologia) aplicable.push('Instrumentos');
  if (dto.aplicaServicio)   aplicable.push('Equipos de pesaje');
  return {
    idSuministro:   dto.idSuministro,
    codigo:         dto.codigo,
    descripcion:    dto.descripcion,
    clasificacion:  dto.aplicaMetrologia ? 'metrologia' : 'servicio',
    tipo:           dto.tipoLabel ?? dto.tipo ?? undefined,
    subtipo:        dto.subtipoLabel ?? dto.subtipo ?? undefined,
    aplicableA:     aplicable.join(' · ') || '—',
    deLaPropuesta:  dto.deLaPropuesta,
  };
}

/**
 * Catálogo de equipos del cliente. El back usa `EquipoOsApi` como base;
 * el front le agrega metadata de "ya está en otra OS activa" / "de la propuesta".
 */
export function mapEquipoCatalogoCliente(
  dto: EquipoOsApi,
  idsYaEnPropuesta: Set<number>,
): EquipoCatalogoClienteOs {
  return {
    idEquipo:            dto.idEquipo,
    clasificacion:       dto.clasificacion as ClasificacionEquipoOs,
    clasificacionLabel:  dto.clasificacionLabel,
    marca:               dto.marca,
    modelo:              dto.modelo,
    numSerie:            dto.numSerie,
    codigoTw:            dto.codigoTw,
    alcance:             dto.alcance ?? null,
    ubicacion:           dto.ubicacion ?? null,
    estado:              'disponible',   // el back excluye los que ya están en otra OS activa, así que todo lo que llega es disponible
    deLaPropuesta:       idsYaEnPropuesta.has(dto.idEquipo),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// HU-44 — Importación Excel OS/OM
// ═════════════════════════════════════════════════════════════════════════════

export interface EquipoImportacionOsApi {
  fila:            number;
  codigoTw:        string;
  estado:          string;             // ok | advertencia | error
  mensaje:         string | null;
  equipo:          EquipoOsApi | null;
  conceptosTexto:  string[];
  conceptos:       number[];           // idSuministro
}

export interface ConceptoImportacionOsApi {
  fila:            number;
  texto:           string;
  estado:          string;             // ok | advertencia | error
  mensaje:         string | null;
  idSuministro:    number | null;
  codigo:          string | null;
  descripcion:     string | null;
  clasificacion:   string | null;
  equiposAplicados: string[];
}

export interface ResumenImportacionOsApi {
  conceptosOk:          number;
  conceptosAdvertencia: number;
  conceptosError:       number;
  equiposOk:            number;
  equiposAdvertencia:   number;
  equiposError:         number;
  relaciones:           number;
}

export interface AnalisisImportacionOsApi {
  nombreArchivo:  string;
  resumen:        ResumenImportacionOsApi;
  puedeConfirmar: boolean;
  equipos:        EquipoImportacionOsApi[];
  conceptos:      ConceptoImportacionOsApi[];
}

function mapFilaConcepto(c: ConceptoImportacionOsApi): FilaConceptoImportado {
  return {
    idSuministro: c.idSuministro,
    codigo:       c.codigo ?? c.texto,
    descripcion:  c.descripcion ?? c.texto,
    estado:       c.estado as EstadoFilaImportacionOs,
    mensaje:      c.mensaje ?? undefined,
  };
}

function mapFilaEquipo(e: EquipoImportacionOsApi, conceptosCodigos: Map<number, string>): FilaEquipoImportado {
  const eq = e.equipo;
  const conceptosAplicadosCodigos = e.conceptos
    .map(id => conceptosCodigos.get(id))
    .filter((c): c is string => !!c);
  return {
    idEquipo:           eq?.idEquipo ?? null,
    codigoTw:           e.codigoTw,
    tipo:               (eq?.clasificacion ?? 'equipo') as ClasificacionEquipoOs,
    tipoLabel:          eq?.clasificacionLabel ?? '',
    marca:              eq?.marca ?? '',
    modelo:             eq?.modelo ?? '',
    numSerie:           eq?.numSerie ?? '',
    alcance:            eq?.alcance ?? null,
    ubicacion:          eq?.ubicacion ?? null,
    conceptosAplicados: conceptosAplicadosCodigos.length ? conceptosAplicadosCodigos : e.conceptosTexto,
    d:                  eq?.divisionMinima ?? null,
    e:                  eq?.divisionVerif ?? null,
    clase:              eq?.claseExactitud ?? null,
    escala:             eq?.escala ?? null,
    puntosCalibracion:  eq?.puntosCalibracion ?? null,
    estado:             e.estado as EstadoFilaImportacionOs,
    mensaje:            e.mensaje ?? undefined,
  };
}

export function mapAnalisisImportacionOs(dto: AnalisisImportacionOsApi): AnalisisImportacionOsOm {
  // Mapa idSuministro → codigo para resolver conceptos aplicados a cada equipo.
  const conceptosCodigos = new Map<number, string>();
  for (const c of dto.conceptos ?? []) {
    if (c.idSuministro && c.codigo) conceptosCodigos.set(c.idSuministro, c.codigo);
  }
  return {
    nombreArchivo:              dto.nombreArchivo,
    totalEquipos:               dto.equipos?.length ?? 0,
    totalConceptos:             dto.conceptos?.length ?? 0,
    totalRelaciones:            dto.resumen?.relaciones ?? 0,
    resumenEquiposOk:           dto.resumen?.equiposOk ?? 0,
    resumenEquiposAdvertencias: dto.resumen?.equiposAdvertencia ?? 0,
    resumenEquiposErrores:      dto.resumen?.equiposError ?? 0,
    conceptos:                  (dto.conceptos ?? []).map(mapFilaConcepto),
    equipos:                    (dto.equipos ?? []).map(e => mapFilaEquipo(e, conceptosCodigos)),
  };
}
