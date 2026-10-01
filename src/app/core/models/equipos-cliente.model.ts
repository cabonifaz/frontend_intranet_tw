export interface EquipoClienteListaItem {
  idEquipo:            number;   // BD-only
  numSerie:            string;
  idCliente:           number;
  clienteRazonSocial:  string;
  idSede:              number;
  sedeNombre:          string;
  codigoCliente:       string;   // Ej: "ACT-TOT-1014-002"
  codigoTw:            string;   // Ej: "EQ-TW-2026-0001"
  clasificacion:       string;   // value del catálogo
  clasificacionLabel:  string;   // "INSTRUMENTO" en la tabla
  marca:               string;
  modelo:              string;
  estado:              string;   // Vigente | Por Vencer | Activo | Inactivo
  esActivo:            boolean;
}

export interface FotoEquipo {
  tipo:  'vista_general' | 'vista_lateral' | 'vista_trasera';
  label: string;
  url:   string;   // placeholder — upload real pendiente
}

export interface OrdenTrabajoResumen {
  numeroOt:   string;    // Ej: "OT 2025-0014"
  fecha:      string;
  tecnico:    string;
  tipoServicio: string;  // Ej: "Preventivo + Calibración CTF"
}

export interface EquipoClienteDetalle extends EquipoClienteListaItem {
  // 01 - Datos Generales y Ubicación
  ubicacionEspecifica:      string;
  esPreRevisado:            boolean;
  usuarioPreRevisor:        string;
  fechaPreRevision:         string;
  bloqueadoParaServicios:   boolean;

  // 02 - Especificaciones Metrológicas y Técnicas
  idSuministro:             number | null;  // vinculación a HU-86
  suministroLabel:          string;         // Ej: "METTLER TOLEDO PUA679-CS1500 Plataforma Inox"
  divisionMinima:           string;         // Ej: "0.05 kg"
  divisionVerif:            string;
  divisionVerifIgual:       boolean;        // checkbox "d = e"
  claseExactitud:           string;         // 'I' | 'II' | 'III' | 'IIII'
  alcanceMaximo:            string;         // Ej: "1500 kg"
  escalaGraduacion:         string;         // Ej: "Monorango (Niveles simple cronico)"
  puntosCalibracion:        string;         // Ej: "35%, 25%, 50%, 75%, 100%"
  rangoOperativoReal:       string;         // Ej: "50 kg hasta 1200 kg"
  observaciones:            string;

  // 03 - Estado Operativo Actual
  estadoOperativo:          string;         // 'oficina_tw' | 'evaluacion' | 'ejecucion' | 'operativo_planta'

  // Sidebar - Registro Fotográfico (3 slots)
  fotos:                    FotoEquipo[];

  // Sidebar - Hoja de Vida de Servicios (OTs mock readonly)
  hojaVida:                 OrdenTrabajoResumen[];
  proximaCalibracion:       string;

  // Sidebar - Auditoría y Trazabilidad ISO 17025
  usuarioRegistro:          string;
  fechaRegistro:            string;
  pcRegistro:               string;
  fechaModificacion:        string;
}

export interface EquiposClientePaginado {
  items:     EquipoClienteListaItem[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

export interface GuardarEquipoClienteRequest {
  idEquipo:                 number;
  numSerie:                 string;
  idCliente:                number;
  idSede:                   number;
  codigoCliente:            string;
  clasificacion:            string;
  marca:                    string;
  modelo:                   string;

  ubicacionEspecifica:      string;
  esPreRevisado:            boolean;
  bloqueadoParaServicios:   boolean;

  idSuministro:             number | null;
  divisionMinima:           string;
  divisionVerif:            string;
  divisionVerifIgual:       boolean;
  claseExactitud:           string;
  alcanceMaximo:            string;
  escalaGraduacion:         string;
  puntosCalibracion:        string;
  rangoOperativoReal:       string;
  observaciones:            string;

  estadoOperativo:          string;
  esActivo:                 boolean;

  guardarComoBorrador:      boolean;
}

export interface CambiarEstadoEquipoClienteRequest {
  idEquipo: number;
  estado:   string;
}

// ────────────────────────────────────────────────────────────
// Catálogos estáticos
// ────────────────────────────────────────────────────────────

export interface OpcionCatalogo {
  value: string;
  label: string;
}

export const CLASIFICACIONES_EQUIPO: OpcionCatalogo[] = [
  { value: 'balanza_plataforma_industrial',   label: 'Balanza de Plataforma Industrial' },
  { value: 'bascula_camionera',                label: 'Báscula Camionera' },
  { value: 'balanza_precision_analitica',      label: 'Balanza de Precisión Analítica' },
  { value: 'balanza_comercial_sobremesa',      label: 'Balanza Comercial de Sobremesa' },
  { value: 'tolva_pesaje_industrial',          label: 'Tolva de Pesaje Industrial' },
  { value: 'balanza_dosificador_gancho',       label: 'Balanza Dosificadora de Gancho / Grua' },
  { value: 'balanza_colgante_etiquetadora',    label: 'Balanza Colgante Etiquetadora Comercial' },
  { value: 'balanza_laboratorio',              label: 'Balanza de Laboratorio' },
  { value: 'pesa_patron',                       label: 'Pesa Patrón' },
  { value: 'indicador_pesaje',                  label: 'Indicador de Pesaje' },
];

export const CLASES_EXACTITUD: OpcionCatalogo[] = [
  { value: 'I',    label: 'Clase I (Especial)' },
  { value: 'II',   label: 'Clase II (Fina)' },
  { value: 'III',  label: 'Clase III (Media)' },
  { value: 'IIII', label: 'Clase IIII (Ordinaria)' },
];

export const ESTADOS_OPERATIVOS: OpcionCatalogo[] = [
  { value: 'oficina_tw',       label: 'En Oficina TW' },
  { value: 'evaluacion',       label: 'En Evaluación' },
  { value: 'ejecucion',        label: 'En Ejecución' },
  { value: 'operativo_planta', label: 'Operativo en Planta' },
];

export const ESTADOS_EQUIPO: OpcionCatalogo[] = [
  { value: 'Vigente',   label: 'Vigente' },
  { value: 'Por Vencer', label: 'Por Vencer' },
  { value: 'Activo',    label: 'Activo' },
  { value: 'Inactivo',  label: 'Inactivo' },
];
