// ─────────────────────────────────────────────────────────────────────────────
// Directorio Interno (#4303) — contactos del personal activo (solo lectura).
// Back: GET /api/directorio
// ─────────────────────────────────────────────────────────────────────────────

export interface DirectorioItem {
  idUsuario:      number;
  nombreCompleto: string;
  area:           string;
  areaLabel:      string;
  cargo:          string;
  correo:         string;
  telefono:       string;
  anexo:          string;
  troncal:        string;
  /** Troncal + interno, ej. "5699750 - 207". Vacío si no tiene anexo. */
  anexoCompleto:  string;
  /** Día y mes ("15/05"). Vacío si no se registró. */
  cumpleanos:     string;
}

export interface DirectorioPaginado {
  items:     DirectorioItem[];
  total:     number;
  pagina:    number;
  porPagina: number;
}

export interface CumpleanosItem {
  idUsuario:      number;
  nombreCompleto: string;
  areaLabel:      string;
  dia:            number;
  cumpleanos:     string;
}
