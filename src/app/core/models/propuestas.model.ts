// ─── Tipos base ──────────────────────────────────────────────────────────────

export type TipoPropuesta = 'servicio' | 'mixta' | 'proyecto';

export type EstadoPropuesta =
  | 'borrador'
  | 'pendiente'
  | 'por_vb'
  | 'por_enviar'
  | 'en_seguimiento'
  | 'aceptada'
  | 'rechazada'
  | 'por_consolidar';

// ─── KPIs del header ─────────────────────────────────────────────────────────

export interface KpisPropuestas {
  pendientes:          number;
  variacionPendientes: number;   // % vs. mes anterior
  porVistoBueno:       number;
  porEnviar:           number;
  enSeguimiento:       number;
  slaVencidos:         number;
}

// ─── Fila del listado ────────────────────────────────────────────────────────

export interface PropuestaListaItem {
  idPropuesta:          number;
  codigo:               string;         // PROP-002581
  version:              string;         // v1, v2, v3
  idRequerimiento:      number | null;
  codigoRequerimiento:  string | null;  // RQ-2024-001
  idCliente:            number;
  razonSocial:          string;
  ruc:                  string;
  referencia:           string;         // Texto largo de contexto
  tipo:                 TipoPropuesta;
  tipoLabel:            string;
  estado:               EstadoPropuesta;
  estadoLabel:          string;
  monto:                number;
  moneda:               string;         // PEN, USD
  comercial:            string;         // Nombre del comercial responsable
  avatarComercial:      string;         // Iniciales (ej. "AT")
  slaDiasRestantes:     number;         // Negativo = vencido
  fechaCreacion:        string;
  fechaUltimaMod:       string;
}

// ─── Respuesta paginada ──────────────────────────────────────────────────────

export interface PropuestasPaginado {
  kpis:       KpisPropuestas;
  items:      PropuestaListaItem[];
  total:      number;
  pagina:     number;
  porPagina:  number;
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export interface FiltrosPropuestas {
  busqueda?:  string;
  estado?:    EstadoPropuesta | 'todas';
  anio?:      number;
  comercial?: string;              // Correo o id del comercial, "todos" = sin filtro
  tipo?:      TipoPropuesta | 'cualquiera';
  pagina:     number;
  porPagina:  number;
}

// ─── Opciones estáticas para los selects del filtro ──────────────────────────

export interface OpcionSelect {
  value: string;
  label: string;
}

export const TIPOS_PROPUESTA: OpcionSelect[] = [
  { value: 'cualquiera', label: 'Cualquiera' },
  { value: 'servicio',   label: 'Servicio'   },
  { value: 'mixta',      label: 'Mixta'      },
  { value: 'proyecto',   label: 'Proyecto'   },
];

export const ESTADOS_PROPUESTA_TABS: { codigo: EstadoPropuesta | 'todas'; label: string }[] = [
  { codigo: 'todas',           label: 'Todas'          },
  { codigo: 'borrador',        label: 'Borrador'       },
  { codigo: 'pendiente',       label: 'Pendientes'     },
  { codigo: 'por_vb',          label: 'Por VB'         },
  { codigo: 'por_enviar',      label: 'Por Enviar'     },
  { codigo: 'en_seguimiento',  label: 'En Seguimiento' },
  { codigo: 'aceptada',        label: 'Aceptadas'      },
  { codigo: 'rechazada',       label: 'Rechazadas'     },
  { codigo: 'por_consolidar',  label: 'Por Consolidar' },
];
