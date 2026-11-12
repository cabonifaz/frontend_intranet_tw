// View-model común del componente `app-resumen-viaticos`.
// Permite consumir dos DTOs distintos del back con una misma pieza visual:
//   1) `ViaticosProgramacion` (HU-45, endpoint por programación)
//   2) `ViaticosOs`           (HU-52/HU-57, endpoint por OS / informe)

import {
  GastoRendidoOs, ViaticosOs,
} from '../../../core/models/aprobaciones-viaticos-servicio.model';
import { ViaticosProgramacion } from '../../../core/models/programacion-viaticos.model';

export type TipoSaldoVM         = 'reembolso' | 'devolucion' | 'cuadrado';
export type EstadoDepositoVM    = 'pendiente' | 'depositado';
export type EstadoGastoVM       = 'pendiente' | 'observado' | 'aprobado' | 'rechazado';

export interface TotalesVM {
  asignado:           number;
  depositado:         number;
  pendienteDeposito:  number;
  rendido:            number;
  aprobado:           number;
  rechazado:          number;
  porRevisar:         number;
  nPorRevisar:        number;
  porRendir:          number;
  saldo:              number;
  tipoSaldo:          TipoSaldoVM;
}

export interface LineaVM {
  clave:          string;   // único para track-by
  tecnico:        string;
  rol:            'principal' | 'apoyo';
  concepto:       string;
  asignado:       number;
  rendido:        number;
  porRendir:      number;
  estadoDeposito: EstadoDepositoVM;
}

export interface GastoVM {
  idGasto:            number;
  fecha:              string | null;
  tecnico:            string;
  concepto:           string;
  descripcion:        string | null;
  monto:              number;
  /** 0 si no hay comprobante. En programación siempre 0 ó 1; en OS puede llegar a 5. */
  nFotos:             number;
  motivoSinFoto:      string | null;
  montoIa:            number | null;
  coincideIa:         boolean | null;
  estado:             EstadoGastoVM;
  comentarioRevision: string | null;
  revisadoPor:        string | null;
  revisadoEn:         string | null;
  puedeAprobar:       boolean;
  puedeObservar:      boolean;
  puedeRechazar:      boolean;
}

export interface CierreVM {
  tipo:       TipoSaldoVM;
  saldo:      number;
  asignado:   number;
  aprobado:   number;
  rechazado:  number;
  cerradoPor: string | null;
  cerradoEn:  string | null;
}

export interface ResumenViaticosVM {
  moneda:           string;
  rendicionCerrada: boolean;
  totales:          TotalesVM;
  lineas:           LineaVM[];
  gastos:           GastoVM[];
  cierre:           CierreVM | null;
}

// ── Mappers ───────────────────────────────────────────────────────────

/** `ViaticosProgramacion` (HU-45) → VM común. */
export function viaticosProgramacionAVm(v: ViaticosProgramacion): ResumenViaticosVM {
  const moneda = v.cabecera.moneda || 'PEN';
  const tipo   = mapearTipoSaldoViejo(v.resumen.tipoSaldo);

  // Sumar rendido aprobado por técnico+concepto para calcular `porRendir` por línea.
  const aprobPorClave = new Map<string, number>();
  for (const g of v.gastos) {
    if (g.estado !== 'aprobado') continue;
    const k = `${g.idTecnico}:${g.idConcepto}`;
    aprobPorClave.set(k, (aprobPorClave.get(k) ?? 0) + g.monto);
  }

  const lineas: LineaVM[] = v.lineas.map(l => {
    const aprob = aprobPorClave.get(`${l.idTecnico}:${l.idConcepto}`) ?? 0;
    return {
      clave:          `${l.idGasto}`,
      tecnico:        l.tecnico,
      rol:            l.rol,
      concepto:       l.concepto,
      asignado:       l.monto,
      rendido:        aprob,
      porRendir:      Math.max(0, l.monto - aprob),
      estadoDeposito: l.estadoDeposito,
    };
  });

  const gastos: GastoVM[] = v.gastos.map(g => ({
    idGasto:            g.idGasto,
    fecha:              g.fecha ?? null,
    tecnico:            g.tecnico,
    concepto:           g.concepto,
    descripcion:        g.descripcion ?? null,
    monto:              g.monto,
    nFotos:             g.tieneComprobante ? 1 : 0,
    motivoSinFoto:      null,
    montoIa:            null,
    coincideIa:         null,
    estado:             g.estado,
    comentarioRevision: g.comentarioRevision ?? null,
    revisadoPor:        null,
    revisadoEn:         null,
    puedeAprobar:       g.puedeAprobar,
    puedeObservar:      g.puedeObservar,
    puedeRechazar:      g.puedeRechazar,
  }));

  return {
    moneda,
    rendicionCerrada: v.cabecera.rendicionCerrada,
    totales: {
      asignado:          v.totales.totalAsignado,
      depositado:        v.totales.totalDepositado,
      pendienteDeposito: v.totales.totalPendiente,
      rendido:           v.resumen.totalSolicitado,
      aprobado:          v.resumen.totalAprobado,
      rechazado:         v.resumen.totalRechazado,
      porRevisar:        v.resumen.totalPendiente,
      nPorRevisar:       v.resumen.pendientesRevision,
      porRendir:         Math.max(0, v.totales.totalAsignado - v.resumen.totalAprobado),
      saldo:             v.resumen.saldoVsAsignado,
      tipoSaldo:         tipo,
    },
    lineas,
    gastos,
    cierre: v.cierre ? {
      tipo:       mapearTipoSaldoViejo(v.cierre.tipoSaldo),
      saldo:      v.cierre.saldo,
      asignado:   v.cierre.totalAsignado,
      aprobado:   v.cierre.totalAprobado,
      rechazado:  0,
      cerradoPor: v.cierre.cerradoPor ?? null,
      cerradoEn:  v.cierre.cerradoEn ?? null,
    } : null,
  };
}

