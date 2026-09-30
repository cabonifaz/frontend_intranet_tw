export interface SuministroListaItem {
  idSuministro:     number;
  clase:            string;
  claseLabel:       string;
  tipo:             string;
  tipoLabel:        string;
  subtipo:          string;
  subtipoLabel:     string;
  descripcion:      string;
  marca:            string;
  modelo:           string;
  ctaContable:      string;
  procedencia:      string;
  procedenciaLabel: string;
  estado:           string;
  esActivoEnCatalogo: boolean;
  usarEnPropuestas:   boolean;
}

export interface ProcedimientoAsociado {
  codigo: string;
  nombre: string;
}

export interface EscalaTarifa {
  nivel:  'estandar' | 'volumen' | 'corporativo_alto';
  precio: number | null;
}

export interface SuministroDetalle extends SuministroListaItem {
  // Descripciones
  descripcionAuto:    string;
  descripcionManual:  string;

  // Alcance y logística
  alcance:            string;
  unidad:             string;
  casillero:          string;

  // Panel Cotización
  codigoUnspsc:       string;
  precioMinReferencia: number | null;
  escalas:            EscalaTarifa[];
  aplicaComercial:    boolean;
  aplicaServicio:     boolean;
  aplicaMetrologia:   boolean;

  // Procedimientos (sólo aplica a clase = 'servicio') — dropdown al futuro maestro HU-87
  idPrimerProcedimiento?:  string;
  idSegundoProcedimiento?: string;

  // Trazabilidad
  usuarioRegistro:    string;
  fechaRegistro:      string;
  fechaModificacion:  string;
  totalEdiciones:     number;
  firmaDigital:       string;

  // Adjuntos (placeholder, sin upload real — ver memoria: project_hu86_upload_pendiente)
  urlFoto:            string;
  urlManualPdf:       string;
}

export interface SuministrosPaginado {
  items:     SuministroListaItem[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

export interface GuardarSuministroRequest {
  idSuministro:       number;
  clase:              string;
  tipo:               string;
  subtipo:            string;
  marca:              string;   // vacío si clase === 'servicio'
  modelo:             string;   // vacío si clase === 'servicio'
  descripcionAuto:    string;
  descripcionManual:  string;
  alcance:            string;
  unidad:             string;
  ctaContable:        string;
  procedencia:        string;
  casillero:          string;
  esActivoEnCatalogo: boolean;

  usarEnPropuestas:            boolean;
  codigoUnspsc:                string;
  precioMinReferencia:         number | null;
  escalas:                     EscalaTarifa[];
  aplicaComercial:             boolean;
  aplicaServicio:              boolean;
  aplicaMetrologia:            boolean;

  // Sólo para clase === 'servicio'
  idPrimerProcedimiento?:  string;
  idSegundoProcedimiento?: string;

  guardarComoBorrador: boolean;
}

export interface CambiarEstadoSuministroRequest {
  idSuministro: number;
  estado:       string;
}

// ────────────────────────────────────────────────────────────
// Catálogos estáticos
// ────────────────────────────────────────────────────────────

export interface OpcionCatalogo {
  value: string;
  label: string;
}

export const CLASES_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'servicio',    label: 'Servicio' },
  { value: 'equipo',      label: 'Equipo' },
  { value: 'pesa',        label: 'Pesa' },
  { value: 'instrumento', label: 'Instrumento' },
];

// Mock hasta que exista el maestro de Procedimientos (HU-87).
// Cuando se implemente HU-87, este catálogo se reemplaza por servicio real.
export const PROCEDIMIENTOS_CATALOGO: OpcionCatalogo[] = [
  { value: 'PC-MT-01',      label: 'PC-MT-01 — Calibración de peso patrón con comparador' },
  { value: 'PC-MT-02',      label: 'PC-MT-02 — Verificación técnica de báscula de camión' },
  { value: 'POST10-2016',   label: 'POST10 Rev.01 2016 — Mantenimiento de balanzas clase III-IIII' },
  { value: 'PC-001-2025',   label: 'PC-001 Ed.2 2025 — Calibración de instrumentos de pesaje no automático' },
  { value: 'PC-BAL-01',     label: 'PC-BAL-01 — Mantenimiento preventivo de balanza camionera' },
  { value: 'PC-INST-01',    label: 'PC-INST-01 — Instalación de sistema de pesaje industrial' },
];

