export interface ProcedimientoListaItem {
  idProcedimiento:      number;   // BD-only, no se muestra en la tabla
  codigo:               string;
  anio:                 number;
  version:              number;
  esFormatoDigitalIso:  boolean;
  normaBase:            string;   // Línea principal de la columna "NORMA / AUTOR"
  autorNorma:           string;   // Línea secundaria (más chica)
  descripcion:          string;
  estado:               string;
  fechaRegistro:        string;
}

export interface ProcedimientoDetalle extends ProcedimientoListaItem {
  // 01 - Identificación
  normaBase:            string;   // Opcional — estándar técnico base (OIML R76, ISO 17025, etc.)
  tipoProcedimiento:    string;   // Calibración / Verificación / Mantenimiento / Instalación
  esActivo:             boolean;

  // 02 - Descripción y Alcance
  alcance:              string;   // Ej: "0 a 30 kg, clase III"
  aprobadoPor:          string;   // Ej: "Jefe de Metrología · Ing. Ana Torres"
  urlPdfAprobado:       string;   // placeholder — upload real pendiente

  // Trazabilidad
  usuarioRegistro:      string;
  pcRegistro:           string;   // Terminal desde donde se registró (COM06, COM121, ...)
  fechaModificacion:    string;
  totalEdiciones:       number;
}

export interface ProcedimientosPaginado {
  items:     ProcedimientoListaItem[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

export interface GuardarProcedimientoRequest {
  idProcedimiento:      number;
  codigo:               string;
  anio:                 number;
  version:              number;
  autorNorma:           string;
  normaBase:            string;
  tipoProcedimiento:    string;
  descripcion:          string;
  alcance:              string;
  aprobadoPor:          string;
  esFormatoDigitalIso:  boolean;
  urlPdfAprobado:       string;
  esActivo:             boolean;

  guardarComoBorrador:  boolean;
}

export interface CambiarEstadoProcedimientoRequest {
  idProcedimiento: number;
  estado:          string;
}

// ────────────────────────────────────────────────────────────
// Catálogos estáticos
// ────────────────────────────────────────────────────────────

export interface OpcionCatalogo {
  value: string;
  label: string;
}

export const TIPOS_PROCEDIMIENTO: OpcionCatalogo[] = [
  { value: 'calibracion',    label: 'Calibración' },
  { value: 'verificacion',   label: 'Verificación' },
  { value: 'mantenimiento',  label: 'Mantenimiento' },
  { value: 'instalacion',    label: 'Instalación' },
];
