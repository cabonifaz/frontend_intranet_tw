import { Injectable } from '@angular/core';

export type Modulo = 'oc' | 'propuesta' | 'vb' | 'seguimiento' | 'rq' | 'expediente' | 'os';

export interface EstadoVisual {
  clase: string;  // ej. 'badge--verde'
  label: string;
}

const ROJO:  Pick<EstadoVisual, 'clase'> = { clase: 'badge--rojo'  };
const AMBAR: Pick<EstadoVisual, 'clase'> = { clase: 'badge--ambar' };
const VERDE: Pick<EstadoVisual, 'clase'> = { clase: 'badge--verde' };
const AZUL:  Pick<EstadoVisual, 'clase'> = { clase: 'badge--azul'  };
const GRIS:  Pick<EstadoVisual, 'clase'> = { clase: 'badge--gris'  };

/**
 * Mapas de estado por módulo. Fuente única para badges, chips y filtros.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoEstadosService {

  private readonly mapas: Record<Modulo, Record<string, EstadoVisual>> = {
    oc: {
      pendiente_validacion: { ...AMBAR, label: 'Pend. Validar' },
      validada:             { ...VERDE, label: 'Validada' },
      validada_parcial:     { ...VERDE, label: 'Validada (parcial)' },
      vigente:              { ...VERDE, label: 'Validada' },
      liberada:             { ...AZUL,  label: 'Liberada' },
      observada:            { ...ROJO,  label: 'Observada' },
      bloqueada:            { ...ROJO,  label: 'Bloqueada' },
      vencida:              { ...ROJO,  label: 'Vencida' },
      anulada:              { ...GRIS,  label: 'Anulada' },
    },
    propuesta: {
      borrador:     { ...GRIS,  label: 'Borrador' },
      pendiente_vb: { ...AMBAR, label: 'Pendiente VB' },
      aprobado:     { ...VERDE, label: 'Aprobada' },
      rechazado:    { ...ROJO,  label: 'Rechazada' },
      devuelto:     { ...AMBAR, label: 'Devuelta' },
      enviado:      { ...AZUL,  label: 'Enviada' },
      aceptada:     { ...VERDE, label: 'Aceptada' },
      anulado:      { ...GRIS,  label: 'Anulada' },
      vencido:      { ...ROJO,  label: 'Vencida' },
    },
    vb: {
      pendiente: { ...AMBAR, label: 'Pendiente' },
      aprobado:  { ...VERDE, label: 'Aprobada' },
      rechazado: { ...ROJO,  label: 'Rechazada' },
      devuelto:  { ...AMBAR, label: 'Devuelta' },
      revocado:  { ...GRIS,  label: 'Revocada' },
    },
    seguimiento: {
      en_seguimiento:  { ...AZUL,  label: 'En seguimiento' },
      sin_respuesta:   { ...ROJO,  label: 'Sin respuesta' },
      requiere_ajuste: { ...AMBAR, label: 'Requiere ajuste' },
      aceptada:        { ...VERDE, label: 'Aceptada' },
      rechazada:       { ...ROJO,  label: 'Rechazada' },
    },
    rq: {
      pendiente_asignacion: { ...AMBAR, label: 'Pendiente asig.' },
      en_atencion:          { ...AZUL,  label: 'En atención' },
      con_propuesta:        { ...VERDE, label: 'Con propuesta' },
      cerrado:              { ...GRIS,  label: 'Cerrado' },
      bloqueado:            { ...ROJO,  label: 'Bloqueado' },
      anulado:              { ...GRIS,  label: 'Anulado' },
    },
    expediente: {
      activo:        { ...VERDE, label: 'Activo' },
      bloqueado:     { ...ROJO,  label: 'Bloqueado' },
      con_excepcion: { ...AMBAR, label: 'Con excepción' },
      cerrado:       { ...GRIS,  label: 'Cerrado' },
    },
    os: {
      programada:  { ...AMBAR, label: 'Programada' },
      en_ejecucion: { ...AZUL, label: 'En ejecución' },
      ejecutada:   { ...VERDE, label: 'Ejecutada' },
      anulada:     { ...GRIS,  label: 'Anulada' },
    },
  };

  obtener(modulo: Modulo, estado: string): EstadoVisual {
    const mapa = this.mapas[modulo] ?? {};
    return mapa[estado?.toLowerCase() ?? ''] ?? { clase: 'badge--gris', label: estado || '—' };
  }

  todosDe(modulo: Modulo): Record<string, EstadoVisual> {
    return this.mapas[modulo] ?? {};
  }
}
