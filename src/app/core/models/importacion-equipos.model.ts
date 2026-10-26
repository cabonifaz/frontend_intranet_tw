// ═════════════════════════════════════════════════════════════════════════════
// Propuestas — Importación masiva del listado de equipos desde Excel con IA.
// Contrato espejo del back (TW.Intranet.Aplicacion/Dtos/ImportacionEquiposPropuestaDtos.cs).
// Flujo: analizar (vista previa, no guarda) → el comercial revisa → confirmar
// (crea equipos nuevos en el inventario y devuelve la lista para la propuesta).
// ═════════════════════════════════════════════════════════════════════════════

/** Estado de la fila dentro del análisis. */
export type EstadoFilaImportacion = 'automatico' | 'revision' | 'nuevo' | 'omitido';

/** Qué va a pasar con la fila al confirmar. */
export type AccionImportacion = 'vincular' | 'crear' | 'ninguna';

/** Origen del match. */
export type OrigenImportacion = 'reglas' | 'ia';

/** Clasificación válida al crear un equipo nuevo. */
export type ClasificacionEquipoImportacion = 'equipo' | 'instrumento' | 'pesa';

// ─── Resultado del análisis ──────────────────────────────────────────────────

export interface AnalisisImportacionEquipos {
  nombreArchivo:   string;
  hoja:            string;
  /** N.° de fila (base 1) de los encabezados; 0 = sin encabezados. */
  filaEncabezado:  number;
  /** Filas con datos leídas (sin contar encabezados ni vacías). */
  totalFilas:      number;
  /** true si la IA reconoció columnas o concilió filas. */
  iaUtilizada:     boolean;
  /** Motor usado (ej. "gemini-3.5-flash-lite") o "reglas". */
  motor:           string;
  /** Aviso si la IA no estuvo disponible o falló (el análisis sigue con reglas). */
  avisoIa?:        string | null;
  resumen:         ResumenImportacionEquipos;
  columnas:        ColumnaDetectada[];
  filas:           FilaImportacionEquipo[];
  sedes:           OpcionImportacion[];
  clasificaciones: OpcionImportacion[];
}

export interface ResumenImportacionEquipos {
  automaticos:    number;
  revision:       number;
  nuevos:         number;
  omitidos:       number;
  seleccionados:  number;
}

/** Columna del Excel asignada a un dato: numSerie, codigoTw, codigoCliente, equipo, marca, modelo, capacidad, ubicacion, sede. */
export interface ColumnaDetectada {
  campo:      string;
  columna:    string;
  encabezado?: string | null;
}

/** Opción para selects (sedes, clasificaciones). Id numérico o Codigo texto. */
export interface OpcionImportacion {
  id?:     number | null;
  codigo?: string | null;
  nombre:  string;
}

// ─── Fila ────────────────────────────────────────────────────────────────────

export interface FilaImportacionEquipo {
  /** N.° de fila en el Excel (base 1). */
  fila:          number;
  leido:         DatosLeidosEquipo;

  estado:        EstadoFilaImportacion;
  /** codigo_tw / num_serie / codigo_cliente (automático); serie_similar / sugerencia_ia / serie_repetida / sin_serie / faltan_datos (revisión);
   *  catalogo / sin_catalogo (nuevo); duplicado_archivo / ya_en_propuesta / otro_cliente (omitido). */
  motivo:        string;
  estadoLabel:   string;
  /** 0 a 100. */
  confianza:     number;
  origen:        OrigenImportacion;
  accion:        AccionImportacion;
  seleccionado:  boolean;
  /** false = no se puede importar tal cual (falta un dato o está omitido). */
  importable:    boolean;
  observaciones: string[];

  /** Equipo del cliente con el que coincide (accion = vincular). */
  equipo?:       EquipoConciliado | null;
  /** Equipos del cliente parecidos (resolver a mano). Máx. 5. */
  candidatos:    EquipoConciliado[];
  /** Datos con que se creará el equipo (accion = crear). */
  nuevo?:        NuevoEquipoImportacion | null;
  /** Suministros del catálogo parecidos (para elegir a mano). Máx. 5. */
  suministrosCandidatos: SuministroConciliado[];
}

/** Datos tal como vienen en el Excel (texto). */
export interface DatosLeidosEquipo {
  numSerie?:      string | null;
  codigoTw?:      string | null;
  codigoCliente?: string | null;
  equipo?:        string | null;
  marca?:         string | null;
  modelo?:        string | null;
  capacidad?:     string | null;
  ubicacion?:     string | null;
  sede?:          string | null;
}

export interface EquipoConciliado {
  idEquipo:           number;
  codigoTw:           string;
  numSerie:           string;
  codigoCliente?:     string | null;
  clasificacion:      string;
  clasificacionLabel: string;
  marca:              string;
  modelo:             string;
  idSede:             number;
  sedeNombre?:        string | null;
  ubicacion?:         string | null;
  alcanceMaximo?:     string | null;
  /** activo | inactivo | borrador. */
  estado:             string;
  tipo?:              string | null;
  subtipo?:           string | null;
  /** Parecido con la fila (0 a 100). */
  puntaje:            number;
}

export interface NuevoEquipoImportacion {
  numSerie:              string;
  marca?:                string | null;
  modelo?:               string | null;
  clasificacion?:        ClasificacionEquipoImportacion | string | null;
  idSuministro?:         number | null;
  suministroDescripcion?: string | null;
  idSede?:               number | null;
  sedeNombre?:           string | null;
  codigoCliente?:        string | null;
  ubicacion?:            string | null;
  alcanceMaximo?:        string | null;
}

export interface SuministroConciliado {
  idSuministro: number;
  codigo:       string;
  descripcion:  string;
  clase?:       string | null;
  tipo?:        string | null;
  subtipo?:     string | null;
  marca?:       string | null;
  modelo?:      string | null;
  puntaje:      number;
}

// ─── Confirmar ───────────────────────────────────────────────────────────────

export interface ConfirmarImportacionEquiposRequest {
  idCliente: number;
  filas:     FilaConfirmarImportacion[];
}

export interface FilaConfirmarImportacion {
  fila:          number;
  accion:        AccionImportacion;
  idEquipo?:     number | null;
  numSerie?:     string | null;
  marca?:        string | null;
  modelo?:       string | null;
  clasificacion?: string | null;
  idSuministro?: number | null;
  idSede?:       number | null;
  codigoCliente?: string | null;
  ubicacion?:    string | null;
  alcanceMaximo?: string | null;
}

export interface ResultadoImportacionEquipos {
  vinculados:   number;
  creados:      number;
  /** Filas "crear" cuyo equipo ya existía (misma serie/marca/modelo): se vincularon. */
  reutilizados: number;
  /** Equipos para agregar al listado de la propuesta, en orden de las filas. */
  equipos:      EquipoImportado[];
}

export interface EquipoImportado {
  fila:               number;
  idEquipo:           number;
  codigoTw:           string;
  numSerie:           string;
  marca:              string;
  modelo:             string;
  clasificacion:      string;
  clasificacionLabel: string;
  tipo?:              string | null;
  subtipo?:           string | null;
  idSede:             number;
  sedeNombre?:        string | null;
  codigoCliente?:     string | null;
  ubicacion?:         string | null;
  /** vinculado | creado | reutilizado. */
  resultado:          'vinculado' | 'creado' | 'reutilizado';
}
