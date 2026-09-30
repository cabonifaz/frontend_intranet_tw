export interface ProcedimientoListaItem {
  idProcedimiento:  number;
  codigo:           string;
  anio:             number;
  version:          number;
  revision:         number;
  norma:            string;
  descripcion:      string;
  estado:           string;
  esVigente:        boolean;
  fechaRevision:    string;
}

export interface ProcedimientoDetalle extends ProcedimientoListaItem {
  // 01 - Identificación y Clasificación Técnica
  anioEmision:               number;
  versionOficial:            number;
  alcanceNorma:              string;
  tipoSegmentoRegulado:      string;
  tipoSegmentoMetrologico:   string;

  // 02 - Descripción y Alcance Metrológico
  alcanceTitulo:             string;   // Título oficial del procedimiento
  normaNacionalRangoSuperior: string;
  normaNacionalRangoInferior: string;

  // 03 - Documentación Técnica y Digitalización
  esFormatoDigitalIso:       boolean;
  urlPdfAprobado:            string;   // placeholder — upload real pendiente
  enlaceCatalogoExterno:     string;

  // Sidebar - Estado & Operatividad
  esActivo:                  boolean;
  esVigenteIso17025:         boolean;
  sincronizarAppMovil:       boolean;

  // Sidebar - Servicios Aplicables
  aplicaCalibracionLab:      boolean;
  aplicaVerificacionCampo:   boolean;
  aplicaMantenimiento:       boolean;
  aplicaCertificacionExterna: boolean;
  areaTecnicaResponsable:    string;

  // Trazabilidad
  usuarioRegistro:    string;
  fechaRegistro:      string;
  fechaModificacion:  string;
  totalEdiciones:     number;
}

export interface ProcedimientosPaginado {
  items:     ProcedimientoListaItem[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

export interface GuardarProcedimientoRequest {
  idProcedimiento:  number;
  codigo:           string;
  anio:             number;
  version:          number;
  revision:         number;
  norma:            string;
  descripcion:      string;
  esVigente:        boolean;

  anioEmision:               number;
  versionOficial:            number;
  alcanceNorma:              string;
  tipoSegmentoRegulado:      string;
  tipoSegmentoMetrologico:   string;

  alcanceTitulo:             string;
  normaNacionalRangoSuperior: string;
  normaNacionalRangoInferior: string;

  esFormatoDigitalIso:       boolean;
  urlPdfAprobado:            string;
  enlaceCatalogoExterno:     string;

  esActivo:                  boolean;
  esVigenteIso17025:         boolean;
  sincronizarAppMovil:       boolean;

  aplicaCalibracionLab:      boolean;
  aplicaVerificacionCampo:   boolean;
  aplicaMantenimiento:       boolean;
  aplicaCertificacionExterna: boolean;
  areaTecnicaResponsable:    string;

  guardarComoBorrador:       boolean;
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

export const SEGMENTOS_REGULADOS: OpcionCatalogo[] = [
  { value: 'wacal_em',      label: 'WACAL-EM (Norma de Metrología Perú)' },
  { value: 'oiml_r76',      label: 'OIML R76 (Recomendación Internacional)' },
  { value: 'oiml_r111',     label: 'OIML R111 (Pesas Patrón)' },
  { value: 'sunat_metrolo', label: 'SUNAT Metrología Legal' },
  { value: 'iso_17025',     label: 'ISO/IEC 17025' },
];

export const SEGMENTOS_METROLOGICOS: OpcionCatalogo[] = [
  { value: 'masa_iana',       label: 'Masa · Balanzas de Funcionamiento no Automático' },
  { value: 'masa_ia',         label: 'Masa · Balanzas de Funcionamiento Automático' },
  { value: 'longitud',        label: 'Longitud · Instrumentos dimensionales' },
  { value: 'temperatura',     label: 'Temperatura · Termómetros y termohigrómetros' },
  { value: 'presion',         label: 'Presión · Manómetros y transductores' },
  { value: 'volumen',         label: 'Volumen · Instrumentos volumétricos' },
];

export const AREAS_TECNICAS: OpcionCatalogo[] = [
  { value: 'metrologia_legal',    label: 'Dominio de Metrología Industrial' },
  { value: 'metrologia_cientif',  label: 'Dominio de Metrología Científica' },
  { value: 'servicio_tecnico',    label: 'Servicio Técnico en Campo' },
  { value: 'calidad',             label: 'Aseguramiento de la Calidad' },
];
