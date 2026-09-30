export interface SuplenteListaItem {
  idAsignacion:   number;
  idTitular:      number;
  titularNombre:  string;
  titularApellido: string;
  titularCargo:   string | null;
  idSuplente:     number;
  suplenteNombre: string;
  suplenteApellido: string;
  suplenteCargo:  string | null;
  fechaInicio:    string;
  fechaFin:       string | null;
  estado:         string;
  fechaCreacion:  string;
}

export interface SuplentesPaginado {
  items: SuplenteListaItem[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface GuardarSuplenteRequest {
  idAsignacion:  number;
  idTitular:     number;
  idSuplente:    number;
  fechaInicio:   string;
  fechaFin:      string | null;
  sinFechaFin:   boolean;
  activo:        boolean;
}

export interface CambiarEstadoSuplenteRequest {
  idAsignacion: number;
  estado: string;
}
