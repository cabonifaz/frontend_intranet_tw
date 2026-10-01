import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoEquipoClienteRequest,
  CLASIFICACIONES_EQUIPO,
  EquipoClienteDetalle,
  EquipoClienteListaItem,
  EquiposClientePaginado,
  GuardarEquipoClienteRequest,
} from '../models/equipos-cliente.model';

const USAR_MOCK = environment.usarMocks;

@Injectable({ providedIn: 'root' })
export class EquiposClienteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerEquipos(
    busqueda?: string,
    idCliente?: number,
    idSede?: number,
    clasificacion?: string,
    estado?: string,
    soloVigentesEnServicio = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<EquiposClientePaginado> {
    if (USAR_MOCK) return this.mockObtener(busqueda, idCliente, idSede, clasificacion, estado, soloVigentesEnServicio, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda)       params['busqueda']       = busqueda;
    if (idCliente)      params['idCliente']      = idCliente.toString();
    if (idSede)         params['idSede']         = idSede.toString();
    if (clasificacion)  params['clasificacion']  = clasificacion;
    if (estado)         params['estado']         = estado;
    if (soloVigentesEnServicio) params['soloVigentesEnServicio'] = 'true';

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<EquiposClientePaginado>>(`${this.base}/equipos-cliente`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerEquipoPorId(id: number): Promise<EquipoClienteDetalle> {
    if (USAR_MOCK) return this.mockObtenerPorId(id);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<EquipoClienteDetalle>>(`${this.base}/equipos-cliente/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarEquipo(dto: GuardarEquipoClienteRequest): Promise<number> {
    if (USAR_MOCK) return this.mockGuardar(dto);

    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/equipos-cliente`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoEquipo(dto: CambiarEstadoEquipoClienteRequest): Promise<void> {
    if (USAR_MOCK) return this.mockCambiarEstado(dto);

    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/equipos-cliente/${dto.idEquipo}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  // ─── Catálogo mock de suministros (hasta integración HU-86 real) ─────────
  // En el prototipo este dropdown viene del catálogo de Suministros Técnicos.
  obtenerSuministrosParaDropdown(): { value: number; label: string }[] {
    return [
      { value: 1, label: 'METTLER TOLEDO PUA679-CS1500 Plataforma Inox' },
      { value: 2, label: 'RICE LAKE SURVIVOR CTR 2500 kg Steel Deck' },
      { value: 3, label: 'A&D WEIGHING EK-6000 Precisión analítica' },
      { value: 4, label: 'OHAUS CORP Defender 3000 Sobremesa 30kg' },
      { value: 5, label: 'TOLEDO IND VMT-80 Báscula camionera 80t' },
      { value: 6, label: 'FLINTEC RC3-30t Celda tolva pesaje' },
      { value: 7, label: 'MSI INTERCOMP Challenger 3 Gancho grúa' },
      { value: 8, label: 'DIGI SM 5100H Colgante etiquetadora' },
    ];
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static mockData: EquipoClienteDetalle[] = [
    {
      idEquipo: 1, numSerie: 'RT-984426-2923', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 101, sedeNombre: 'Tottus MegaPlaza - Lima Norte',
      codigoCliente: 'ACT-TOT-1014-002', codigoTw: 'EQ-TW-2026-0001',
      clasificacion: 'balanza_plataforma_industrial', clasificacionLabel: 'Balanza de Plataforma Industrial',
      marca: 'METTLER TOLEDO', modelo: 'IND570 (PUA579)',
      estado: 'Vigente', esActivo: true,
      ubicacionEspecifica: 'Zona de Recepción de Carnes y Frescos - Muelle 4',
      esPreRevisado: true, usuarioPreRevisor: 'JGARCIA', fechaPreRevision: '2025-09-05T14:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 1, suministroLabel: 'METTLER TOLEDO PUA679-CS1500 Plataforma Inox',
      divisionMinima: '0.05 kg', divisionVerif: '0.05 kg', divisionVerifIgual: true,
      claseExactitud: 'III', alcanceMaximo: '1500 kg',
      escalaGraduacion: 'Monorango (Niveles simple cronico)',
      puntosCalibracion: '15%, 25%, 50%, 75%, 100%',
      rangoOperativoReal: '50 kg hasta 1200 kg (Balanzas de carne)',
      observaciones: 'Equipo instalado en zona de alta humedad. Presenta exposición constante a lavados con solución desinfectante neutra.',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [
        { numeroOt: 'OT 2025-0014', fecha: '2025-09-22T00:00:00Z', tecnico: 'JGarcía', tipoServicio: 'Preventivo + Calibración CTF' },
        { numeroOt: 'OT 2024-9020', fecha: '2024-02-18T00:00:00Z', tecnico: 'LVargas', tipoServicio: 'Revisión mecánica preventiva' },
      ],
      proximaCalibracion: '2027-09-22T00:00:00Z',
      usuarioRegistro: 'JGARCIA', fechaRegistro: '2025-09-25T11:42:00Z',
      pcRegistro: 'COM04-METROLOGIA-01', fechaModificacion: '2026-08-15T10:00:00Z',
    },
    {
      idEquipo: 2, numSerie: 'HL-77918-A22', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 102, sedeNombre: 'Tottus Huachipa - Ingreso Principal',
      codigoCliente: 'ACT-HM-CAM-001', codigoTw: 'EQ-TW-2025-0128',
      clasificacion: 'bascula_camionera', clasificacionLabel: 'Báscula Camionera',
      marca: 'RICE LAKE', modelo: 'SURVIVOR CTR',
      estado: 'Por Vencer', esActivo: true,
      ubicacionEspecifica: 'Patio de ingreso de camiones de abastecimiento',
      esPreRevisado: true, usuarioPreRevisor: 'LVARGAS', fechaPreRevision: '2025-04-10T09:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 2, suministroLabel: 'RICE LAKE SURVIVOR CTR 2500 kg Steel Deck',
      divisionMinima: '20 kg', divisionVerif: '20 kg', divisionVerifIgual: true,
      claseExactitud: 'IIII', alcanceMaximo: '80000 kg',
      escalaGraduacion: 'Monorango industrial',
      puntosCalibracion: '20%, 50%, 80%, 100%',
      rangoOperativoReal: '500 kg hasta 60000 kg',
      observaciones: 'Expuesta a intemperie. Última lectura de celdas con desviación 0.03%.',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [
        { numeroOt: 'OT 2024-7812', fecha: '2024-12-10T00:00:00Z', tecnico: 'CMendoza', tipoServicio: 'Calibración anual' },
      ],
      proximaCalibracion: '2026-12-10T00:00:00Z',
      usuarioRegistro: 'JGARCIA', fechaRegistro: '2025-01-18T09:00:00Z',
      pcRegistro: 'COM04-METROLOGIA-01', fechaModificacion: '2025-04-10T09:00:00Z',
    },
    {
      idEquipo: 3, numSerie: 'AD-A10982-JPN', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 103, sedeNombre: 'Centro Abastecimiento - Lab Calidad',
      codigoCliente: 'LAB-TOT-CAL-903', codigoTw: 'EQ-TW-2025-1119',
      clasificacion: 'balanza_precision_analitica', clasificacionLabel: 'Balanza de Precisión Analítica',
      marca: 'A&D WEIGHING', modelo: 'EK-6000',
      estado: 'Vigente', esActivo: true,
      ubicacionEspecifica: 'Mesada antivibración · Laboratorio de calidad microbiológica',
      esPreRevisado: true, usuarioPreRevisor: 'ATORRES', fechaPreRevision: '2025-10-15T11:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 3, suministroLabel: 'A&D WEIGHING EK-6000 Precisión analítica',
      divisionMinima: '0.01 g', divisionVerif: '0.01 g', divisionVerifIgual: true,
      claseExactitud: 'II', alcanceMaximo: '6000 g',
      escalaGraduacion: 'Monorango analítico',
      puntosCalibracion: '10%, 30%, 60%, 90%, 100%',
      rangoOperativoReal: '0.1 g hasta 3000 g',
      observaciones: 'Equipo sensible. Calibración interna automática activada diariamente a las 7:00 AM.',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [
        { numeroOt: 'OT 2025-1245', fecha: '2025-10-15T00:00:00Z', tecnico: 'MTorres', tipoServicio: 'Calibración anual lab' },
      ],
      proximaCalibracion: '2026-10-15T00:00:00Z',
      usuarioRegistro: 'ATORRES', fechaRegistro: '2025-04-20T10:30:00Z',
      pcRegistro: 'COM12-LAB-01', fechaModificacion: '2025-10-15T11:00:00Z',
    },
    {
      idEquipo: 4, numSerie: 'GH-889201-18', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 104, sedeNombre: 'Tottus San Miguel - Panadería',
      codigoCliente: 'ACT-TOT-SM-041', codigoTw: 'EQ-TW-2026-1180',
      clasificacion: 'balanza_comercial_sobremesa', clasificacionLabel: 'Balanza Comercial de Sobremesa',
      marca: 'OHAUS CORP', modelo: 'Defender 3000',
      estado: 'Activo', esActivo: true,
      ubicacionEspecifica: 'Mesón de pesaje · Área de panadería interna',
      esPreRevisado: true, usuarioPreRevisor: 'JGARCIA', fechaPreRevision: '2026-02-01T09:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 4, suministroLabel: 'OHAUS CORP Defender 3000 Sobremesa 30kg',
      divisionMinima: '0.01 kg', divisionVerif: '0.01 kg', divisionVerifIgual: true,
      claseExactitud: 'III', alcanceMaximo: '30 kg',
      escalaGraduacion: 'Monorango comercial',
      puntosCalibracion: '10%, 25%, 50%, 75%, 100%',
      rangoOperativoReal: '0.5 kg hasta 20 kg',
      observaciones: 'Uso intensivo en pesaje de insumos panadería.',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [],
      proximaCalibracion: '2027-02-01T00:00:00Z',
      usuarioRegistro: 'JGARCIA', fechaRegistro: '2026-02-01T09:00:00Z',
      pcRegistro: 'COM04-METROLOGIA-01', fechaModificacion: '2026-02-01T09:00:00Z',
    },
    {
      idEquipo: 5, numSerie: 'TOL-50K-98412', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 105, sedeNombre: 'Tottus Huachipa - Salida Despacho',
      codigoCliente: 'ACT-TOT-CAM-002', codigoTw: 'EQ-TW-2025-0082',
      clasificacion: 'bascula_camionera', clasificacionLabel: 'Báscula Camionera',
      marca: 'TOLEDO IND', modelo: 'VMT-80',
      estado: 'Vigente', esActivo: true,
      ubicacionEspecifica: 'Patio de despacho · Salida de camiones',
      esPreRevisado: true, usuarioPreRevisor: 'LVARGAS', fechaPreRevision: '2025-05-20T14:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 5, suministroLabel: 'TOLEDO IND VMT-80 Báscula camionera 80t',
      divisionMinima: '20 kg', divisionVerif: '20 kg', divisionVerifIgual: true,
      claseExactitud: 'IIII', alcanceMaximo: '80000 kg',
      escalaGraduacion: 'Monorango industrial',
      puntosCalibracion: '25%, 50%, 75%, 100%',
      rangoOperativoReal: '1000 kg hasta 70000 kg',
      observaciones: '',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [
        { numeroOt: 'OT 2025-0892', fecha: '2025-05-20T00:00:00Z', tecnico: 'LVargas', tipoServicio: 'Calibración y ajuste' },
      ],
      proximaCalibracion: '2026-05-20T00:00:00Z',
      usuarioRegistro: 'LVARGAS', fechaRegistro: '2025-05-20T14:00:00Z',
      pcRegistro: 'COM06-CAMPO-01', fechaModificacion: '2025-05-20T14:00:00Z',
    },
    {
      idEquipo: 6, numSerie: 'FL-RC3-99823', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 106, sedeNombre: 'CD Huachipa · Fraccionamiento Granos',
      codigoCliente: 'TOL-CDN-SNAN-01', codigoTw: 'EQ-TW-2026-0124',
      clasificacion: 'tolva_pesaje_industrial', clasificacionLabel: 'Tolva de Pesaje Industrial',
      marca: 'FLINTEC', modelo: 'RC3-30t',
      estado: 'Vigente', esActivo: true,
      ubicacionEspecifica: 'Tolva vertical de llenado · Línea de granos',
      esPreRevisado: true, usuarioPreRevisor: 'CMENDOZA', fechaPreRevision: '2026-01-18T09:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 6, suministroLabel: 'FLINTEC RC3-30t Celda tolva pesaje',
      divisionMinima: '10 kg', divisionVerif: '10 kg', divisionVerifIgual: true,
      claseExactitud: 'IIII', alcanceMaximo: '30000 kg',
      escalaGraduacion: 'Monorango dosificación',
      puntosCalibracion: '20%, 40%, 60%, 80%, 100%',
      rangoOperativoReal: '500 kg hasta 25000 kg',
      observaciones: '',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [],
      proximaCalibracion: '2027-01-18T00:00:00Z',
      usuarioRegistro: 'CMENDOZA', fechaRegistro: '2026-01-18T09:00:00Z',
      pcRegistro: 'COM04-METROLOGIA-01', fechaModificacion: '2026-01-18T09:00:00Z',
    },
    {
      idEquipo: 7, numSerie: 'MSI-3380-771', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 107, sedeNombre: 'Tottus Puruchuco - Recepción Palets',
      codigoCliente: 'DIS-TOT-PUR-001', codigoTw: 'EQ-TW-2024-0051',
      clasificacion: 'balanza_dosificador_gancho', clasificacionLabel: 'Balanza Dosificadora de Gancho / Grua',
      marca: 'MSI INTERCOMP', modelo: 'Challenger 3',
      estado: 'Por Vencer', esActivo: true,
      ubicacionEspecifica: 'Grúa aérea · Zona de desembalaje palets',
      esPreRevisado: true, usuarioPreRevisor: 'JGARCIA', fechaPreRevision: '2024-11-05T09:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 7, suministroLabel: 'MSI INTERCOMP Challenger 3 Gancho grúa',
      divisionMinima: '2 kg', divisionVerif: '2 kg', divisionVerifIgual: true,
      claseExactitud: 'IIII', alcanceMaximo: '3000 kg',
      escalaGraduacion: 'Monorango industrial',
      puntosCalibracion: '20%, 50%, 100%',
      rangoOperativoReal: '20 kg hasta 2800 kg',
      observaciones: 'Calibración vence 2026-11-05. Programar servicio preventivo.',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [
        { numeroOt: 'OT 2024-6611', fecha: '2024-11-05T00:00:00Z', tecnico: 'JGarcia', tipoServicio: 'Calibración anual' },
      ],
      proximaCalibracion: '2026-11-05T00:00:00Z',
      usuarioRegistro: 'JGARCIA', fechaRegistro: '2024-11-05T09:00:00Z',
      pcRegistro: 'COM06-CAMPO-01', fechaModificacion: '2025-06-01T09:00:00Z',
    },
    {
      idEquipo: 8, numSerie: 'DG-SMS1-4091', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 108, sedeNombre: 'Tottus Costa Callao - Pescadería',
      codigoCliente: 'ACT-TOT-CB-012', codigoTw: 'EQ-TW-2025-7940',
      clasificacion: 'balanza_colgante_etiquetadora', clasificacionLabel: 'Balanza Colgante Etiquetadora Comercial',
      marca: 'DIGI', modelo: 'SM 5100H',
      estado: 'Activo', esActivo: true,
      ubicacionEspecifica: 'Puesto de pesaje y etiquetado de pescados',
      esPreRevisado: true, usuarioPreRevisor: 'ATORRES', fechaPreRevision: '2025-11-18T09:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 8, suministroLabel: 'DIGI SM 5100H Colgante etiquetadora',
      divisionMinima: '0.005 kg', divisionVerif: '0.005 kg', divisionVerifIgual: true,
      claseExactitud: 'III', alcanceMaximo: '15 kg',
      escalaGraduacion: 'Monorango comercial',
      puntosCalibracion: '10%, 50%, 100%',
      rangoOperativoReal: '0.1 kg hasta 10 kg',
      observaciones: 'Impresora de etiquetas integrada funcional.',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [],
      proximaCalibracion: '2026-11-18T00:00:00Z',
      usuarioRegistro: 'ATORRES', fechaRegistro: '2025-11-18T09:00:00Z',
      pcRegistro: 'COM04-METROLOGIA-01', fechaModificacion: '2025-11-18T09:00:00Z',
    },
    {
      idEquipo: 9, numSerie: 'LB-ANAL-K22-301', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 103, sedeNombre: 'Centro Abastecimiento - Lab Calidad',
      codigoCliente: 'LAB-TOT-CAL-904', codigoTw: 'EQ-TW-2026-0215',
      clasificacion: 'balanza_laboratorio', clasificacionLabel: 'Balanza de Laboratorio',
      marca: 'METTLER TOLEDO', modelo: 'ME204',
      estado: 'Vigente', esActivo: true,
      ubicacionEspecifica: 'Mesada de precisión 2 · Laboratorio',
      esPreRevisado: true, usuarioPreRevisor: 'ATORRES', fechaPreRevision: '2026-04-10T09:00:00Z',
      bloqueadoParaServicios: false,
      idSuministro: 3, suministroLabel: 'A&D WEIGHING EK-6000 Precisión analítica',
      divisionMinima: '0.0001 g', divisionVerif: '0.0001 g', divisionVerifIgual: true,
      claseExactitud: 'I', alcanceMaximo: '220 g',
      escalaGraduacion: 'Monorango laboratorio',
      puntosCalibracion: '5%, 25%, 50%, 75%, 100%',
      rangoOperativoReal: '0.001 g hasta 200 g',
      observaciones: 'Balanza analítica clase I. Ubicada en mesada antivibratoria.',
      estadoOperativo: 'operativo_planta',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [],
      proximaCalibracion: '2027-04-10T00:00:00Z',
      usuarioRegistro: 'ATORRES', fechaRegistro: '2026-04-10T09:00:00Z',
      pcRegistro: 'COM12-LAB-01', fechaModificacion: '2026-04-10T09:00:00Z',
    },
    {
      idEquipo: 10, numSerie: 'IDX-TW-9910', idCliente: 1, clienteRazonSocial: 'HIPERMERCADOS TOTTUS S.A.',
      idSede: 105, sedeNombre: 'Tottus Huachipa - Salida Despacho',
      codigoCliente: 'IND-TOT-DIS-010', codigoTw: 'EQ-TW-2025-6621',
      clasificacion: 'indicador_pesaje', clasificacionLabel: 'Indicador de Pesaje',
      marca: 'TOTAL WEIGHT', modelo: 'TW-820',
      estado: 'Inactivo', esActivo: false,
      ubicacionEspecifica: 'Caseta de operación · Báscula camionera',
      esPreRevisado: false, usuarioPreRevisor: '', fechaPreRevision: '',
      bloqueadoParaServicios: true,
      idSuministro: null, suministroLabel: '',
      divisionMinima: '10 kg', divisionVerif: '10 kg', divisionVerifIgual: true,
      claseExactitud: 'IIII', alcanceMaximo: '80000 kg',
      escalaGraduacion: 'Monorango',
      puntosCalibracion: '',
      rangoOperativoReal: '',
      observaciones: 'Equipo retirado por falla electrónica. Pendiente baja definitiva.',
      estadoOperativo: 'oficina_tw',
      fotos: [
        { tipo: 'vista_general', label: 'Vista General', url: '' },
        { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
        { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
      ],
      hojaVida: [],
      proximaCalibracion: '',
      usuarioRegistro: 'LVARGAS', fechaRegistro: '2025-07-15T09:00:00Z',
      pcRegistro: 'COM06-CAMPO-01', fechaModificacion: '2026-06-01T09:00:00Z',
    },
  ];

  private static nextId = 100;

  private async mockObtener(
    busqueda?: string,
    idCliente?: number,
    idSede?: number,
    clasificacion?: string,
    estado?: string,
    soloVigentesEnServicio = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<EquiposClientePaginado> {
    await this.mockDelay();
    let filtered = [...EquiposClienteService.mockData];

    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(e =>
        e.numSerie.toLowerCase().includes(q) ||
        e.codigoCliente.toLowerCase().includes(q) ||
        e.codigoTw.toLowerCase().includes(q) ||
        e.marca.toLowerCase().includes(q) ||
        e.modelo.toLowerCase().includes(q) ||
        e.clasificacionLabel.toLowerCase().includes(q) ||
        e.clienteRazonSocial.toLowerCase().includes(q) ||
        e.sedeNombre.toLowerCase().includes(q)
      );
    }
    if (idCliente)     filtered = filtered.filter(e => e.idCliente === idCliente);
    if (idSede)        filtered = filtered.filter(e => e.idSede === idSede);
    if (clasificacion) filtered = filtered.filter(e => e.clasificacion === clasificacion);
    if (estado)        filtered = filtered.filter(e => e.estado === estado);
    if (soloVigentesEnServicio) {
      filtered = filtered.filter(e =>
        (e.estado === 'Vigente' || e.estado === 'Activo') && e.estadoOperativo === 'operativo_planta'
      );
    }

    const total  = filtered.length;
    const inicio = (pagina - 1) * porPagina;
    const items  = filtered.slice(inicio, inicio + porPagina);
    return { items, total, pagina, porPagina };
  }

  private async mockObtenerPorId(id: number): Promise<EquipoClienteDetalle> {
    await this.mockDelay();
    const found = EquiposClienteService.mockData.find(e => e.idEquipo === id);
    if (!found) throw new Error('Equipo no encontrado.');
    return { ...found };
  }

  private async mockGuardar(dto: GuardarEquipoClienteRequest): Promise<number> {
    await this.mockDelay();

    const clasifLabel = CLASIFICACIONES_EQUIPO.find(c => c.value === dto.clasificacion)?.label ?? dto.clasificacion;

    if (dto.idEquipo === 0) {
      const nuevoId = EquiposClienteService.nextId++;
      const codigoTw = `EQ-TW-${new Date().getFullYear()}-${String(nuevoId).padStart(4, '0')}`;
      EquiposClienteService.mockData.push({
        idEquipo:              nuevoId,
        numSerie:              dto.numSerie,
        idCliente:             dto.idCliente,
        clienteRazonSocial:    'Cliente (mock)',
        idSede:                dto.idSede,
        sedeNombre:            'Sede (mock)',
        codigoCliente:         dto.codigoCliente,
        codigoTw,
        clasificacion:         dto.clasificacion,
        clasificacionLabel:    clasifLabel,
        marca:                 dto.marca,
        modelo:                dto.modelo,
        estado:                dto.guardarComoBorrador ? 'Borrador' : (dto.esActivo ? 'Vigente' : 'Inactivo'),
        esActivo:              dto.esActivo,
        ubicacionEspecifica:   dto.ubicacionEspecifica,
        esPreRevisado:         dto.esPreRevisado,
        usuarioPreRevisor:     'Admin TW',
        fechaPreRevision:      dto.esPreRevisado ? new Date().toISOString() : '',
        bloqueadoParaServicios: dto.bloqueadoParaServicios,
        idSuministro:          dto.idSuministro,
        suministroLabel:       '',
        divisionMinima:        dto.divisionMinima,
        divisionVerif:         dto.divisionVerif,
        divisionVerifIgual:    dto.divisionVerifIgual,
        claseExactitud:        dto.claseExactitud,
        alcanceMaximo:         dto.alcanceMaximo,
        escalaGraduacion:      dto.escalaGraduacion,
        puntosCalibracion:     dto.puntosCalibracion,
        rangoOperativoReal:    dto.rangoOperativoReal,
        observaciones:         dto.observaciones,
        estadoOperativo:       dto.estadoOperativo,
        fotos: [
          { tipo: 'vista_general', label: 'Vista General', url: '' },
          { tipo: 'vista_lateral', label: 'Vista Lateral', url: '' },
          { tipo: 'vista_trasera', label: 'Vista Trasera', url: '' },
        ],
        hojaVida: [],
        proximaCalibracion:    '',
        usuarioRegistro:       'Admin TW',
        fechaRegistro:         new Date().toISOString(),
        pcRegistro:            'WEB',
        fechaModificacion:     new Date().toISOString(),
      });
      return nuevoId;
    }

    const existing = EquiposClienteService.mockData.find(e => e.idEquipo === dto.idEquipo);
    if (!existing) throw new Error('Equipo no encontrado.');
    Object.assign(existing, {
      // NOTE: numSerie, marca, modelo son READONLY tras creación — no se sobreescriben desde el DTO en modo edit
      idCliente:             dto.idCliente,
      idSede:                dto.idSede,
      codigoCliente:         dto.codigoCliente,
      clasificacion:         dto.clasificacion,
      clasificacionLabel:    clasifLabel,
      estado:                dto.esActivo ? 'Vigente' : 'Inactivo',
      esActivo:              dto.esActivo,
      ubicacionEspecifica:   dto.ubicacionEspecifica,
      esPreRevisado:         dto.esPreRevisado,
      bloqueadoParaServicios: dto.bloqueadoParaServicios,
      idSuministro:          dto.idSuministro,
      divisionMinima:        dto.divisionMinima,
      divisionVerif:         dto.divisionVerif,
      divisionVerifIgual:    dto.divisionVerifIgual,
      claseExactitud:        dto.claseExactitud,
      alcanceMaximo:         dto.alcanceMaximo,
      escalaGraduacion:      dto.escalaGraduacion,
      puntosCalibracion:     dto.puntosCalibracion,
      rangoOperativoReal:    dto.rangoOperativoReal,
      observaciones:         dto.observaciones,
      estadoOperativo:       dto.estadoOperativo,
      fechaModificacion:     new Date().toISOString(),
    });
    return dto.idEquipo;
  }

  private async mockCambiarEstado(dto: CambiarEstadoEquipoClienteRequest): Promise<void> {
    await this.mockDelay();
    const existing = EquiposClienteService.mockData.find(e => e.idEquipo === dto.idEquipo);
    if (!existing) throw new Error('Equipo no encontrado.');
    existing.estado = dto.estado;
    existing.esActivo = dto.estado === 'Vigente' || dto.estado === 'Activo';
  }

  private mockDelay(ms = 220): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
