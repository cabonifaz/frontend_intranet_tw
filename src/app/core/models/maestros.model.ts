export interface ClienteListaItem {
  idCliente: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  tipoCliente: string;
  condicionFiscal: string;
  condicionContribuyente: string;
  esVip: boolean;
  estado: string;
}

export interface ClienteDetalle {
  idCliente: number;
  tipoDocumento: string;
  ruc: string;
  tipoCliente: string;
  razonSocial: string;
  nombreComercial: string | null;
  condicionFiscal: string;
  condicionContribuyente: string;
  condicionPago: string | null;
  lineaCreditoUsd: number | null;
  telefonoCentral: string | null;
  domicilioFiscal: string | null;
  esVip: boolean;
  reglaVip: string | null;
  descuentoVipPct: number | null;
  patronMasasAsignado: string | null;
  ssomaPaseIngreso: boolean;
  ssomaTrabajoAltura: boolean;
  ssomaEspacioConfinado: boolean;
  ssomaInduccionPrevia: boolean;
  ssomaNotas: string | null;
  estado: string;
}

export interface GuardarClienteRequest {
  idCliente: number;
  tipoDocumento: string;
  ruc: string;
  tipoCliente: string;
  razonSocial: string;
  nombreComercial: string | null;
  condicionFiscal: string;
  condicionContribuyente: string;
  condicionPago: string | null;
  lineaCreditoUsd: number | null;
  telefonoCentral: string | null;
  domicilioFiscal: string | null;
  esVip: boolean;
  reglaVip: string | null;
  descuentoVipPct: number | null;
  patronMasasAsignado: string | null;
  ssomaPaseIngreso: boolean;
  ssomaTrabajoAltura: boolean;
  ssomaEspacioConfinado: boolean;
  ssomaInduccionPrevia: boolean;
  ssomaNotas: string | null;
}

export interface CambiarEstadoClienteRequest {
  idCliente: number;
  estado: string;
}
