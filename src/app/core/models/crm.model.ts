import type { CatalogoItem } from './maestros.model';
export type { CatalogoItem };

export interface CatalogosRequerimiento {
  origenes:    CatalogoItem[];
  areas:       CatalogoItem[];
  prioridades: CatalogoItem[];
  motivos:     CatalogoItem[];
  estadosRq:   CatalogoItem[];
}

export interface AnularRequerimientoComando {
  idMotivo:      number;
  justificacion: string;
}

export interface HistorialItem {
  idHistorial:  number;
  tipo:         string;
  tipoLabel:    string | null;
  icono:        string | null;
  descripcion:  string;
  usuario:      string | null;
  fecha:        string;
}

export interface RequerimientoFicha {
  idRequerimiento: number;
  numero:          string;
  idCliente:       number;
  razonSocial:     string;
  ruc:             string;
  idContacto:      number | null;
  idSede:          number | null;
  nombreContacto:  string | null;
  nombreSede:      string | null;
  responsable:     string | null;
  fechaCreacion:   string;
  idOrigen:        number;
  origenLabel:     string | null;
  idArea:          number;
  areaLabel:       string | null;
  idPrioridad:     number;
  prioridadLabel:  string | null;
  fechaNecesidad:  string | null;
  descripcion:     string;
  notificarCorreo: boolean;
  requiereVisita:  boolean;
  clienteDeuda:    boolean;
  estado:          string;
  estadoLabel:     string | null;
  historial:       HistorialItem[];
}

export interface GuardarRequerimientoComando {
  idRequerimiento: number;
  idCliente:       number;
  idSede:          number | null;
  idContacto:      number | null;
  idOrigen:        number;
  idArea:          number;
  idPrioridad:     number;
  fechaNecesidad:  string | null;
  descripcion:     string;
  notificarCorreo: boolean;
  requiereVisita:  boolean;
  clienteDeuda:    boolean;
}

export interface KpisRequerimientos {
  rqActivos:    number;
  sinPropuesta: number;
  slaUrgentes:  number;
  bloqueados:   number;
}

export interface RequerimientoListaItem {
  idRequerimiento: number;
  numero:          string;
  razonSocial:     string;
  ruc:             string;
  nombreSede:      string | null;
  nombreContacto:  string | null;
  tipoLabel:       string | null;
  origenLabel:     string | null;
  prioridadLabel:  string | null;
  idPrioridad:     number;
  responsable:     string | null;
  fechaCreacion:   string;
  fechaNecesidad:  string | null;
  estado:          string;
  estadoLabel:     string | null;
}

export interface RequerimientosPaginado {
  kpis:      KpisRequerimientos;
  items:     RequerimientoListaItem[];
  total:     number;
  pagina:    number;
  porPagina: number;
}