/** `ViaticosOs` (HU-52/HU-57) → VM común. */
export function viaticosOsAVm(v: ViaticosOs): ResumenViaticosVM {
  const puedeRev = v.cabecera.puedeRevisar;

  const lineas: LineaVM[] = v.lineas.map(l => ({
    clave:          `${l.idGasto}`,
    tecnico:        l.tecnico,
    rol:            (l.rol === 'principal' ? 'principal' : 'apoyo'),
    concepto:       l.concepto,
    asignado:       l.asignado,
    rendido:        l.rendido,
    porRendir:      l.porRendir,
    estadoDeposito: l.estadoDeposito,
  }));

  const gastos: GastoVM[] = v.gastos.map(g => ({
    idGasto:            g.idGasto,
    fecha:              g.fecha,
    tecnico:            g.tecnico,
    concepto:           g.concepto,
    descripcion:        g.descripcion,
    monto:              g.monto,
    nFotos:             g.nFotos,
    motivoSinFoto:      g.motivoSinFoto,
    montoIa:            g.montoIa,
    coincideIa:         g.coincideIa,
    estado:             g.estado,
    comentarioRevision: g.comentarioRevision,
    revisadoPor:        g.revisadoPor,
    revisadoEn:         g.revisadoEn,
    // El back solo expone `puedeRevisar` por gasto; derivamos los 3 por estado.
    puedeAprobar:       accionPermitida(g, puedeRev, 'aprobar'),
    puedeObservar:      accionPermitida(g, puedeRev, 'observar'),
    puedeRechazar:      accionPermitida(g, puedeRev, 'rechazar'),
  }));

  return {
    moneda:           v.cabecera.moneda,
    rendicionCerrada: v.cabecera.rendicionCerrada,
    totales: {
      asignado:          v.resumen.asignado,
      depositado:        v.resumen.depositado,
      pendienteDeposito: v.resumen.pendienteDeposito,
      rendido:           v.resumen.rendido,
      aprobado:          v.resumen.aprobado,
      rechazado:         v.resumen.rechazado,
      porRevisar:        v.resumen.porRevisar,
      nPorRevisar:       v.resumen.nPorRevisar,
      porRendir:         v.resumen.porRendir,
      saldo:             v.resumen.saldo,
      tipoSaldo:         v.resumen.tipoSaldo,
    },
    lineas,
    gastos,
    // El back devuelve `cierre` SIEMPRE con el estado (abierta | cerrada | sin_programacion).
    // Solo lo exponemos al componente cuando la rendición está realmente cerrada.
    cierre: (v.cierre && v.cierre.estado === 'cerrada') ? {
      tipo:       v.cierre.tipo,
      saldo:      v.cierre.saldo,
      asignado:   v.cierre.asignado,
      aprobado:   v.cierre.aprobado,
      rechazado:  v.cierre.rechazado,
      cerradoPor: v.cierre.cerradoPor,
      cerradoEn:  v.cierre.cerradoEn,
    } : null,
  };
}

// ── Helpers privados ──────────────────────────────────────────────────

function mapearTipoSaldoViejo(t: 'a_favor_tecnico' | 'a_devolver' | 'cuadrado'): TipoSaldoVM {
  switch (t) {
    case 'a_favor_tecnico': return 'reembolso';
    case 'a_devolver':      return 'devolucion';
    case 'cuadrado':        return 'cuadrado';
  }
}

function accionPermitida(g: GastoRendidoOs, puedeRevisar: boolean, accion: 'aprobar' | 'observar' | 'rechazar'): boolean {
  if (!puedeRevisar || !g.puedeRevisar) return false;
  if (g.estado === 'aprobado' || g.estado === 'rechazado') return false;
  // Pendiente → las 3; Observado → aprobar o rechazar (no re-observar).
  if (accion === 'observar') return g.estado === 'pendiente';
  return true;
}
