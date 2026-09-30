import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RespuestaApi } from '../models/autenticacion.model';
import {
  CambiarEstadoSuministroRequest,
  GuardarSuministroRequest,
  SuministroDetalle,
  SuministroListaItem,
  SuministrosPaginado,
  MARCAS_SUMINISTRO,
  MODELOS_SUMINISTRO,
  TIPOS_SUMINISTRO,
  SUBTIPOS_SUMINISTRO,
  CLASES_SUMINISTRO,
  PROCEDENCIAS_SUMINISTRO,
  OpcionCatalogo,
} from '../models/suministros.model';

const USAR_MOCK = true;

@Injectable({ providedIn: 'root' })
export class SuministrosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/maestros`;

  async obtenerSuministros(
    busqueda?: string,
    clase?: string,
    tipo?: string,
    estado?: string,
    soloEnPropuestas = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<SuministrosPaginado> {
    if (USAR_MOCK) return this.mockObtener(busqueda, clase, tipo, estado, soloEnPropuestas, pagina, porPagina);

    const params: Record<string, string> = {
      pagina:    pagina.toString(),
      porPagina: porPagina.toString(),
    };
    if (busqueda) params['busqueda'] = busqueda;
    if (clase)    params['clase']    = clase;
    if (tipo)     params['tipo']     = tipo;
    if (estado)   params['estado']   = estado;
    if (soloEnPropuestas) params['soloEnPropuestas'] = 'true';

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuministrosPaginado>>(`${this.base}/suministros`, { params })
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async obtenerSuministroPorId(id: number): Promise<SuministroDetalle> {
    if (USAR_MOCK) return this.mockObtenerPorId(id);

    const r = await firstValueFrom(
      this.http.get<RespuestaApi<SuministroDetalle>>(`${this.base}/suministros/${id}`)
    );
    if (!r.datos) throw new Error(r.mensaje);
    return r.datos;
  }

  async guardarSuministro(dto: GuardarSuministroRequest): Promise<number> {
    if (USAR_MOCK) return this.mockGuardar(dto);

    const r = await firstValueFrom(
      this.http.post<RespuestaApi<number>>(`${this.base}/suministros`, dto)
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
    return r.datos!;
  }

  async cambiarEstadoSuministro(dto: CambiarEstadoSuministroRequest): Promise<void> {
    if (USAR_MOCK) return this.mockCambiarEstado(dto);

    const r = await firstValueFrom(
      this.http.patch<RespuestaApi<null>>(
        `${this.base}/suministros/${dto.idSuministro}/estado`,
        dto
      )
    );
    if (r.idTipoMensaje !== 2) throw new Error(r.mensaje);
  }

  async crearMarca(nombre: string): Promise<OpcionCatalogo> {
    await this.mockDelay(200);
    const value = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const nueva: OpcionCatalogo = { value, label: nombre.toUpperCase() };
    SuministrosService.marcasDinamicas.push(nueva);
    return nueva;
  }

  async crearModelo(nombre: string): Promise<OpcionCatalogo> {
    await this.mockDelay(200);
    const value = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const nuevo: OpcionCatalogo = { value, label: nombre.toUpperCase() };
    SuministrosService.modelosDinamicos.push(nuevo);
    return nuevo;
  }

  obtenerMarcas(): OpcionCatalogo[] {
    return [...MARCAS_SUMINISTRO, ...SuministrosService.marcasDinamicas];
  }

  obtenerModelos(): OpcionCatalogo[] {
    return [...MODELOS_SUMINISTRO, ...SuministrosService.modelosDinamicos];
  }

  generarDescripcionAuto(clase: string, tipo: string, subtipo: string, marca: string, modelo: string): string {
    const claseLabel   = this.labelDeCatalogo(CLASES_SUMINISTRO,   clase);
    const tipoLabel    = this.labelDeCatalogo(TIPOS_SUMINISTRO,    tipo);
    const subtipoLabel = this.labelDeCatalogo(SUBTIPOS_SUMINISTRO, subtipo);
    const marcaLabel   = this.labelDeCatalogo(this.obtenerMarcas(),   marca);
    const modeloLabel  = this.labelDeCatalogo(this.obtenerModelos(),  modelo);

    const partes: string[] = [];
    if (claseLabel)   partes.push(claseLabel);
    if (tipoLabel)    partes.push(tipoLabel);
    if (subtipoLabel) partes.push(subtipoLabel);
    if (marcaLabel)   partes.push(`Marca ${marcaLabel}`);
    if (modeloLabel)  partes.push(`Modelo ${modeloLabel}`);
    return partes.join(' ');
  }

  private labelDeCatalogo(catalogo: OpcionCatalogo[], value: string): string {
    return catalogo.find(o => o.value === value)?.label ?? '';
  }

  // ─── MOCK ────────────────────────────────────────────────────────────────

  private static marcasDinamicas: OpcionCatalogo[] = [];
  private static modelosDinamicos: OpcionCatalogo[] = [];

  private static mockData: SuministroDetalle[] = [
    {
      idSuministro: 9150, clase: 'instrumento', claseLabel: 'Instrumento',
      tipo: 'instrumento_laboratorio', tipoLabel: 'Instrumento de Laboratorio',
      subtipo: 'estulu', subtipoLabel: 'Eslulu',
      descripcion: 'Suministro Instrumento de Laboratorio Eslulu Marca 3S CIENTIFIC Modelo HTC-8 POWERCELL',
      marca: '3s_cientific', modelo: 'htc_8',
      ctaContable: '7811109', procedencia: 'importado', procedenciaLabel: 'Importado',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Instrumento Instrumento de Laboratorio Eslulu Marca 3S CIENTIFIC Modelo HTC-8',
      descripcionManual: 'Suministro Instrumento de Laboratorio Eslulu Marca 3S CIENTIFIC Modelo HTC-8 POWERCELL, uso en control de humedad y temperatura de sensores en cámara climática.',
      rangoOperativo: ['Hasta 250 °C'], unidad: 'unidad', cuenta: '635-01', stock: 3,
      codigoUnspsc: '41111702', precioMinReferencia: 8940,
      escalas: [
        { nivel: 'estandar',         precio: 9800 },
        { nivel: 'volumen',          precio: 9100 },
        { nivel: 'corporativo_alto', precio: 8940 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: false, aplicaLaboratorioMetrologia: true,
      procedimientosAsociados: [
        { codigo: 'PC-MT-01', nombre: 'Calibración de peso patrón con comparador' },
        { codigo: 'PC-MT-02', nombre: 'Verificación técnica de báscula de camión' },
      ],
      usuarioRegistro: 'Ana Torres', fechaRegistro: '2025-04-12T09:00:00Z',
      fechaModificacion: '2026-08-15T14:30:00Z', totalEdiciones: 4, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9152, clase: 'insumo', claseLabel: 'Insumo',
      tipo: 'celda_carga', tipoLabel: 'Celda de Carga',
      subtipo: 'celda_50t', subtipoLabel: 'Celda 50T Canister',
      descripcion: 'Celda de Carga Digital Canister 50t IP68 POWERCELL',
      marca: 'mettler_toledo', modelo: 'pdx50',
      ctaContable: '', procedencia: 'importado_usa', procedenciaLabel: 'Importado USA',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Insumo Celda de Carga Celda 50T Canister Marca METTLER TOLEDO Modelo PDX50',
      descripcionManual: 'Celda de Carga Digital Canister 50t IP68 POWERCELL para instalación en balanzas industriales.',
      rangoOperativo: ['0 a 50 t'], unidad: 'unidad', cuenta: '635-02', stock: 12,
      codigoUnspsc: '41113611', precioMinReferencia: 2400,
      escalas: [
        { nivel: 'estandar',         precio: 2800 },
        { nivel: 'volumen',          precio: 2500 },
        { nivel: 'corporativo_alto', precio: 2400 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: false,
      procedimientosAsociados: [
        { codigo: 'PC-MT-02', nombre: 'Verificación técnica de báscula de camión' },
      ],
      usuarioRegistro: 'Carlos Mendoza', fechaRegistro: '2025-05-08T10:20:00Z',
      fechaModificacion: '2026-09-01T11:00:00Z', totalEdiciones: 2, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9153, clase: 'repuesto', claseLabel: 'Repuesto',
      tipo: 'indicador_digital', tipoLabel: 'Indicador Digital',
      subtipo: 'indicador_alta_res', subtipoLabel: 'Indicador Alta Resolución',
      descripcion: 'Indicador Electrónico de Pesaje Alta Resolución con Display Gráfico',
      marca: 'rice_lake', modelo: '820',
      ctaContable: '7811109', procedencia: 'importado', procedenciaLabel: 'Importado',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Repuesto Indicador Digital Indicador Alta Resolución Marca RICE LAKE Modelo 820',
      descripcionManual: 'Indicador digital de alta resolución con display gráfico OLED, 8 entradas de celda de carga.',
      rangoOperativo: ['1 μV/d resolución'], unidad: 'unidad', cuenta: '635-03', stock: 5,
      codigoUnspsc: '41115406', precioMinReferencia: 1900,
      escalas: [
        { nivel: 'estandar',         precio: 2200 },
        { nivel: 'volumen',          precio: 2000 },
        { nivel: 'corporativo_alto', precio: 1900 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: true,
      procedimientosAsociados: [],
      usuarioRegistro: 'Carlos Mendoza', fechaRegistro: '2025-05-20T09:00:00Z',
      fechaModificacion: '2026-07-10T15:00:00Z', totalEdiciones: 3, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9160, clase: 'instrumento', claseLabel: 'Instrumento',
      tipo: 'pesa_patron', tipoLabel: 'Pesa Patrón',
      subtipo: 'pesa_clase_m1', subtipoLabel: 'Pesa Clase M1',
      descripcion: 'Pesa Patrón Paralelepípeda Hierro Fundido Clase M1 20kg con Cavidad de Ajuste',
      marca: 'total_weight', modelo: 'tw_m1',
      ctaContable: '7811109', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Instrumento Pesa Patrón Pesa Clase M1 Marca TOTAL WEIGHT Modelo TW-M1',
      descripcionManual: 'Pesa patrón paralelepípeda de hierro fundido, clase M1 (OIML R111), masa nominal 20 kg con cavidad de ajuste sellada.',
      rangoOperativo: ['20 kg ± 1 g'], unidad: 'unidad', cuenta: '635-04', stock: 8,
      codigoUnspsc: '41111803', precioMinReferencia: 320,
      escalas: [
        { nivel: 'estandar',         precio: 380 },
        { nivel: 'volumen',          precio: 340 },
        { nivel: 'corporativo_alto', precio: 320 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: true,
      procedimientosAsociados: [
        { codigo: 'PC-MT-01', nombre: 'Calibración de peso patrón con comparador' },
      ],
      usuarioRegistro: 'Luis Vargas', fechaRegistro: '2025-06-01T08:30:00Z',
      fechaModificacion: '2026-06-01T10:00:00Z', totalEdiciones: 1, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9164, clase: 'accesorio', claseLabel: 'Accesorio',
      tipo: 'cable', tipoLabel: 'Cable',
      subtipo: 'cable_blindado', subtipoLabel: 'Cable Blindado',
      descripcion: 'Cable apantallado 6 hilos para celdas de carga y balanzas industriales rollo 100m',
      marca: 'belden', modelo: '8618s',
      ctaContable: '7811109', procedencia: 'importado', procedenciaLabel: 'Importado',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Accesorio Cable Cable Blindado Marca BELDEN Modelo 8618/S',
      descripcionManual: 'Cable apantallado de 6 hilos AWG22, aislamiento PVC, para uso en instalación de celdas de carga y balanzas industriales.',
      rangoOperativo: ['0 a 60 °C', '100 m'], unidad: 'metro', cuenta: '635-05', stock: 240,
      codigoUnspsc: '26121509', precioMinReferencia: 8,
      escalas: [
        { nivel: 'estandar',         precio: 12 },
        { nivel: 'volumen',          precio: 9 },
        { nivel: 'corporativo_alto', precio: 8 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: false,
      procedimientosAsociados: [],
      usuarioRegistro: 'Luis Vargas', fechaRegistro: '2025-06-14T09:00:00Z',
      fechaModificacion: '2026-08-20T09:00:00Z', totalEdiciones: 2, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9170, clase: 'instrumento', claseLabel: 'Instrumento',
      tipo: 'balanza', tipoLabel: 'Balanza',
      subtipo: 'balanza_precision', subtipoLabel: 'Balanza de Precisión',
      descripcion: 'Balanza de Precisión Analítica 0.01g Calibración Automática',
      marca: 'ad', modelo: 'ek_6000',
      ctaContable: '7811109', procedencia: 'importado_japon', procedenciaLabel: 'Importado Japón',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Instrumento Balanza Balanza de Precisión Marca A&D Modelo EK-6000',
      descripcionManual: 'Balanza de precisión analítica, capacidad 6000g x 0.01g, calibración automática interna con pesa de referencia.',
      rangoOperativo: ['0 a 6000 g', 'd = 0.01 g'], unidad: 'unidad', cuenta: '635-06', stock: 2,
      codigoUnspsc: '41111731', precioMinReferencia: 4200,
      escalas: [
        { nivel: 'estandar',         precio: 4800 },
        { nivel: 'volumen',          precio: 4400 },
        { nivel: 'corporativo_alto', precio: 4200 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: false, aplicaLaboratorioMetrologia: true,
      procedimientosAsociados: [
        { codigo: 'PC-MT-01', nombre: 'Calibración de peso patrón con comparador' },
      ],
      usuarioRegistro: 'María Torres', fechaRegistro: '2025-07-02T10:00:00Z',
      fechaModificacion: '2026-09-10T14:00:00Z', totalEdiciones: 5, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9182, clase: 'consumible', claseLabel: 'Consumible',
      tipo: 'jebe_proteccion', tipoLabel: 'Jebe de Protección',
      subtipo: 'jebe_tipo_t', subtipoLabel: 'Jebe Tipo T',
      descripcion: 'Perfil de Jebe de Protección Tipo T perimetral para Báscula Camionera',
      marca: 'total_weight', modelo: 'j8_780',
      ctaContable: '7811109', procedencia: 'importado', procedenciaLabel: 'Importado',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Consumible Jebe de Protección Jebe Tipo T Marca TOTAL WEIGHT Modelo J8-780',
      descripcionManual: 'Perfil de jebe de protección Tipo T, uso perimetral en básculas camioneras, longitud 42 m por rollo.',
      rangoOperativo: ['42 m'], unidad: 'metro', cuenta: '635-07', stock: 168,
      codigoUnspsc: '31201502', precioMinReferencia: 22,
      escalas: [
        { nivel: 'estandar',         precio: 28 },
        { nivel: 'volumen',          precio: 24 },
        { nivel: 'corporativo_alto', precio: 22 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: false,
      procedimientosAsociados: [],
      usuarioRegistro: 'Ana Torres', fechaRegistro: '2025-07-18T09:00:00Z',
      fechaModificacion: '2026-09-05T09:00:00Z', totalEdiciones: 1, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9195, clase: 'repuesto', claseLabel: 'Repuesto',
      tipo: 'caja_conexion', tipoLabel: 'Caja de Conexión',
      subtipo: 'caja_suma', subtipoLabel: 'Caja Suma',
      descripcion: 'Caja de Conexión y Suma de Celdas Acero Inox IP67 8 Entradas con Ajuste Potenciómetro',
      marca: 'rice_lake', modelo: 'jb4ss',
      ctaContable: '7811109', procedencia: 'importado', procedenciaLabel: 'Importado',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Repuesto Caja de Conexión Caja Suma Marca RICE LAKE Modelo JB4SS',
      descripcionManual: 'Caja de conexión y suma para 8 celdas de carga, gabinete acero inox 304 IP67, ajuste por potenciómetro individual por canal.',
      rangoOperativo: ['8 canales', 'IP67'], unidad: 'unidad', cuenta: '635-08', stock: 4,
      codigoUnspsc: '39121011', precioMinReferencia: 640,
      escalas: [
        { nivel: 'estandar',         precio: 720 },
        { nivel: 'volumen',          precio: 680 },
        { nivel: 'corporativo_alto', precio: 640 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: false,
      procedimientosAsociados: [
        { codigo: 'PC-MT-02', nombre: 'Verificación técnica de báscula de camión' },
      ],
      usuarioRegistro: 'Carlos Mendoza', fechaRegistro: '2025-08-03T10:30:00Z',
      fechaModificacion: '2026-08-20T09:00:00Z', totalEdiciones: 2, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9210, clase: 'servicio', claseLabel: 'Servicio',
      tipo: 'balanza', tipoLabel: 'Balanza',
      subtipo: 'balanza_precision', subtipoLabel: 'Balanza de Precisión',
      descripcion: 'Servicio de calibración de balanza de precisión con emisión de certificado',
      marca: 'total_weight', modelo: 'tw_m1',
      ctaContable: '7059001', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Servicio Balanza Balanza de Precisión Marca TOTAL WEIGHT',
      descripcionManual: 'Servicio de calibración con trazabilidad al SI, incluye 5 puntos de medida y emisión de certificado de calibración acreditado.',
      rangoOperativo: [], unidad: 'servicio', cuenta: '701-01', stock: 0,
      codigoUnspsc: '81141802', precioMinReferencia: 380,
      escalas: [
        { nivel: 'estandar',         precio: 450 },
        { nivel: 'volumen',          precio: 400 },
        { nivel: 'corporativo_alto', precio: 380 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: false, aplicaLaboratorioMetrologia: true,
      procedimientosAsociados: [
        { codigo: 'PC-MT-01', nombre: 'Calibración de peso patrón con comparador' },
      ],
      usuarioRegistro: 'María Torres', fechaRegistro: '2025-08-25T09:00:00Z',
      fechaModificacion: '2026-09-01T10:00:00Z', totalEdiciones: 3, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9220, clase: 'equipo', claseLabel: 'Equipo',
      tipo: 'balanza', tipoLabel: 'Balanza',
      subtipo: 'balanza_precision', subtipoLabel: 'Balanza de Precisión',
      descripcion: 'Báscula Camionera 80t Estructura de Acero Modular con 8 Celdas',
      marca: 'total_weight', modelo: 'tw_m1',
      ctaContable: '3352001', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Inactivo', esActivoEnCatalogo: false, usarEnPropuestas: false,
      descripcionAuto: 'Equipo Balanza Balanza de Precisión Marca TOTAL WEIGHT',
      descripcionManual: 'Báscula camionera modular fabricada en acero estructural A36, plataforma 18m x 3m, capacidad 80t con 8 celdas de carga digitales POWERCELL.',
      rangoOperativo: ['0 a 80 t', '18 x 3 m'], unidad: 'unidad', cuenta: '335-01', stock: 1,
      codigoUnspsc: '41111702', precioMinReferencia: 42000,
      escalas: [
        { nivel: 'estandar',         precio: 48000 },
        { nivel: 'volumen',          precio: 45000 },
        { nivel: 'corporativo_alto', precio: 42000 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: false,
      procedimientosAsociados: [
        { codigo: 'PC-MT-02', nombre: 'Verificación técnica de báscula de camión' },
      ],
      usuarioRegistro: 'Luis Vargas', fechaRegistro: '2025-09-01T09:00:00Z',
      fechaModificacion: '2026-08-01T09:00:00Z', totalEdiciones: 6, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9230, clase: 'insumo', claseLabel: 'Insumo',
      tipo: 'celda_carga', tipoLabel: 'Celda de Carga',
      subtipo: 'celda_50t', subtipoLabel: 'Celda 50T Canister',
      descripcion: 'Celda de carga single-point aleación aluminio 300 kg IP65',
      marca: 'ad', modelo: 'pdx50',
      ctaContable: '7811110', procedencia: 'importado_china', procedenciaLabel: 'Importado China',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: true,
      descripcionAuto: 'Insumo Celda de Carga Celda 50T Canister Marca A&D',
      descripcionManual: 'Celda single-point aleación aluminio 300 kg IP65, uso en balanzas comerciales y de precisión industrial ligera.',
      rangoOperativo: ['0 a 300 kg'], unidad: 'unidad', cuenta: '635-09', stock: 22,
      codigoUnspsc: '41113611', precioMinReferencia: 55,
      escalas: [
        { nivel: 'estandar',         precio: 75 },
        { nivel: 'volumen',          precio: 62 },
        { nivel: 'corporativo_alto', precio: 55 },
      ],
      aplicaComercial: true, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: false,
      procedimientosAsociados: [],
      usuarioRegistro: 'Ana Torres', fechaRegistro: '2025-09-15T09:00:00Z',
      fechaModificacion: '2026-09-15T09:00:00Z', totalEdiciones: 1, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
    {
      idSuministro: 9240, clase: 'consumible', claseLabel: 'Consumible',
      tipo: 'cable', tipoLabel: 'Cable',
      subtipo: 'cable_blindado', subtipoLabel: 'Cable Blindado',
      descripcion: 'Precinto de seguridad plástico numerado para sellos metrológicos (100 unidades)',
      marca: 'total_weight', modelo: 'tw_m1',
      ctaContable: '7811109', procedencia: 'nacional', procedenciaLabel: 'Nacional',
      estado: 'Activo', esActivoEnCatalogo: true, usarEnPropuestas: false,
      descripcionAuto: 'Consumible Cable Cable Blindado Marca TOTAL WEIGHT',
      descripcionManual: 'Precinto de seguridad plástico numerado y personalizado, uso en sellos metrológicos y validaciones, paquete de 100 unidades.',
      rangoOperativo: [], unidad: 'unidad', cuenta: '635-10', stock: 850,
      codigoUnspsc: '46171610', precioMinReferencia: 0.7,
      escalas: [
        { nivel: 'estandar',         precio: 1 },
        { nivel: 'volumen',          precio: 0.85 },
        { nivel: 'corporativo_alto', precio: 0.7 },
      ],
      aplicaComercial: false, aplicaServicioTecnico: true, aplicaLaboratorioMetrologia: true,
      procedimientosAsociados: [],
      usuarioRegistro: 'María Torres', fechaRegistro: '2025-10-01T09:00:00Z',
      fechaModificacion: '2026-08-01T09:00:00Z', totalEdiciones: 1, firmaDigital: 'SHA-256 · verificado',
      urlFoto: '', urlManualPdf: '',
    },
  ];

  private static nextId = 9250;

  private async mockObtener(
    busqueda?: string,
    clase?: string,
    tipo?: string,
    estado?: string,
    soloEnPropuestas = false,
    pagina = 1,
    porPagina = 10,
  ): Promise<SuministrosPaginado> {
    await this.mockDelay();
    let filtered = [...SuministrosService.mockData];

    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(s =>
        String(s.idSuministro).includes(q) ||
        s.descripcion.toLowerCase().includes(q) ||
        s.tipoLabel.toLowerCase().includes(q) ||
        s.subtipoLabel.toLowerCase().includes(q) ||
        this.labelDeCatalogo(this.obtenerMarcas(),  s.marca).toLowerCase().includes(q) ||
        this.labelDeCatalogo(this.obtenerModelos(), s.modelo).toLowerCase().includes(q) ||
        s.ctaContable.toLowerCase().includes(q)
      );
    }
    if (clase)  filtered = filtered.filter(s => s.clase  === clase);
    if (tipo)   filtered = filtered.filter(s => s.tipo   === tipo);
    if (estado) filtered = filtered.filter(s => s.estado === estado);
    if (soloEnPropuestas) filtered = filtered.filter(s => s.usarEnPropuestas);

    const total  = filtered.length;
    const inicio = (pagina - 1) * porPagina;
    const items  = filtered.slice(inicio, inicio + porPagina);
    return { items, total, pagina, porPagina };
  }

  private async mockObtenerPorId(id: number): Promise<SuministroDetalle> {
    await this.mockDelay();
    const found = SuministrosService.mockData.find(s => s.idSuministro === id);
    if (!found) throw new Error('Suministro no encontrado.');
    return { ...found };
  }

  private async mockGuardar(dto: GuardarSuministroRequest): Promise<number> {
    await this.mockDelay();

    if (dto.idSuministro === 0) {
      const nuevoId = SuministrosService.nextId++;
      SuministrosService.mockData.push({
        idSuministro:       nuevoId,
        clase:              dto.clase,
        claseLabel:         this.labelDeCatalogo(CLASES_SUMINISTRO,       dto.clase),
        tipo:               dto.tipo,
        tipoLabel:          this.labelDeCatalogo(TIPOS_SUMINISTRO,        dto.tipo),
        subtipo:            dto.subtipo,
        subtipoLabel:       this.labelDeCatalogo(SUBTIPOS_SUMINISTRO,     dto.subtipo),
        descripcion:        dto.descripcionManual || dto.descripcionAuto,
        marca:              dto.marca,
        modelo:             dto.modelo,
        ctaContable:        dto.ctaContable,
        procedencia:        dto.procedencia,
        procedenciaLabel:   this.labelDeCatalogo(PROCEDENCIAS_SUMINISTRO, dto.procedencia),
        estado:             dto.guardarComoBorrador ? 'Borrador' : (dto.esActivoEnCatalogo ? 'Activo' : 'Inactivo'),
        esActivoEnCatalogo: dto.esActivoEnCatalogo,
        usarEnPropuestas:   dto.usarEnPropuestas,
        descripcionAuto:    dto.descripcionAuto,
        descripcionManual:  dto.descripcionManual,
        rangoOperativo:     dto.rangoOperativo,
        unidad:             dto.unidad,
        cuenta:             dto.cuenta,
        stock:              dto.stock,
        codigoUnspsc:       dto.codigoUnspsc,
        precioMinReferencia: dto.precioMinReferencia,
        escalas:             dto.escalas,
        aplicaComercial:             dto.aplicaComercial,
        aplicaServicioTecnico:       dto.aplicaServicioTecnico,
        aplicaLaboratorioMetrologia: dto.aplicaLaboratorioMetrologia,
        procedimientosAsociados: [],
        usuarioRegistro:   'Admin TW',
        fechaRegistro:     new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        totalEdiciones:    1,
        firmaDigital:      'SHA-256 · verificado',
        urlFoto:           '',
        urlManualPdf:      '',
      });
      return nuevoId;
    }

    const existing = SuministrosService.mockData.find(s => s.idSuministro === dto.idSuministro);
    if (!existing) throw new Error('Suministro no encontrado.');
    Object.assign(existing, {
      clase:              dto.clase,
      claseLabel:         this.labelDeCatalogo(CLASES_SUMINISTRO,       dto.clase),
      tipo:               dto.tipo,
      tipoLabel:          this.labelDeCatalogo(TIPOS_SUMINISTRO,        dto.tipo),
      subtipo:            dto.subtipo,
      subtipoLabel:       this.labelDeCatalogo(SUBTIPOS_SUMINISTRO,     dto.subtipo),
      descripcion:        dto.descripcionManual || dto.descripcionAuto,
      marca:              dto.marca,
      modelo:             dto.modelo,
      ctaContable:        dto.ctaContable,
      procedencia:        dto.procedencia,
      procedenciaLabel:   this.labelDeCatalogo(PROCEDENCIAS_SUMINISTRO, dto.procedencia),
      esActivoEnCatalogo: dto.esActivoEnCatalogo,
      usarEnPropuestas:   dto.usarEnPropuestas,
      descripcionAuto:    dto.descripcionAuto,
      descripcionManual:  dto.descripcionManual,
      rangoOperativo:     dto.rangoOperativo,
      unidad:             dto.unidad,
      cuenta:             dto.cuenta,
      stock:              dto.stock,
      codigoUnspsc:       dto.codigoUnspsc,
      precioMinReferencia: dto.precioMinReferencia,
      escalas:             dto.escalas,
      aplicaComercial:             dto.aplicaComercial,
      aplicaServicioTecnico:       dto.aplicaServicioTecnico,
      aplicaLaboratorioMetrologia: dto.aplicaLaboratorioMetrologia,
      fechaModificacion:  new Date().toISOString(),
      totalEdiciones:     existing.totalEdiciones + 1,
    });
    return dto.idSuministro;
  }

  private async mockCambiarEstado(dto: CambiarEstadoSuministroRequest): Promise<void> {
    await this.mockDelay();
    const existing = SuministrosService.mockData.find(s => s.idSuministro === dto.idSuministro);
    if (!existing) throw new Error('Suministro no encontrado.');
    existing.estado = dto.estado;
    existing.esActivoEnCatalogo = dto.estado === 'Activo';
  }

  private mockDelay(ms = 220): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
