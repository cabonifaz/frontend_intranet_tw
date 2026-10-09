// Modelos para los modales del Módulo 3 — Propuestas Comerciales.
// Mapean 1:1 los DTOs del back (CrmController + PropuestasController).

// ═══════════════════════════════════════════════════════════════════════════
// HU-09 — Detalle de Propuesta
// GET /api/crm/propuestas/{id}/detalle
// ═══════════════════════════════════════════════════════════════════════════

export interface PasoWorkflow {
  codigo:   string;
  etiqueta: string;
  estado:   'completado' | 'actual' | 'pendiente' | 'rechazado' | 'anulado' | 'vencido';
}

export interface WorkflowPropuesta {
  pasos:           PasoWorkflow[];
  estadoTerminal?: 'rechazado' | 'anulado' | 'vencido' | null;
}

export interface SlaPropuesta {
  tipo:             'visto_bueno' | 'vigencia';
  venceEn:          string;
  minutosRestantes: number;
  vencido:          boolean;
}

export interface AccionesPropuesta {
  puedeEditar:              boolean;
  puedeGenerarNuevaVersion: boolean;
  esUltimaVersion:          boolean;
  accionPrincipal:          'editar' | 'nueva_version' | 'ninguna';
}

export interface DocumentoVinculado {
  tipo:        'requerimiento' | 'expediente' | 'orden_compra' | 'adjunto';
  idEntidad?:  number | null;
  codigo?:     string;
  descripcion?: string;
  estado?:     string;
  url?:        string;
  fecha?:      string | null;
  esPendiente: boolean;
}

export interface VersionPropuesta {
  idPropuesta:         number;
  version:             number;
  estado:              string;
  total:               number;
  fechaCreacion?:      string | null;
  fechaEnvio?:         string | null;
  nombreCreador?:      string;
  motivoNuevaVersion?: string;
  esActual:            boolean;
}

export interface ActividadPropuesta {
  idAuditoria:    number;
  accion:         string;
  estadoAnterior?: string;
  estadoNuevo?:    string;
  descripcion?:   string;
  registradoEn?:  string | null;
  nombreUsuario?: string;
}

/** Respuesta de GET /api/crm/propuestas/{id}/detalle. */
export interface PropuestaDetalleModal {
  propuesta:           any;                     // PropuestaDetalleDto completo (lo mismo que GET /{id})
  workflow:            WorkflowPropuesta;
  sla?:                SlaPropuesta | null;
  acciones:            AccionesPropuesta;
  numeroContratoMarco?: string | null;
  documentos:          DocumentoVinculado[];
  versiones:           VersionPropuesta[];
  actividad:           ActividadPropuesta[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HU-11 — Descuento Comercial
// ═══════════════════════════════════════════════════════════════════════════

export interface AplicarDescuentoRequest {
  tipo:              'porcentaje' | 'monto' | 'ninguno';
  valor:             number;
  idMotivoDescuento?: number | null;
}

export interface DescuentoResultado {
  subtotalActual:    number;
  descuentoActual:   number;
  porcentajeActual?: number | null;
  igvActual:         number;
  totalActual:       number;

  tipo:              'porcentaje' | 'monto' | 'ninguno';
  porcentaje?:       number | null;
  descuentoNuevo:    number;
  subtotalNuevo:     number;
  igvNuevo:          number;
  totalNuevo:        number;
  igvPct:            number;

  idMotivoDescuento?: number | null;
  motivoDescuento?:   string | null;
  guardado:          boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HU-12 — Envío a Visto Bueno
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidacionVistoBueno {
  codigo:      string;
  etiqueta:    string;
  cumple:      boolean;
  obligatoria: boolean;
  detalle?:    string;
}

export interface VistoBuenoPropuesta {
  idPropuesta:          number;
  numero:               string;
  version:              number;
  estado:               string;
  cliente?:             string;
  numeroRequerimiento?: string;
  total:                number;
  monedaSimbolo?:       string;

  idAprobador?:         number | null;
  nombreAprobador?:     string;
  cargoAprobador?:      string;
  esSuplente:           boolean;
  idJefeDirecto?:       number | null;
  nombreJefeDirecto?:   string;

  slaHoras:             number;
  fechaLimite?:         string | null;

  requiereAprobacionEspecial: boolean;
  motivoAlerta?:        string;
  descuentoPct:         number;
  umbralDescuentoPct:   number;

  puedeEnviar:          boolean;
  idVistoBueno?:        number | null;

  validaciones:         ValidacionVistoBueno[];
}

export interface EnviarVistoBuenoRequest {
  comentario?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HU-12 — Anulación de Propuesta
// ═══════════════════════════════════════════════════════════════════════════

export interface OpcionMotivo {
  id:     number;
  nombre: string;
}

export interface AnulacionPropuesta {
  idPropuesta:            number;
  numero:                 string;
  version:                number;
  estado:                 string;
  cliente?:               string;
  numeroRequerimiento?:   string;
  numeroExpediente?:      string;
  tieneVbPendiente:       boolean;
  puedeAnular:            boolean;
  motivoBloqueo?:         string;
  impacto?:               string;
  motivoAnulacion?:       string;
  justificacionAnulacion?: string;
  fechaAnulacion?:        string | null;
  motivos:                OpcionMotivo[];
}

export interface AnularPropuestaRequest {
  idMotivoAnulacion?:   number | null;
  justificacion:        string;
  confirmacionCritica:  boolean;
}
