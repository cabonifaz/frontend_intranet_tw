export interface TextoBaseListaItem {
  idTextoBase:     number;
  codigoCorto:     string;
  tipoCategoria:   string;
  tipoCategoriaLabel: string;
  nombre:          string;
  textoClausula:   string;
  estado:          string;
  esPredeterminado: boolean;
  esNegritaPorDefecto: boolean;
  fechaCreacion:   string;
  usuarioCreador:  string;
}

export interface TextoBaseDetalle extends TextoBaseListaItem {
  seccionDossier:   string;
  ordenAparicion:   number;
  nivelSangria:     string;

  // Aplicabilidad
  aplicaTodosServicios:       boolean;
  aplicaCalibracionLab:       boolean;
  aplicaCalibracionPlanta:    boolean;
  aplicaMantenimiento:        boolean;
  aplicaVentaSuministros:     boolean;

  // Visibilidad por perfil
  visibleGestoresComerciales: boolean;
  visibleTecnicosMetrologos:  boolean;
  visibleSupervisores:        boolean;

  // Auditoría
  propuestasAsociadas: number;
}

export interface TextosBasePaginado {
  items: TextoBaseListaItem[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface GuardarTextoBaseRequest {
  idTextoBase:      number;
  codigoCorto:      string;
  tipoCategoria:    string;
  nombre:           string;
  textoClausula:    string;
  seccionDossier:   string;
  ordenAparicion:   number;
  nivelSangria:     string;
  esPredeterminado: boolean;
  esNegritaPorDefecto: boolean;
  activo:           boolean;

  aplicaTodosServicios:       boolean;
  aplicaCalibracionLab:       boolean;
  aplicaCalibracionPlanta:    boolean;
  aplicaMantenimiento:        boolean;
  aplicaVentaSuministros:     boolean;

  visibleGestoresComerciales: boolean;
  visibleTecnicosMetrologos:  boolean;
  visibleSupervisores:        boolean;

  guardarComoBorrador:        boolean;
}

export interface CambiarEstadoTextoBaseRequest {
  idTextoBase: number;
  estado: string;
}

// Catálogos estáticos

export interface CategoriaTextoBase {
  value: string;
  label: string;
}

export const CATEGORIAS_TEXTO_BASE: CategoriaTextoBase[] = [
  { value: 'servicio_saludo',   label: 'Servicio · Saludo' },
  { value: 'comercial_saludo',  label: 'Comercial · Saludo' },
  { value: 'propuesta',          label: 'Propuesta (Cláusulas generales de alcance)' },
  { value: 'recomendaciones',    label: 'Recomendaciones' },
  { value: 'condiciones',        label: 'Condiciones Comerciales' },
  { value: 'garantia',           label: 'Garantía' },
  { value: 'legal',              label: 'Cláusula Legal' },
  { value: 'firma_pie',          label: 'Firma / Pie de página' },
];

export interface SeccionDossier {
  value: string;
  label: string;
}

export const SECCIONES_DOSSIER: SeccionDossier[] = [
  { value: 'cap1', label: 'Capítulo I: Presentación y Alcance' },
  { value: 'cap2', label: 'Capítulo II: Metodología Técnica' },
  { value: 'cap3', label: 'Capítulo III: Cronograma y Ejecución' },
  { value: 'cap4', label: 'Capítulo IV: Aspectos Comerciales' },
  { value: 'cap5', label: 'Capítulo V: Requerimientos Previos y Logística' },
  { value: 'cap6', label: 'Capítulo VI: Anexos Técnicos' },
];

export interface NivelSangria {
  value: string;
  label: string;
}

export const NIVELES_SANGRIA: NivelSangria[] = [
  { value: 'estandar',       label: 'Párrafo Estándar (Sin sangría)' },
  { value: 'primer_nivel',   label: 'Primer Nivel (Sangría 1cm)' },
  { value: 'segundo_nivel',  label: 'Segundo Nivel (Sangría 2cm)' },
  { value: 'vineta',         label: 'Viñeta / Bullet' },
];

// Variables insertables en el editor
export interface VariableInsertable {
  token: string;
  descripcion: string;
}

export const VARIABLES_INSERTABLES: VariableInsertable[] = [
  { token: '{Cliente}',   descripcion: 'Razón social del cliente' },
  { token: '{RUC}',       descripcion: 'RUC del cliente' },
  { token: '{Fecha}',     descripcion: 'Fecha de emisión' },
  { token: '{Propuesta}', descripcion: 'Número de propuesta' },
];
