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
  rangoOperativo:     string[];
  unidad:             string;
  cuenta:             string;
  stock:              number;

  // Panel Cotización
  codigoUnspsc:       string;
  precioMinReferencia: number | null;
  escalas:            EscalaTarifa[];
  aplicaComercial:    boolean;
  aplicaServicioTecnico: boolean;
  aplicaLaboratorioMetrologia: boolean;

  // Procedimientos relacionados (link a HU-87)
  procedimientosAsociados: ProcedimientoAsociado[];

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
  marca:              string;
  modelo:             string;
  descripcionAuto:    string;
  descripcionManual:  string;
  rangoOperativo:     string[];
  unidad:             string;
  ctaContable:        string;
  procedencia:        string;
  cuenta:             string;
  stock:              number;
  esActivoEnCatalogo: boolean;

  usarEnPropuestas:            boolean;
  codigoUnspsc:                string;
  precioMinReferencia:         number | null;
  escalas:                     EscalaTarifa[];
  aplicaComercial:             boolean;
  aplicaServicioTecnico:       boolean;
  aplicaLaboratorioMetrologia: boolean;

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
  { value: 'instrumento', label: 'Instrumento' },
  { value: 'insumo',      label: 'Insumo' },
  { value: 'repuesto',    label: 'Repuesto' },
  { value: 'accesorio',   label: 'Accesorio' },
  { value: 'consumible',  label: 'Consumible' },
  { value: 'equipo',      label: 'Equipo' },
  { value: 'servicio',    label: 'Servicio' },
];

export const TIPOS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'instrumento_laboratorio', label: 'Instrumento de Laboratorio' },
  { value: 'celda_carga',              label: 'Celda de Carga' },
  { value: 'indicador_digital',        label: 'Indicador Digital' },
  { value: 'pesa_patron',              label: 'Pesa Patrón' },
  { value: 'cable',                    label: 'Cable' },
  { value: 'balanza',                  label: 'Balanza' },
  { value: 'jebe_proteccion',          label: 'Jebe de Protección' },
  { value: 'caja_conexion',            label: 'Caja de Conexión' },
];

export const SUBTIPOS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'estulu',            label: 'Eslulu' },
  { value: 'celda_50t',         label: 'Celda 50T Canister' },
  { value: 'indicador_alta_res', label: 'Indicador Alta Resolución' },
  { value: 'pesa_clase_m1',     label: 'Pesa Clase M1' },
  { value: 'cable_blindado',    label: 'Cable Blindado' },
  { value: 'balanza_precision', label: 'Balanza de Precisión' },
  { value: 'jebe_tipo_t',       label: 'Jebe Tipo T' },
  { value: 'caja_suma',         label: 'Caja Suma' },
];

export const MARCAS_SUMINISTRO: OpcionCatalogo[] = [
  { value: '3s_cientific',    label: '3S CIENTIFIC' },
  { value: 'mettler_toledo',  label: 'METTLER TOLEDO' },
  { value: 'rice_lake',       label: 'RICE LAKE' },
  { value: 'total_weight',    label: 'TOTAL WEIGHT' },
  { value: 'belden',          label: 'BELDEN' },
  { value: 'ad',              label: 'A&D' },
];

export const MODELOS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'htc_8',    label: 'HTC-8' },
  { value: 'pdx50',    label: 'PDX50' },
  { value: '820',      label: '820' },
  { value: 'tw_m1',    label: 'TW-M1' },
  { value: '8618s',    label: '8618/S' },
  { value: 'ek_6000',  label: 'EK-6000' },
  { value: 'j8_780',   label: 'J8-780' },
  { value: 'jb4ss',    label: 'JB4SS' },
];

export const PROCEDENCIAS_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'nacional',           label: 'Nacional' },
  { value: 'importado',          label: 'Importado' },
  { value: 'importado_usa',      label: 'Importado USA' },
  { value: 'importado_japon',    label: 'Importado Japón' },
  { value: 'importado_europa',   label: 'Importado Europa' },
  { value: 'importado_china',    label: 'Importado China' },
];

export const UNIDADES_SUMINISTRO: OpcionCatalogo[] = [
  { value: 'unidad',    label: 'Unidad' },
  { value: 'metro',     label: 'Metro' },
  { value: 'kilogramo', label: 'Kilogramo' },
  { value: 'litro',     label: 'Litro' },
  { value: 'servicio',  label: 'Servicio' },
];

export const NIVELES_TARIFA: OpcionCatalogo[] = [
  { value: 'estandar',         label: 'Nivel 1 (Estándar)' },
  { value: 'volumen',          label: 'Nivel 2 (Volumen)' },
  { value: 'corporativo_alto', label: 'Nivel 3 (Corporativo Alto)' },
];
