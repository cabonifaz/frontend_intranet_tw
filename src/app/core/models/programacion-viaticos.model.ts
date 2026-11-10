// HU-45 Asignación de Viáticos y Rendición de Gastos Operativos (Sprint 5)
// Modal con 2 tabs: [1] Asignación (previo a ejecución) · [2] Rendición (post ejecución)

export type EstadoDeposito = 'pendiente' | 'depositado';
export type EstadoGasto    = 'pendiente' | 'aprobado' | 'observado' | 'rechazado';
export type TipoSaldo      = 'a_favor_tecnico' | 'a_devolver' | 'cuadrado';
export type AccionRevision = 'aprobar' | 'observar' | 'rechazar';

export interface ViaticosCabecera {
  idProgramacion:      number;
  codigo:              string;
  estado:              string;
  estadoLabel:         string;
  idOs:                number;
  numeroOs:            string;
  tipo:                'OS' | 'OM';
  razonSocial?:        string | null;
  fechaEjecucion?:     string | null;
  horaInicio?:         string | null;
  horaFin?:            string | null;
  idTecnicoPrincipal?: number | null;
  tecnicoPrincipal?:   string | null;
  cargoPrincipal?:     string | null;
  puedeGestionar:      boolean;
  motivoNoGestionar?:  string | null;
  rendicionCerrada:    boolean;
  version:             string;
  moneda:              string;
}

export interface ViaticosTecnico {
  idUsuario:         number;
  nombre:            string;
  cargo?:            string | null;
  rol:               'principal' | 'apoyo';
  vigente:           boolean;
  subtotalAsignado:  number;
  rendidoAprobado:   number;
}

export interface ConceptoGasto {
  idConcepto:    number;
  nombre:        string;
  categoria:     string;
  personalizado: boolean;
}

export interface LineaAsignacion {
  idGasto:        number;
  idTecnico:      number;
  tecnico:        string;
  rol:            'principal' | 'apoyo';
  idConcepto:     number;
  concepto:       string;
  monto:          number;
  estadoDeposito: EstadoDeposito;
  fechaDeposito?: string | null;
  notificado:     boolean;
  editable:       boolean;
}

export interface TotalesAsignacion {
  totalAsignado:         number;
  totalDepositado:       number;
  totalPendiente:        number;
  pendientePorNotificar: number;
  lineasPorNotificar:    number;
}

export interface GastoRendido {
  idGasto:            number;
  fecha?:             string | null;
  idTecnico:          number;
  tecnico:            string;
  idConcepto:         number;
  concepto:           string;
  descripcion?:       string | null;
  monto:              number;
  tieneComprobante:   boolean;
  estado:             EstadoGasto;
  comentarioRevision?: string | null;
  puedeAprobar:       boolean;
  puedeObservar:      boolean;
  puedeRechazar:      boolean;
}

export interface ResumenRendicion {
  idProgramacion:         number;
  totalAsignado:          number;
  totalDepositado:        number;
  totalPendienteDeposito: number;
  totalSolicitado:        number;
  nGastos:                number;
  nComprobantes:          number;
  totalAprobado:          number;
  nAprobados:             number;
  totalObservado:         number;
  totalPendiente:         number;
  totalRechazado:         number;
  saldoVsAsignado:        number;
  tipoSaldo:              TipoSaldo;
  pendientesRevision:     number;
  cerrada:                boolean;
  puedeCerrar:            boolean;
  motivoNoCerrar?:        string | null;
  advertenciaCierre?:     string | null;
}

export interface CierreRendicion {
  cerradoEn?:     string | null;
  cerradoPor?:    string | null;
  totalAsignado:  number;
  totalAprobado:  number;
  saldo:          number;
  tipoSaldo:      TipoSaldo;
}

export interface ViaticosProgramacion {
  cabecera:  ViaticosCabecera;
  tecnicos:  ViaticosTecnico[];
  conceptos: ConceptoGasto[];
  lineas:    LineaAsignacion[];
  totales:   TotalesAsignacion;
  gastos:    GastoRendido[];
  resumen:   ResumenRendicion;
  cierre?:   CierreRendicion | null;
}

// ── Inputs ──────────────────────────────────────────────────────────────

export interface LineaViaticoInput {
  idGasto?:       number | null;
  idTecnico:      number;
  idConcepto?:    number | null;
  nuevoConcepto?: string | null;
  monto:          number;
}

export interface GuardarViaticosInput {
  version?: string | null;
  lineas:   LineaViaticoInput[];
}

export interface RevisarGastoInput {
  accion:      AccionRevision;
  comentario?: string | null;
}

// ── Responses ───────────────────────────────────────────────────────────

export interface GuardarViaticosResultado {
  idProgramacion:         number;
  creadas:                number;
  modificadas:            number;
  retiradas:              number;
  totalAsignado:          number;
  totalDepositado:        number;
  totalPendiente:         number;
  notificadosContabilidad: number;
  sinCambios:             boolean;
  conceptosNuevos:        number;
  version:                string;
}

export interface RevisarGastoResultado {
  idProgramacion: number;
  idGasto:        number;
  estado:         EstadoGasto;
  idTecnico:      number;
  resumen:        ResumenRendicion;
}

export interface CerrarRendicionResultado {
  idProgramacion:          number;
  totalAsignado:           number;
  totalDepositado:         number;
  totalSolicitado:         number;
  totalAprobado:           number;
  totalRechazado:          number;
  saldo:                   number;
  tipoSaldo:               TipoSaldo;
  notificadosContabilidad: number;
}

export interface ComprobanteGasto {
  idGasto:   number;
  url:       string;
  monto:     number;
  estado:    EstadoGasto;
  fecha?:    string | null;
  concepto:  string;
  tecnico:   string;
}
