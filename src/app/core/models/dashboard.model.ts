export interface KpisDashboard {
  serviciosProgramados:  number;
  serviciosEnEjecucion:  number;
  expedientesBloqueados: number;
  pendientesSsoma:       number;
  pendientesConformidad: number;
  listosFacturar:        number;
  slaVencidos:           number;
  tecnicosEnRuta:        number;
  cumplimientoSla:       number;
  variacionSla:          number;
}

export interface AlertaOperativa {
  idAlerta:         number;
  nivel:            'CRÍTICA' | 'ALTA' | 'MEDIA';
  numeroExpediente: string;
  cliente:          string;
  tipoServicio:     string;
  areaResponsable:  string;
  motivoAlerta:     string;
  tiempoDetenido:   string;
  estado:           string;
  creadoEn:         string;
}

export interface Notificacion {
  idNotificacion: number;
  tipo:           string;
  titulo:         string;
  cuerpo:         string;
  tipoDot:        string;
  tiempo:         string;
  leida:          boolean;
  creadoEn:       string;
}
