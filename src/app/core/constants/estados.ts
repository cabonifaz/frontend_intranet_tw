export const ESTADO = {
  ACTIVO:   'Activo',
  INACTIVO: 'Inactivo',
} as const;

export const ESTADO_RQ = {
  NUEVO:         'nuevo',
  EN_PROCESO:    'en_proceso',
  CON_PROPUESTA: 'con_propuesta',
  CERRADO:       'cerrado',
  ANULADO:       'anulado',
} as const;

export const ESTADO_OPCIONES = [
  { value: '',            label: 'Todos los estados' },
  { value: ESTADO.ACTIVO,   label: 'Activo'          },
  { value: ESTADO.INACTIVO, label: 'Inactivo'        },
];

export const ESTADO_OPCIONES_MODAL = [
  { value: '',            label: 'Todos'    },
  { value: ESTADO.ACTIVO,   label: 'Activos'  },
  { value: ESTADO.INACTIVO, label: 'Inactivos'},
];