// Regla de negocio: sólo la clase 'servicio' usa procedimientos y NO tiene marca/modelo.
// Las clases equipo/pesa/instrumento tienen marca/modelo y NO usan procedimientos.
export function esServicio(clase: string): boolean {
  return clase === 'servicio';
}

export const TIPOS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'instrumento_laboratorio', label: 'Instrumento de Laboratorio' },
  { value: 'balanza_industrial',       label: 'Balanza Industrial' },
  { value: 'balanza_precision',        label: 'Balanza de Precisión' },
  { value: 'celda_carga',              label: 'Celda de Carga' },
  { value: 'indicador_digital',        label: 'Indicador Digital' },
  { value: 'pesa_patron',              label: 'Pesa Patrón' },
  { value: 'mantenimiento_calibracion', label: 'Mantenimiento y Calibración' },
];

export const SUBTIPOS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'estufa',            label: 'Estufa' },
  { value: 'de_plataforma',     label: 'De Plataforma' },
  { value: 'bloque_patron',     label: 'Bloque Patrón' },
  { value: 'celda_50t',         label: 'Celda 50T Canister' },
  { value: 'indicador_alta_res', label: 'Indicador Alta Resolución' },
  { value: 'pesa_clase_m1',     label: 'Pesa Clase M1' },
  { value: 'clase_iii_iiii',    label: 'Clase III - IIII' },
  { value: 'balanza_camiones',  label: 'Balanza de Camiones' },
];

export const MARCAS_SUMINISTRO: OpcionCatalogo[] = [
  { value: '3s_cientific',    label: '3S CIENTIFIC' },
  { value: 'mettler_toledo',  label: 'METTLER TOLEDO' },
  { value: 'rice_lake',       label: 'RICE LAKE' },
  { value: 'total_weight',    label: 'TOTAL WEIGHT' },
  { value: 'ohaus',           label: 'OHAUS' },
  { value: 'mitutoyo',        label: 'MITUTOYO' },
  { value: 'ad',              label: 'A&D' },
];

export const MODELOS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'htc_8',           label: 'HTC-8' },
  { value: 'pti_1212_t32xw',  label: 'PTI-1212-T32XW' },
  { value: '516_106_10',      label: '516-106-10' },
  { value: 'pdx50',           label: 'PDX50' },
  { value: '820',             label: '820' },
  { value: 'tw_m1',           label: 'TW-M1' },
  { value: 'ek_6000',         label: 'EK-6000' },
];

export const PROCEDENCIAS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'nacional',           label: 'Nacional' },
  { value: 'importado',          label: 'Importado' },
  { value: 'importado_usa',      label: 'Importado USA' },
  { value: 'importado_japon',    label: 'Importado Japón' },
  { value: 'importado_europa',   label: 'Importado Europa' },
  { value: 'importado_china',    label: 'Importado China' },
  { value: 'servicio',           label: 'Servicio' },
];

export const UNIDADES_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'unidad_bienes',    label: 'Unidades (Bienes)' },
  { value: 'unidad_servicios', label: 'Unidades (Servicios)' },
  { value: 'n',                label: 'N' },
  { value: 'metro',            label: 'Metro' },
  { value: 'kilogramo',        label: 'Kilogramo' },
];

export const NIVELES_TARIFA: OpcionCatalogo[] = [
  { value: 'estandar',         label: 'Nivel 1 (Estándar)' },
  { value: 'volumen',          label: 'Nivel 2 (Volumen)' },
  { value: 'corporativo_alto', label: 'Nivel 3 (Corporativo Alto)' },
];
