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
  normaBase:            string;
  esActivo:             boolean;
  urlPdfAprobado:       string;

  usuarioRegistro:      string;
  pcRegistro:           string;
  fechaModificacion:    string;
  totalEdiciones:       number;

  // HU-87 — PDF aprobado cargado al back (migración 42)
  tienePdf?:            boolean;
  pdfNombreArchivo?:    string | null;
  pdfTamanoBytes?:      number | null;
  pdfSubidoEn?:         string | null;
  pdfSubidoPor?:        string | null;
}

export interface PermisoPdfProcedimiento {
  puedeSubirPdf: boolean;
  motivo?:       string | null;
}

export interface PdfProcedimientoInfo {
  nombreArchivo: string;
  tamanoBytes:   number;
  subidoEn?:     string | null;
  subidoPor?:    string | null;
  urlPdf:        string;
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
  descripcion:          string;
  esFormatoDigitalIso:  boolean;
  urlPdfAprobado:       string;
  esActivo:             boolean;

  guardarComoBorrador:  boolean;
}

export interface CambiarEstadoProcedimientoRequest {
  idProcedimiento: number;
  estado:          string;
}

export interface OpcionCatalogo {
  value: string;
  label: string;
}
