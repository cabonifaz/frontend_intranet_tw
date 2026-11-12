// HU-52 / HU-57 (Sprint 5) — Aprobaciones y viáticos de una OS
// Espejo de `AprobacionesViaticosServicioDtos.cs` del back (DetalleServicioRutaController + RevisionTecnicaController).
//
// Nota: estos DTOs son INDEPENDIENTES de `ViaticosProgramacion` (HU-45). El back expuso
// un endpoint dedicado por OS con datos pre-calculados por el servidor y campos extra
// (NFotos, MotivoSinFoto, MontoIa, CoincideIa, Origen, PuedeRevisar por gasto, etc.).

export type TipoAprobacion    = 'salida' | 'llegada' | 'evidencia' | 'ensayo';
export type EstadoAprobacion  = 'pendiente' | 'aprobada' | 'rechazada';
export type EstadoDepositoOs  = 'pendiente' | 'depositado';
export type EstadoGastoOs     = 'pendiente' | 'observado' | 'aprobado' | 'rechazado';
export type TipoSaldoOs       = 'reembolso' | 'devolucion' | 'cuadrado';
export type EstadoCierreOs    = 'abierta' | 'cerrada' | 'sin_programacion';
export type AccionRevisarGasto = 'aprobar' | 'observar' | 'rechazar';
export type OrigenGastoOs     = 'viatico' | 'reembolso' | null;

// ── Aprobaciones ──────────────────────────────────────────────────────

export interface AprobacionServicio {
  tipo:          TipoAprobacion;
  id:            number;
  titulo:        string | null;
  solicitante:   string | null;
  solicitadoEn:  string | null;
  motivo:        string | null;
  detalle:       string | null;
  estado:        EstadoAprobacion;
  resueltoPor:   string | null;
  cargo:         string | null;
  resueltoEn:    string | null;
  comentario:    string | null;
  urgente:       boolean;
  puedeResolver: boolean;
}

export interface TotalesAprobaciones {
  total:       number;
  pendientes:  number;
  aprobadas:   number;
  rechazadas:  number;
}

export interface AprobacionesServicio {
  aprobaciones: AprobacionServicio[];
  totales:      TotalesAprobaciones;
}

export interface ResolverAprobacionInput {
  aprobar:    boolean;
  comentario: string;
}

// ── Viáticos de la OS / Informe ───────────────────────────────────────

export interface ViaticosOsCabecera {
  idProgramacion:    number | null;
  codigo:            string | null;
  estado:            string | null;
  puedeRevisar:      boolean;
  puedeGestionar:    boolean;
  rendicionCerrada:  boolean;
  moneda:            string;
}

export interface ViaticosOsResumen {
  asignado:          number;
  depositado:        number;
  pendienteDeposito: number;
  rendido:           number;
  aprobado:          number;
  rechazado:         number;
  porRevisar:        number;
  nPorRevisar:       number;
  porRendir:         number;
  saldo:             number;
  tipoSaldo:         TipoSaldoOs;
}

export interface ViaticoLineaOs {
  idGasto:        number;
  idTecnico:      number;
  tecnico:        string;
  rol:            'principal' | 'apoyo';
  idConcepto:     number;
  concepto:       string;
  asignado:       number;
  rendido:        number;
  porRendir:      number;
  estadoDeposito: EstadoDepositoOs;
  fechaDeposito:  string | null;
}

export interface GastoRendidoOs {
  idGasto:            number;
  fecha:              string | null;
  idTecnico:          number;
  tecnico:            string;
  idConcepto:         number;
  concepto:           string;
  descripcion:        string | null;
  monto:              number;
  estado:             EstadoGastoOs;
  comentarioRevision: string | null;
  revisadoPor:        string | null;
  revisadoEn:         string | null;
  nFotos:             number;
  motivoSinFoto:      string | null;
  montoIa:            number | null;
  coincideIa:         boolean | null;
  puedeRevisar:       boolean;
  origen:             OrigenGastoOs;
}

export interface RepartoGastoOs {
  idGasto:        number;
  idViaticoLinea: number;
  concepto:       string;
  monto:          number;
}

export interface CierreRendicionOs {
  estado:     EstadoCierreOs;
  asignado:   number;
  aprobado:   number;
  rechazado:  number;
  saldo:      number;
  tipo:       TipoSaldoOs;
  cerradoPor: string | null;
  cerradoEn:  string | null;
}

export interface ViaticosOs {
  cabecera: ViaticosOsCabecera;
  resumen:  ViaticosOsResumen;
  lineas:   ViaticoLineaOs[];
  gastos:   GastoRendidoOs[];
  cierre:   CierreRendicionOs | null;
  repartos: RepartoGastoOs[] | null;
}

export interface RevisarGastoServicioInput {
  accion:     AccionRevisarGasto;
  comentario: string | null;
}
